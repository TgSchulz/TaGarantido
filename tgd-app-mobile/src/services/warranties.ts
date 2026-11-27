import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import type { Warranty } from '../types/warranty';
import { validateWarrantyXml } from './invoiceXml';

const MAX_XML_BYTES = 10 * 1024 * 1024;

let database: Promise<SQLite.SQLiteDatabase> | undefined;

export class DuplicateInvoiceError extends Error {
  constructor(
    public readonly invoiceNumber: string,
    public readonly valueUpdated = false,
  ) {
    super(`A nota fiscal nº ${invoiceNumber} já está cadastrada.`);
    this.name = 'DuplicateInvoiceError';
  }
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const opening = database ??= (async () => {
    const db = await SQLite.openDatabaseAsync('tagarantido.db');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS warranties (
        id TEXT PRIMARY KEY NOT NULL,
        product_name TEXT NOT NULL,
        purchase_date TEXT,
        invoice_number TEXT,
        invoice_total_cents INTEGER,
        seller_name TEXT,
        warranty_months INTEGER NOT NULL,
        expires_at TEXT,
        source TEXT NOT NULL DEFAULT 'xml',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS imported_invoices (
        invoice_number TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invoice_registry (
        invoice_key TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notification_reads (
        notification_id TEXT PRIMARY KEY NOT NULL,
        read_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO imported_invoices (invoice_number, created_at)
      SELECT TRIM(invoice_number), MIN(created_at)
      FROM warranties
      WHERE invoice_number IS NOT NULL AND TRIM(invoice_number) <> ''
      GROUP BY TRIM(invoice_number);
    `);
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(warranties)');
    if (!columns.some((column) => column.name === 'invoice_total_cents')) {
      await db.execAsync('ALTER TABLE warranties ADD COLUMN invoice_total_cents INTEGER;');
    }
    if (!columns.some((column) => column.name === 'invoice_key')) {
      await db.execAsync('ALTER TABLE warranties ADD COLUMN invoice_key TEXT;');
    }
    await db.execAsync(`
      UPDATE warranties
      SET invoice_key = 'legacy:' || LOWER(TRIM(COALESCE(seller_name, ''))) || ':' || TRIM(invoice_number) || ':' || COALESCE(purchase_date, '')
      WHERE invoice_key IS NULL AND invoice_number IS NOT NULL AND TRIM(invoice_number) <> '';
      INSERT OR IGNORE INTO invoice_registry (invoice_key, created_at)
      SELECT invoice_key, MIN(created_at)
      FROM warranties
      WHERE invoice_key IS NOT NULL
      GROUP BY invoice_key;
    `);
    return db;
  })();
  try {
    return await opening;
  } catch (error) {
    if (database === opening) database = undefined;
    throw error;
  }
}

function warrantyMonthsBetween(start: string, end: string): number {
  return Math.max(0,
    (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12
    + Number(end.slice(5, 7)) - Number(start.slice(5, 7)),
  );
}

function isIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === value;
}

export async function getWarranties(): Promise<Warranty[]> {
  const db = await getDatabase();
  return db.getAllAsync<Warranty>('SELECT * FROM warranties ORDER BY created_at DESC');
}

export async function getReadNotificationIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ notification_id: string }>('SELECT notification_id FROM notification_reads');
  return rows.map((row) => row.notification_id);
}

export async function setNotificationRead(notificationId: string, isRead: boolean): Promise<void> {
  const db = await getDatabase();
  if (isRead) {
    await db.runAsync(
      'INSERT OR IGNORE INTO notification_reads (notification_id, read_at) VALUES (?, ?)',
      notificationId,
      new Date().toISOString(),
    );
  } else {
    await db.runAsync('DELETE FROM notification_reads WHERE notification_id = ?', notificationId);
  }
}

export async function deleteWarranty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('PRAGMA secure_delete = ON;');
    const warranty = await transaction.getFirstAsync<Pick<Warranty, 'invoice_number' | 'invoice_key'>>(
      'SELECT invoice_number, invoice_key FROM warranties WHERE id = ?',
      id,
    );
    if (!warranty) throw new Error('A garantia não foi encontrada no armazenamento local.');

    await transaction.runAsync('DELETE FROM warranties WHERE id = ?', id);
    await transaction.runAsync('DELETE FROM notification_reads WHERE notification_id LIKE ?', `${id}:%`);
    const invoiceNumber = warranty.invoice_number?.trim();
    if (!invoiceNumber) return;

    const remaining = await transaction.getFirstAsync<{ id: string }>(
      'SELECT id FROM warranties WHERE invoice_key = ? LIMIT 1',
      warranty.invoice_key,
    );
    if (!remaining) {
      if (warranty.invoice_key) {
        await transaction.runAsync('DELETE FROM invoice_registry WHERE invoice_key = ?', warranty.invoice_key);
      }
      await transaction.runAsync('DELETE FROM imported_invoices WHERE invoice_number = ?', invoiceNumber);
    }
  });
}

export async function saveWarrantyExpiry(id: string, expiresAt: string): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('PRAGMA secure_delete = ON;');
    const warranty = await transaction.getFirstAsync<Pick<Warranty, 'purchase_date'>>(
      'SELECT purchase_date FROM warranties WHERE id = ?',
      id,
    );
    if (!warranty) throw new Error('Garantia não encontrada no armazenamento local.');
    if (!isIsoDate(expiresAt)) throw new Error('Escolha uma data final válida.');
    if (!warranty.purchase_date) {
      throw new Error('A data de compra não foi encontrada no XML; não é possível salvar o prazo da garantia.');
    }
    if (expiresAt < warranty.purchase_date) {
      throw new Error('A data final da garantia não pode ser anterior à data da compra.');
    }

    await transaction.runAsync(
      'UPDATE warranties SET expires_at = ?, warranty_months = ? WHERE id = ?',
      expiresAt,
      warrantyMonthsBetween(warranty.purchase_date, expiresAt),
      id,
    );
  });
}

export async function importInvoiceXml(file: { uri: string; name: string; size?: number }): Promise<Warranty[]> {
  if (!file.name.toLocaleLowerCase('en-US').endsWith('.xml')) {
    throw new Error('Selecione um arquivo com extensão .xml.');
  }

  if (file.size !== undefined && file.size > MAX_XML_BYTES) {
    throw new Error('O arquivo XML é muito grande para importar (limite de 10 MB).');
  }

  let xml: string;
  try {
    xml = await new File(file.uri).text();
  } catch {
    throw new Error('Não foi possível acessar o arquivo selecionado. Tente escolhê-lo novamente pelo app Arquivos do aparelho.');
  }

  const items = validateWarrantyXml(xml);
  const createdAt = new Date().toISOString();
  const warranties: Warranty[] = items.map((item, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    ...item,
    warranty_months: item.expires_at
      ? warrantyMonthsBetween(item.purchase_date, item.expires_at)
      : 0,
    source: 'xml',
    created_at: createdAt,
  }));

  const db = await getDatabase();
  const invoiceNumber = items[0]?.invoice_number?.trim() || null;
  const invoiceKey = items[0]?.invoice_key ?? null;
  let duplicateInvoice = false;
  let valueUpdated = false;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (invoiceKey) {
      let existing = await transaction.getFirstAsync<{ invoice_key: string }>(
        'SELECT invoice_key FROM invoice_registry WHERE invoice_key = ?',
        invoiceKey,
      );
      let legacyKey: string | null = null;
      if (!existing && invoiceNumber) {
        const legacy = await transaction.getFirstAsync<{ invoice_key: string }>(
          `SELECT invoice_key FROM warranties
           WHERE TRIM(COALESCE(invoice_number, '')) = ?
             AND LOWER(TRIM(COALESCE(seller_name, ''))) = LOWER(TRIM(COALESCE(?, '')))
             AND COALESCE(purchase_date, '') = COALESCE(?, '')
             AND invoice_key LIKE 'legacy:%'
           LIMIT 1`,
          invoiceNumber,
          items[0]?.seller_name ?? null,
          items[0]?.purchase_date ?? null,
        );
        if (legacy) {
          existing = legacy;
          legacyKey = legacy.invoice_key;
        }
      }
      if (existing) {
        duplicateInvoice = true;
        if (legacyKey && legacyKey !== invoiceKey) {
          await transaction.runAsync(
            `UPDATE warranties SET invoice_key = ?
             WHERE invoice_key = ? AND TRIM(COALESCE(invoice_number, '')) = ?`,
            invoiceKey,
            legacyKey,
            invoiceNumber,
          );
          await transaction.runAsync('DELETE FROM invoice_registry WHERE invoice_key = ?', legacyKey);
          await transaction.runAsync(
            'INSERT OR IGNORE INTO invoice_registry (invoice_key, created_at) VALUES (?, ?)',
            invoiceKey,
            createdAt,
          );
        }
        const invoiceTotalCents = items[0]?.invoice_total_cents ?? null;
        if (invoiceTotalCents !== null) {
          const updated = await transaction.runAsync(
            'UPDATE warranties SET invoice_total_cents = ? WHERE invoice_key = ?',
            invoiceTotalCents,
            invoiceKey,
          );
          valueUpdated = updated.changes > 0;
        }
        return;
      }
      await transaction.runAsync(
        'INSERT INTO invoice_registry (invoice_key, created_at) VALUES (?, ?)',
        invoiceKey,
        createdAt,
      );
    }

    for (const warranty of warranties) {
      await transaction.runAsync(
        `INSERT INTO warranties (id, product_name, purchase_date, invoice_number, invoice_key, invoice_total_cents, seller_name, warranty_months, expires_at, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        warranty.id,
        warranty.product_name,
        warranty.purchase_date,
        warranty.invoice_number,
        warranty.invoice_key,
        warranty.invoice_total_cents,
        warranty.seller_name,
        warranty.warranty_months,
        warranty.expires_at,
        warranty.source,
        warranty.created_at,
      );
    }
  });
  if (duplicateInvoice && invoiceNumber) {
    throw new DuplicateInvoiceError(invoiceNumber, valueUpdated);
  }
  return warranties;
}

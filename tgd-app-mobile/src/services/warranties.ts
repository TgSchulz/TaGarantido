import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import type { Warranty } from '../types/warranty';
import { validateWarrantyXml } from './invoiceXml';

const MAX_XML_BYTES = 10 * 1024 * 1024;

let database: Promise<SQLite.SQLiteDatabase> | undefined;

export class DuplicateInvoiceError extends Error {
  constructor(public readonly invoiceNumber: string) {
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
      INSERT OR IGNORE INTO imported_invoices (invoice_number, created_at)
      SELECT TRIM(invoice_number), MIN(created_at)
      FROM warranties
      WHERE invoice_number IS NOT NULL AND TRIM(invoice_number) <> ''
      GROUP BY TRIM(invoice_number);
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

export async function deleteWarranty(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('PRAGMA secure_delete = ON;');
    const warranty = await transaction.getFirstAsync<Pick<Warranty, 'invoice_number'>>(
      'SELECT invoice_number FROM warranties WHERE id = ?',
      id,
    );
    if (!warranty) throw new Error('A garantia não foi encontrada no armazenamento local.');

    await transaction.runAsync('DELETE FROM warranties WHERE id = ?', id);
    const invoiceNumber = warranty.invoice_number?.trim();
    if (!invoiceNumber) return;

    const remaining = await transaction.getFirstAsync<{ id: string }>(
      'SELECT id FROM warranties WHERE TRIM(invoice_number) = ? LIMIT 1',
      invoiceNumber,
    );
    if (!remaining) {
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
  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (invoiceNumber) {
      const existing = await transaction.getFirstAsync<{ invoice_number: string }>(
        'SELECT invoice_number FROM imported_invoices WHERE invoice_number = ?',
        invoiceNumber,
      );
      if (existing) throw new DuplicateInvoiceError(invoiceNumber);
      await transaction.runAsync(
        'INSERT INTO imported_invoices (invoice_number, created_at) VALUES (?, ?)',
        invoiceNumber,
        createdAt,
      );
    }

    for (const warranty of warranties) {
      await transaction.runAsync(
        `INSERT INTO warranties (id, product_name, purchase_date, invoice_number, seller_name, warranty_months, expires_at, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        warranty.id,
        warranty.product_name,
        warranty.purchase_date,
        warranty.invoice_number,
        warranty.seller_name,
        warranty.warranty_months,
        warranty.expires_at,
        warranty.source,
        warranty.created_at,
      );
    }
  });
  return warranties;
}

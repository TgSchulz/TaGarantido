import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type InvoiceItem = {
  product_name: string;
  purchase_date: string;
  invoice_number: string | null;
  invoice_key: string | null;
  invoice_total_cents: number | null;
  seller_name: string | null;
  expires_at: string | null;
};

const MAX_XML_LENGTH = 10_000_000;
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  textNodeName: '#text',
  maxNestedTags: 100,
});

type XmlNode = Record<string, unknown>;

function entries(value: unknown): XmlNode[] {
  if (Array.isArray(value)) return value.flatMap(entries);
  return value !== null && typeof value === 'object' ? [value as XmlNode] : [];
}

function nameOf(key: string): string {
  return key.split(':').pop()?.toLocaleLowerCase('en-US') ?? key.toLocaleLowerCase('en-US');
}

function descendants(value: unknown, wantedName: string): XmlNode[] {
  const matches: XmlNode[] = [];
  const target = wantedName.toLocaleLowerCase('en-US');
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node as XmlNode)) {
      if (nameOf(key) === target) {
        const found = entries(child);
        matches.push(...(found.length ? found : [{ '#text': child }]));
      }
      visit(child);
    }
  };
  visit(value);
  return matches;
}

function firstText(value: unknown, wantedName: string): string | null {
  const match = descendants(value, wantedName)[0];
  const raw = match?.['#text'] ?? match;
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  return String(raw).trim() || null;
}

function firstMoneyValue(value: unknown, wantedName: string): number | null {
  const raw = firstText(value, wantedName);
  if (!raw || !/^\d+(?:[.,]\d{1,10})?$/.test(raw)) return null;
  const amount = Number(raw.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function moneyCents(value: number): number | null {
  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function totalProductValueCents(details: XmlNode[]): number | null {
  if (!details.length) return null;
  let total = 0;
  for (const detail of details) {
    if (firstText(detail, 'indTot') === '0') continue;
    const productValue = firstMoneyValue(detail, 'vProd');
    if (productValue !== null) {
      total += Math.round(productValue * 100);
      continue;
    }
    const unitValue = firstMoneyValue(detail, 'vUnCom');
    const quantity = firstText(detail, 'qCom');
    if (unitValue === null || !quantity || !/^\d+(?:[.,]\d+)?$/.test(quantity)) return null;
    total += Math.round(unitValue * Number(quantity.replace(',', '.')) * 100);
  }
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join(' ');
  if (value !== null && typeof value === 'object') {
    return Object.values(value as XmlNode).map(textContent).join(' ');
  }
  return '';
}

function validDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)?.slice(1).reverse();
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === `${year}-${month}-${day}`
    ? `${year}-${month}-${day}`
    : null;
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetMonth = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function warrantyEndDate(text: string, purchaseDate: string | null): string | null {
  const keyword = /garantia|warranty|validade/i;
  const explicitDates: string[] = [];
  for (const match of text.matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g)) {
    const start = Math.max(0, (match.index ?? 0) - 100);
    const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 60);
    const date = validDate(match[0]);
    if (keyword.test(text.slice(start, end)) && date && (!purchaseDate || date >= purchaseDate)) {
      explicitDates.push(date);
    }
  }
  if (explicitDates.length) return explicitDates.sort().at(-1) ?? null;
  if (!purchaseDate) return null;

  const durationPattern = /\b(\d{1,3})\s*(m[eê]s(?:es)?|anos?|dias?)\b/gi;
  const expiryDates = [...text.matchAll(durationPattern)].flatMap((match) => {
    const index = match.index ?? 0;
    const start = Math.max(0, index - 70);
    const end = Math.min(text.length, index + match[0].length + 50);
    if (!keyword.test(text.slice(start, end))) return [];

    const amount = Number(match[1]);
    const unit = match[2].toLocaleLowerCase('pt-BR');
    if (unit.startsWith('dia')) return [addDays(purchaseDate, amount)];
    return [addMonths(purchaseDate, unit.startsWith('ano') ? amount * 12 : amount)];
  });
  return expiryDates.sort().at(-1) ?? null;
}

function cleanServiceName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .split('|')[0]
    .replace(/,?\s+REALIZAD[AO]\s+NO\s+DIA\b.*$/i, '')
    .replace(/^NF\s+REFERENTE\s+A\s+/i, '')
    .trim()
    .replace(/^[ ,.]+|[ ,.]+$/g, '');
}

function servicePurchaseDate(description: string | null, invoiceDate: string | null): string | null {
  const serviceDate = description?.match(/\bREALIZAD[AO]\s+NO\s+DIA\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  return validDate(serviceDate) ?? invoiceDate;
}

export function validateWarrantyXml(xml: string): InvoiceItem[] {
  if (xml.length > MAX_XML_LENGTH) throw new Error('O arquivo XML é muito grande para importar.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error('O XML contém declarações de entidades que não são aceitas por segurança.');
  }
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error('O arquivo não contém um XML válido.');

  const root = parser.parse(xml) as XmlNode;
  const invoiceNumber = firstText(root, 'nNF');
  const issuer = descendants(root, 'emit')[0];
  const issuerIdentity = issuer
    ? firstText(issuer, 'CNPJ') ?? firstText(issuer, 'CPF') ?? firstText(issuer, 'xNome')
    : null;
  const invoiceModel = firstText(root, 'mod') ?? '55';
  const invoiceSeries = firstText(root, 'serie') ?? '';
  const invoiceKey = invoiceNumber && issuerIdentity
    ? `nfe:${issuerIdentity.trim().toLocaleLowerCase('pt-BR')}:${invoiceModel}:${invoiceSeries}:${invoiceNumber}`
    : null;
  const details = descendants(root, 'det');
  const invoiceAmount = firstMoneyValue(root, 'vNF');
  const invoiceTotalCents = invoiceAmount === null
    ? totalProductValueCents(details)
    : moneyCents(invoiceAmount);
  const invoiceDate = validDate(firstText(root, 'dhEmi') ?? firstText(root, 'dEmi'));
  const sellerName = firstText(root, 'xNome');
  const invoiceNotes = textContent(descendants(root, 'infCpl'));
  const items: InvoiceItem[] = [];

  for (const detail of details) {
    const productName = firstText(detail, 'xProd');
    if (!productName) continue;
    const itemNotes = textContent(descendants(detail, 'infAdProd'));
    items.push({
      product_name: productName,
      purchase_date: invoiceDate ?? '',
      invoice_number: invoiceNumber,
      invoice_key: invoiceKey,
      invoice_total_cents: invoiceTotalCents,
      seller_name: sellerName,
      expires_at: warrantyEndDate(itemNotes, invoiceDate)
        ?? warrantyEndDate(textContent(detail), invoiceDate)
        ?? warrantyEndDate(invoiceNotes, invoiceDate),
    });
  }

  if (items.length === 0 && nameOf(Object.keys(root)[0] ?? '') === 'nfse') {
    const nfseInfo = descendants(root, 'infNFSe')[0] ?? root;
    const dpsInfo = descendants(root, 'infDPS')[0];
    const nfseNumber = firstText(nfseInfo, 'nNFSe') ?? firstText(nfseInfo, 'nDPS');
    const issuer = descendants(nfseInfo, 'emit')[0] ?? (dpsInfo ? descendants(dpsInfo, 'prest')[0] : undefined);
    const nfseIssuerIdentity = issuer
      ? firstText(issuer, 'CNPJ') ?? firstText(issuer, 'CPF') ?? firstText(issuer, 'xNome')
      : null;
    const nfseKey = nfseNumber && nfseIssuerIdentity
      ? `nfse:${nfseIssuerIdentity.trim().toLocaleLowerCase('pt-BR')}:${nfseNumber}`
      : null;
    const nfseAmount = firstMoneyValue(nfseInfo, 'vNFSe') ?? firstMoneyValue(nfseInfo, 'vServ');
    const nfseTotalCents = nfseAmount === null ? null : moneyCents(nfseAmount);
    const nfseDate = validDate(
      (dpsInfo ? firstText(dpsInfo, 'dCompet') : null)
      ?? (dpsInfo ? firstText(dpsInfo, 'dhEmi') : null)
      ?? firstText(nfseInfo, 'dhProc'),
    );
    const nfseSeller = issuer ? firstText(issuer, 'xNome') : null;

    for (const service of descendants(root, 'cServ')) {
      const description = firstText(service, 'xDescServ');
      const productName = description ? cleanServiceName(description).slice(0, 300) : '';
      if (!productName) continue;
      const purchaseDate = servicePurchaseDate(description, nfseDate);
      items.push({
        product_name: productName,
        purchase_date: purchaseDate ?? '',
        invoice_number: nfseNumber,
        invoice_key: nfseKey,
        invoice_total_cents: nfseTotalCents,
        seller_name: nfseSeller,
        expires_at: warrantyEndDate(textContent(service), purchaseDate)
          ?? warrantyEndDate(invoiceNotes, purchaseDate),
      });
    }
  }

  if (!items.length) {
    throw new Error('O XML é válido, mas não contém itens reconhecíveis de NF-e, NFC-e ou NFS-e.');
  }
  if (items.some((item) => !item.purchase_date)) {
    throw new Error('Não encontrei a data de emissão/compra no XML. Sem ela, não é possível definir corretamente o início da garantia.');
  }
  return items;
}

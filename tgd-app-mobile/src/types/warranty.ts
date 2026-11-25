// Registro local persistido no SQLite e consumido pelos componentes do app.
export type Warranty = {
  id: string;
  product_name: string;
  purchase_date: string | null;
  invoice_number: string | null;
  invoice_key: string | null;
  invoice_total_cents: number | null;
  seller_name: string | null;
  warranty_months: number;
  expires_at: string | null;
  source: 'xml';
  created_at: string;
};

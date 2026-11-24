import { useCallback, useEffect, useState } from 'react';

import type { Warranty } from '../types/warranty';
import {
  deleteWarranty as deleteWarrantyRecord,
  getWarranties,
  importInvoiceXml,
  saveWarrantyExpiry as saveWarrantyExpiryRecord,
} from '../services/warranties';

type XmlDocument = { uri: string; name: string; size?: number };

export function useWarranties() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (pullToRefresh = false) => {
    setLoadError(null);
    pullToRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setWarranties(await getWarranties());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível ler os dados locais.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const importXml = useCallback(async (file: XmlDocument) => {
    const imported = await importInvoiceXml(file);
    setWarranties((current) => [...imported, ...current]);
    return imported;
  }, []);

  const setExpiry = useCallback(async (id: string, date: string) => {
    await saveWarrantyExpiryRecord(id, date);
    setWarranties((current) => current.map((warranty) => (
      warranty.id === id ? { ...warranty, expires_at: date } : warranty
    )));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteWarrantyRecord(id);
    setWarranties((current) => current.filter((warranty) => warranty.id !== id));
  }, []);

  return { warranties, loading, refreshing, loadError, refresh, importXml, setExpiry, remove };
}

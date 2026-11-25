import { useMemo } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWarranties } from '../hooks/useWarranties';
import { colors } from '../theme/colors';
import type { Warranty } from '../types/warranty';

type DashboardScreenProps = {
  onBack: () => void;
};

type InvoiceSummary = { totalCents: number | null };

function summarizeInvoices(warranties: Warranty[]): InvoiceSummary[] {
  const invoices = new Map<string, InvoiceSummary>();
  for (const warranty of warranties) {
    const invoiceNumber = warranty.invoice_number?.trim();
    // A identidade fiscal distingue notas com o mesmo número emitidas por empresas diferentes.
    const key = warranty.invoice_key?.trim()
      || (invoiceNumber
        ? `legacy:${(warranty.seller_name ?? '').trim().toLocaleLowerCase('pt-BR')}:${invoiceNumber}:${warranty.purchase_date ?? ''}`
        : `import:${warranty.seller_name ?? ''}:${warranty.purchase_date ?? ''}:${warranty.created_at}`);
    const current = invoices.get(key);
    if (!current) {
      invoices.set(key, { totalCents: warranty.invoice_total_cents });
    } else if (current.totalCents === null && warranty.invoice_total_cents !== null) {
      current.totalCents = warranty.invoice_total_cents;
    }
  }
  return [...invoices.values()];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function DashboardScreen({ onBack }: DashboardScreenProps) {
  const { warranties, loading, loadError, refresh } = useWarranties();
  const metrics = useMemo(() => {
    const invoices = summarizeInvoices(warranties);
    const knownInvoices = invoices.filter((invoice) => invoice.totalCents !== null);
    const totalCents = knownInvoices.reduce((sum, invoice) => sum + (invoice.totalCents ?? 0), 0);
    return {
      invoiceCount: invoices.length,
      knownInvoiceCount: knownInvoices.length,
      totalCents,
      warrantiesCount: warranties.length,
    };
  }, [warranties]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para seus produtos"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹  Voltar aos produtos</Text>
        </Pressable>
        <Text style={styles.eyebrow}>RESUMO GERAL</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Veja o valor das notas fiscais dos produtos cadastrados.</Text>

        {loadError ? (
          <View style={styles.errorCard} accessibilityLiveRegion="polite">
            <Text style={styles.errorTitle}>Não foi possível carregar o Dashboard</Text>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.primaryCard}>
              <Text style={styles.cardLabel}>VALOR TOTAL DAS NOTAS</Text>
              <Text style={styles.total}>{loading ? 'Carregando...' : formatCurrency(metrics.totalCents)}</Text>
              <Text style={styles.cardHint}>
                {loading ? 'Buscando os dados salvos neste aparelho' : `${metrics.knownInvoiceCount} de ${metrics.invoiceCount} notas com valor identificado`}
              </Text>
            </View>

            <View style={styles.secondaryCard}>
              <View style={styles.numberBadge}><Text style={styles.number}>{loading ? '—' : metrics.warrantiesCount}</Text></View>
              <View style={styles.metricCopy}>
                <Text style={styles.metricTitle}>Garantias cadastradas</Text>
                <Text style={styles.metricHint}>Produtos protegidos registrados no app</Text>
              </View>
            </View>

            {!loading && metrics.knownInvoiceCount < metrics.invoiceCount ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  {metrics.invoiceCount - metrics.knownInvoiceCount} {metrics.invoiceCount - metrics.knownInvoiceCount === 1 ? 'nota está sem valor.' : 'notas estão sem valor.'}
                  {' '}Importe novamente o mesmo XML para atualizar o valor sem duplicar os produtos.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 12, marginBottom: 24 },
  backText: { color: colors.green, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  title: { color: colors.ink, fontWeight: '800', fontSize: 30, marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 24 },
  primaryCard: { backgroundColor: colors.ink, borderRadius: 22, padding: 22, marginBottom: 14 },
  cardLabel: { color: colors.paleGreenAccent, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  total: { color: colors.white, fontWeight: '800', fontSize: 32, marginTop: 11 },
  cardHint: { color: colors.paleGreenText, fontSize: 12, marginTop: 9 },
  secondaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 17 },
  numberBadge: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  number: { color: colors.green, fontSize: 21, fontWeight: '800' },
  metricCopy: { flex: 1, marginLeft: 14 },
  metricTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  metricHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  notice: { backgroundColor: colors.paleOrange, borderRadius: 12, padding: 14, marginTop: 14 },
  noticeText: { color: colors.orange, fontSize: 12, lineHeight: 18 },
  errorCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.orangeBorder, borderRadius: 18, padding: 20 },
  errorTitle: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  errorText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  retryButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, marginTop: 12, borderRadius: 12, backgroundColor: colors.paleGreen },
  retryText: { color: colors.green, fontWeight: '700', fontSize: 13 },
  pressed: { opacity: 0.75 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type DuplicateInvoiceCardProps = {
  invoiceNumber: string;
  valueUpdated: boolean;
  onDismiss: () => void;
};

export function DuplicateInvoiceCard({ invoiceNumber, valueUpdated, onDismiss }: DuplicateInvoiceCardProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.card}>
      <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{valueUpdated ? 'Valor da nota atualizado' : 'Nota fiscal já cadastrada'}</Text>
        <Text style={styles.description}>
          {valueUpdated
            ? `O valor da nota nº ${invoiceNumber} foi corrigido. O total já pode ser consultado no Dashboard.`
            : `A nota nº ${invoiceNumber} já está no seu celular. Nenhum produto foi adicionado.`}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar aviso de nota duplicada"
        hitSlop={8}
        onPress={onDismiss}
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.paleOrange,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.orangeBorder,
  },
  icon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '700', flexWrap: 'wrap' },
  description: { color: colors.ink, opacity: 0.82, fontSize: 12, lineHeight: 17, marginTop: 4, flexWrap: 'wrap' },
  dismiss: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: colors.muted, fontSize: 20, lineHeight: 22, fontWeight: '600' },
});

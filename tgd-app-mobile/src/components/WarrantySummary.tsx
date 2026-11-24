import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type WarrantySummaryProps = {
  // Recebe apenas a contagem necessária, em vez de acoplar o resumo à lista inteira.
  count: number;
};

// Resumo derivado da quantidade atual de garantias.
export function WarrantySummary({ count }: WarrantySummaryProps) {
  return (
    <View style={styles.summary}>
      <View>
        <Text style={styles.label}>MINHAS GARANTIAS</Text>
        <Text style={styles.count}>{count}<Text style={styles.unit}> itens protegidos</Text></Text>
      </View>
      <Text style={styles.icon}>⌂</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.ink, borderRadius: 22, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  label: { color: colors.paleGreenAccent, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  count: { color: colors.white, fontWeight: '700', fontSize: 25, marginTop: 7 },
  unit: { color: colors.paleGreenText, fontSize: 13, fontWeight: '400' },
  icon: { color: colors.paleGreenIcon, fontSize: 30, marginRight: 4 },
});

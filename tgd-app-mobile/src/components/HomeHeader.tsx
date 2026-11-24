import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

// Cabeçalho visual sem estado; pode ser reutilizado por outras telas do app.
export function HomeHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>tá<Text style={styles.brandAccent}>garantido</Text><Text style={styles.brandDot}>.</Text></Text>
        <Text style={styles.greeting}>Suas compras, protegidas.</Text>
      </View>
      <View style={styles.mark}><Text style={styles.markText}>T</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1.1 },
  brandAccent: { color: colors.green, fontWeight: '500' },
  brandDot: { color: colors.orange },
  greeting: { color: colors.muted, fontSize: 13, marginTop: 3 },
  mark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.green, fontWeight: '800', fontSize: 19 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

// Cabeçalho visual sem estado; pode ser reutilizado por outras telas do app.
type HomeHeaderProps = { onDashboardPress: () => void };

export function HomeHeader({ onDashboardPress }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>tá<Text style={styles.brandAccent}>garantido</Text><Text style={styles.brandDot}>.</Text></Text>
        <Text style={styles.greeting}>Suas compras, protegidas.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir painel Dashboard"
        onPress={onDashboardPress}
        style={({ pressed }) => [styles.dashboardButton, pressed && styles.pressed]}
      >
        <Text style={styles.dashboardText}>Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1.1 },
  brandAccent: { color: colors.green, fontWeight: '500' },
  brandDot: { color: colors.orange },
  greeting: { color: colors.muted, fontSize: 13, marginTop: 3 },
  dashboardButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.paleGreen },
  dashboardText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});

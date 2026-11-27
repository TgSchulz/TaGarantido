import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

// Cabeçalho visual sem estado; pode ser reutilizado por outras telas do app.
type HomeHeaderProps = { onDashboardPress: () => void; onNotificationsPress: () => void };

function BellIcon() {
  return (
    <View style={styles.bellIcon} accessible={false}>
      <View style={styles.bellBody} />
      <View style={styles.bellBase} />
      <View style={styles.bellClapper} />
    </View>
  );
}

export function HomeHeader({ onDashboardPress, onNotificationsPress }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>tá<Text style={styles.brandAccent}>garantido</Text><Text style={styles.brandDot}>.</Text></Text>
        <Text style={styles.greeting}>Suas compras, protegidas.</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir painel Dashboard"
          onPress={onDashboardPress}
          style={({ pressed }) => [styles.dashboardButton, pressed && styles.pressed]}
        >
          <Text style={styles.dashboardText}>Dashboard</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir notificações"
          onPress={onNotificationsPress}
          style={({ pressed }) => [styles.notificationsButton, pressed && styles.pressed]}
        >
          <BellIcon />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -1.1 },
  brandAccent: { color: colors.green, fontWeight: '500' },
  brandDot: { color: colors.orange },
  greeting: { color: colors.muted, fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dashboardButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.paleGreen },
  dashboardText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  notificationsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paleGreen, justifyContent: 'center', alignItems: 'center' },
  bellIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  bellBody: { position: 'absolute', top: 3, width: 14, height: 15, borderWidth: 2, borderColor: colors.ink, borderRadius: 8, backgroundColor: colors.paleGreen, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  bellBase: { position: 'absolute', top: 16, width: 18, height: 2.5, borderRadius: 2, backgroundColor: colors.ink },
  bellClapper: { position: 'absolute', top: 19, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink },
  pressed: { opacity: 0.75 },
});

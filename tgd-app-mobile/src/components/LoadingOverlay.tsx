import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type LoadingOverlayProps = {
  // Mensagem recebida por prop permite reutilizar o overlay em operações diferentes.
  label: string;
};

// Camada temporária de feedback para operações assíncronas.
export function LoadingOverlay({ label }: LoadingOverlayProps) {
  return (
    <View accessibilityViewIsModal style={styles.overlay}>
      <ActivityIndicator accessibilityLabel={label} color={colors.white} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.loadingScrim, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.white, fontSize: 14, fontWeight: '600', marginTop: 12 },
});

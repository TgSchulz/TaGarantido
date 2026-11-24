import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type EmptyWarrantiesProps = {
  // A tela decide o que significa adicionar; o componente só dispara a ação solicitada.
  onAddPress: () => void;
};

// Estado vazio reutilizável para listas sem registros.
export function EmptyWarranties({ onAddPress }: EmptyWarrantiesProps) {
  return (
    <View style={styles.card}>
      <View style={styles.illustration}><Text style={styles.check}>✓</Text></View>
      <Text style={styles.title}>Tudo começa com uma nota</Text>
      <Text style={styles.description}>
        Adicione sua primeira garantia e deixe seus comprovantes sempre à mão.
      </Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onAddPress}>
        <Text style={styles.buttonText}>Adicionar garantia</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, borderColor: colors.line, borderWidth: 1, padding: 24, alignItems: 'center', marginTop: 5 },
  illustration: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  check: { color: colors.green, fontSize: 29, fontWeight: '600' },
  title: { color: colors.ink, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 265 },
  button: { minHeight: 44, justifyContent: 'center', marginTop: 19, backgroundColor: colors.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});

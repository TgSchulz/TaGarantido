import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type FloatingActionButtonProps = {
  // label pode ser ajustado em outros contextos e melhora o suporte a leitores de tela.
  label?: string;
  onPress: () => void;
};

export function FloatingActionButton({ label = 'Adicionar garantia', onPress }: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre as opções para adicionar uma garantia"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
    >
      <View style={styles.iconWrap}><Text style={styles.plus}>＋</Text></View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 58, width: '100%', borderRadius: 18, backgroundColor: colors.green, borderWidth: 1, borderColor: colors.greenPressed, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, elevation: 4, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  buttonPressed: { backgroundColor: colors.greenPressed, transform: [{ scale: 0.99 }] },
  iconWrap: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.whiteOverlay, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.white, fontSize: 25, fontWeight: '400', lineHeight: 28 },
  label: { flex: 1, color: colors.white, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  chevron: { color: colors.onGreen, fontSize: 27, lineHeight: 30, marginRight: 4 },
});

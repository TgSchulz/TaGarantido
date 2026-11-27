import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type InfoModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
};

export function InfoModal({ visible, title, message, onDismiss }: InfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso"
          onPress={onDismiss}
          style={styles.dismissArea}
        />
        <View accessibilityLiveRegion="polite" style={styles.card}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Entendi</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.modalScrim },
  dismissArea: { ...StyleSheet.absoluteFill },
  card: { width: '100%', maxWidth: 460, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, elevation: 12, shadowColor: colors.ink, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleGreen },
  iconText: { color: colors.green, fontSize: 21, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0, paddingTop: 1 },
  title: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '700', flexWrap: 'wrap' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, flexWrap: 'wrap' },
  button: { minHeight: 48, alignSelf: 'flex-end', minWidth: 112, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.green, marginTop: 22 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});

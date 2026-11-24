import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  pendingLabel,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPending(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      onCancel();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      setPending(false);
    }
  };

  const cancel = () => {
    if (!pending) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancel}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar confirmação"
          disabled={pending}
          onPress={cancel}
          style={styles.dismissArea}
        />
        <View accessibilityLiveRegion="polite" style={styles.card}>
          <ScrollView
            style={styles.messageArea}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>!</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>
            </View>

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={cancel}
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void confirm()}
              style={({ pressed }) => [styles.button, styles.confirmButton, pressed && styles.confirmPressed, pending && styles.disabled]}
            >
              <Text style={styles.confirmText}>{pending ? pendingLabel : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.modalScrim,
  },
  dismissArea: { ...StyleSheet.absoluteFill },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    elevation: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  messageArea: { flexShrink: 1 },
  messageContent: { paddingBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paleOrange },
  iconText: { color: colors.orange, fontSize: 22, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0, paddingTop: 1 },
  title: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '700', flexWrap: 'wrap' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, flexWrap: 'wrap' },
  errorMessage: { color: colors.orange, backgroundColor: colors.paleOrange, borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 17, marginTop: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  button: { minHeight: 48, flexGrow: 1, flexBasis: 112, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceSubtle },
  confirmButton: { backgroundColor: colors.orange },
  confirmPressed: { backgroundColor: colors.orangePressed },
  cancelText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  confirmText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.65 },
});

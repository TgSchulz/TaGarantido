import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type AddWarrantySheetProps = {
  // Props controlam a visibilidade e comunicam as escolhas de volta à tela que possui o estado.
  visible: boolean;
  onClose: () => void;
  onImportXml: () => void;
};

export function AddWarrantySheet({ visible, onClose, onImportXml }: AddWarrantySheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar opções de importação"
          style={styles.backdropDismissArea}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>NOVA GARANTIA</Text>
          <Text style={styles.title}>Importar nota fiscal</Text>
          <Text style={styles.description}>Selecione o arquivo XML da sua nota fiscal.</Text>
          <ActionOption
            icon="↥"
            title="Importar nota XML"
            description="NF-e, NFC-e ou NFS-e"
            tint={colors.paleGreen}
            onPress={onImportXml}
          />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type ActionOptionProps = {
  icon: string;
  title: string;
  description: string;
  tint: string;
  onPress: () => void;
};

function ActionOption({ icon, title, description, tint, onPress }: ActionOptionProps) {
  // Opção privada reaproveitada dentro desta folha; suas variações entram por props.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, { backgroundColor: tint }]}><Text style={styles.optionIconText}>{icon}</Text></View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Text style={styles.optionArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.modalScrim, justifyContent: 'flex-end' },
  backdropDismissArea: { ...StyleSheet.absoluteFill },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30 },
  handle: { width: 38, height: 4, backgroundColor: colors.handle, borderRadius: 3, alignSelf: 'center', marginBottom: 22 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 6 },
  description: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 18 },
  option: { minHeight: 70, backgroundColor: colors.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  optionPressed: { opacity: 0.75, borderColor: colors.green },
  optionIcon: { width: 43, height: 43, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionIconText: { fontSize: 22, color: colors.ink },
  optionCopy: { flex: 1, marginLeft: 12 },
  optionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  optionDescription: { color: colors.muted, fontSize: 12, marginTop: 4 },
  optionArrow: { color: colors.mutedIcon, fontSize: 25, marginRight: 4 },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 1 },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});

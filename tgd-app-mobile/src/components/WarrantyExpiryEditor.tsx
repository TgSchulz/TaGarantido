import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { colors } from '../theme/colors';
import { toDateKey } from '../utils/warrantyDate';

type WarrantyExpiryEditorProps = {
  warrantyId: string;
  purchaseDate: string;
  onSave: (id: string, date: string) => Promise<void>;
};

export function WarrantyExpiryEditor({ warrantyId, purchaseDate, onSave }: WarrantyExpiryEditorProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveDate = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await onSave(warrantyId, toDateKey(selectedDate));
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const openPicker = () => {
    const minimumDate = new Date(`${purchaseDate}T00:00:00`);
    const initialDate = selectedDate ?? new Date(`${purchaseDate}T12:00:00`);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        minimumDate,
        neutralButton: { label: 'Limpar' },
        onValueChange: (_event, date) => setSelectedDate(date),
        onDismiss: () => setSelectedDate(null),
        onNeutralButtonPress: () => setSelectedDate(null),
      });
    } else {
      setPickerVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Informe a data final da garantia</Text>
      <Text style={styles.description}>A data inicial é a data da compra indicada na nota fiscal.</Text>
      {Platform.OS === 'ios' && pickerVisible ? (
        <DateTimePicker
          value={selectedDate ?? new Date(`${purchaseDate}T12:00:00`)}
          mode="date"
          minimumDate={new Date(`${purchaseDate}T00:00:00`)}
          onValueChange={(_event, date) => setSelectedDate(date)}
          onDismiss={() => setPickerVisible(false)}
          style={styles.iosPicker}
        />
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={openPicker}
          style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}
        >
          <Text style={styles.chooseText}>
            {selectedDate ? selectedDate.toLocaleDateString('pt-BR') : 'Escolher data final'}
          </Text>
        </Pressable>
        {selectedDate ? (
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void saveDate()}
            style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed, saving && styles.disabled]}
          >
            <Text style={styles.saveText}>{saving ? 'Salvando...' : 'Salvar data'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surfaceSubtle, borderRadius: 13, padding: 12, marginTop: 14 },
  title: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  chooseButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.white },
  chooseText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  saveButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: colors.green },
  savePressed: { backgroundColor: colors.greenPressed },
  saveText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  iosPicker: { marginTop: 6 },
});

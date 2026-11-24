import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Warranty } from '../types/warranty';
import { colors } from '../theme/colors';
import { formatDate, protectionLabel, protectionRemaining } from '../utils/warrantyDate';
import { ConfirmActionModal } from './ConfirmActionModal';
import { WarrantyExpiryEditor } from './WarrantyExpiryEditor';

type WarrantyCardProps = {
  warranty: Warranty;
  onSaveExpiry: (id: string, date: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function WarrantyCardView({ warranty, onSaveExpiry, onDelete }: WarrantyCardProps) {
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const remaining = protectionRemaining(warranty.expires_at);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.productIcon}><Text style={styles.productIconText}>✓</Text></View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{warranty.product_name}</Text>
          <Text style={styles.seller} numberOfLines={1}>{warranty.seller_name ?? 'Loja não informada'}</Text>
        </View>
        <View style={[styles.statusDot, remaining?.expired && styles.expiredDot]} />
      </View>

      <View style={styles.divider} />
      <View style={styles.detailsRow}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>COMPRADO EM</Text>
          <Text style={styles.detailValue}>{formatDate(warranty.purchase_date)}</Text>
        </View>
        <View style={[styles.detailColumn, styles.rightDetail]}>
          <Text style={styles.detailLabel}>GARANTIA ATÉ</Text>
          <Text style={styles.detailValue}>{formatDate(warranty.expires_at)}</Text>
        </View>
      </View>

      <View style={[styles.expiryBadge, remaining?.expired && styles.expiredBadge]}>
        <Text style={[styles.expiryText, remaining?.expired && styles.expiredText]}>
          {protectionLabel(remaining)}
        </Text>
      </View>
      {warranty.invoice_number ? (
        <Text style={styles.invoiceNumber}>Nota fiscal nº {warranty.invoice_number}</Text>
      ) : null}

      {!warranty.expires_at && warranty.purchase_date ? (
        <WarrantyExpiryEditor
          warrantyId={warranty.id}
          purchaseDate={warranty.purchase_date}
          onSave={onSaveExpiry}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remover garantia de ${warranty.product_name}`}
        onPress={() => setDeleteDialogVisible(true)}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
      >
        <Text style={styles.deleteText}>Remover garantia</Text>
      </Pressable>

      <ConfirmActionModal
        visible={deleteDialogVisible}
        title="Remover garantia?"
        message={`A garantia de “${warranty.product_name}” será removida deste aparelho. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir garantia"
        pendingLabel="Excluindo..."
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={() => onDelete(warranty.id)}
      />
    </View>
  );
}

export const WarrantyCard = memo(WarrantyCardView);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  productIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  productIconText: { color: colors.green, fontSize: 19, fontWeight: '700' },
  productInfo: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  productName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  seller: { color: colors.muted, fontSize: 12, marginTop: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success, alignSelf: 'flex-start', marginTop: 5 },
  expiredDot: { backgroundColor: colors.orange },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailColumn: { flex: 1, minWidth: 0 },
  rightDetail: { alignItems: 'flex-end' },
  detailLabel: { color: colors.detailMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  detailValue: { color: colors.ink, fontSize: 12, fontWeight: '600', marginTop: 5 },
  expiryBadge: { alignSelf: 'flex-start', backgroundColor: colors.paleGreen, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 13 },
  expiryText: { color: colors.green, fontSize: 11, fontWeight: '600' },
  expiredBadge: { backgroundColor: colors.paleOrange },
  expiredText: { color: colors.orange },
  invoiceNumber: { color: colors.muted, fontSize: 11, marginTop: 10 },
  deleteButton: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', paddingHorizontal: 8, marginTop: 8 },
  deleteText: { color: colors.orange, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});

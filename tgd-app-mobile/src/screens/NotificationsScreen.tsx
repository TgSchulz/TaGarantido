import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWarranties } from '../hooks/useWarranties';
import { getActiveWarrantyReminders, type WarrantyReminder } from '../services/warrantyNotifications';
import { getReadNotificationIds, setNotificationRead } from '../services/warranties';
import { colors } from '../theme/colors';
import { formatDate } from '../utils/warrantyDate';

type NotificationsScreenProps = { onBack: () => void };
type NotificationTab = 'unread' | 'read';

function NotificationCard({
  reminder,
  isRead,
  onMarkRead,
}: {
  reminder: WarrantyReminder;
  isRead: boolean;
  onMarkRead: () => Promise<void>;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      !isRead && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
    ),
    onPanResponderMove: (_event, gesture) => translateX.setValue(Math.max(0, Math.min(gesture.dx, 170))),
    onPanResponderRelease: (_event, gesture) => {
      if (!isRead && gesture.dx >= 90) {
        Animated.timing(translateX, { toValue: 240, duration: 160, useNativeDriver: true }).start(({ finished }) => {
          if (!finished) return;
          void onMarkRead().then(
            () => translateX.setValue(0),
            () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
          );
        });
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(),
  }), [isRead, onMarkRead, translateX]);

  return (
    <View style={styles.swipeContainer}>
      {!isRead ? (
        <View style={styles.readUnderlay}>
          <Text style={styles.readUnderlayText}>Lida ✓</Text>
        </View>
      ) : null}
      <Animated.View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${reminder.displayLabel}: ${reminder.productName}`}
        accessibilityHint={isRead ? 'Notificação já lida.' : 'Arraste para a direita para marcar como lida.'}
        onAccessibilityTap={isRead ? undefined : () => void onMarkRead()}
        style={[styles.reminderCard, { transform: [{ translateX }] }]}
      >
        <View style={styles.reminderHeader}>
          <Text style={[styles.reminderLabel, reminder.kind === 'expired' && styles.expiredLabel]}>
            {reminder.displayLabel}
          </Text>
          {isRead ? <Text style={styles.readBadge}>Lida</Text> : <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.productName}>{reminder.productName}</Text>
        <Text style={styles.reminderDate}>
          {reminder.kind === 'expiration-day' || reminder.kind === 'expired' ? 'Data de vencimento: ' : 'Vencimento: '}
          {formatDate(reminder.expiresAt)}
        </Text>
      </Animated.View>
    </View>
  );
}

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { warranties, loading, loadError } = useWarranties();
  const reminders = getActiveWarrantyReminders(warranties);
  const [tab, setTab] = useState<NotificationTab>('unread');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readStateLoading, setReadStateLoading] = useState(true);
  const [readStateError, setReadStateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getReadNotificationIds().then((ids) => {
      if (mounted) setReadIds(new Set(ids));
    }).catch((error) => {
      if (mounted) setReadStateError(error instanceof Error ? error.message : 'Não foi possível carregar o estado das notificações.');
    }).finally(() => {
      if (mounted) setReadStateLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const unreadReminders = reminders.filter((reminder) => !readIds.has(reminder.id));
  const readReminders = reminders.filter((reminder) => readIds.has(reminder.id));
  const visibleReminders = tab === 'unread' ? unreadReminders : readReminders;

  const markAsRead = useCallback(async (notificationId: string) => {
    setReadStateError(null);
    try {
      await setNotificationRead(notificationId, true);
      setReadIds((current) => new Set(current).add(notificationId));
    } catch (error) {
      setReadStateError(error instanceof Error ? error.message : 'Não foi possível marcar a notificação como lida.');
      throw error;
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para seus produtos"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹  Voltar aos produtos</Text>
        </Pressable>
        <Text style={styles.eyebrow}>FIQUE POR DENTRO</Text>
        <Text style={styles.title}>Notificações</Text>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'unread' }}
            onPress={() => setTab('unread')}
            style={styles.tab}
          >
            <Text style={[styles.tabText, tab === 'unread' && styles.selectedTabText]}>Não Lidas</Text>
            <Text style={[styles.tabCount, tab === 'unread' && styles.selectedTabText]}>{unreadReminders.length}</Text>
            {tab === 'unread' ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'read' }}
            onPress={() => setTab('read')}
            style={styles.tab}
          >
            <Text style={[styles.tabText, tab === 'read' && styles.selectedTabText]}>Lidas</Text>
            <Text style={[styles.tabCount, tab === 'read' && styles.selectedTabText]}>{readReminders.length}</Text>
            {tab === 'read' ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={visibleReminders.length ? styles.reminderList : styles.emptyState}>
          {loading || readStateLoading ? (
            <Text style={styles.emptyText}>Carregando notificações...</Text>
          ) : loadError || readStateError ? (
            <Text style={styles.errorText}>{loadError ?? readStateError}</Text>
          ) : visibleReminders.length ? (
            visibleReminders.map((reminder) => (
              <NotificationCard
                key={reminder.id}
                reminder={reminder}
                isRead={tab === 'read'}
                onMarkRead={() => markAsRead(reminder.id)}
              />
            ))
          ) : (
            <>
              {tab === 'unread' && reminders.length === 0 ? (
                <View style={styles.bellCircle}>
                  <View style={styles.bellIcon}>
                    <View style={styles.bellBody} />
                    <View style={styles.bellBase} />
                    <View style={styles.bellClapper} />
                  </View>
                </View>
              ) : null}
              <Text style={styles.emptyText}>
                {tab === 'read'
                  ? 'Nenhuma notificação lida ainda.'
                  : reminders.length
                    ? 'Todas as notificações foram lidas.'
                    : 'Não há nenhuma notificação ainda, caso uma garantia esteja próxima de expirar vamos notificá-lo!'}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', flex: 1, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 12, marginBottom: 24 },
  backText: { color: colors.green, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, letterSpacing: 1.5, fontWeight: '800' },
  title: { color: colors.ink, fontWeight: '800', fontSize: 30, marginTop: 6 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, marginTop: 20 },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, position: 'relative' },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  tabCount: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  selectedTabText: { color: colors.green },
  tabIndicator: { position: 'absolute', height: 3, bottom: -1, left: 18, right: 18, borderRadius: 2, backgroundColor: colors.green },
  emptyState: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingBottom: 40 },
  reminderList: { paddingTop: 18, paddingBottom: 28, gap: 10 },
  swipeContainer: { position: 'relative', overflow: 'hidden', borderRadius: 16 },
  readUnderlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingLeft: 18, backgroundColor: colors.paleGreen, borderRadius: 16 },
  readUnderlayText: { color: colors.green, fontSize: 13, fontWeight: '800' },
  reminderCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 17 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderLabel: { color: colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  expiredLabel: { color: colors.orange },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  readBadge: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  productName: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 8 },
  reminderDate: { color: colors.muted, fontSize: 12, marginTop: 5 },
  bellCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  bellIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellBody: { position: 'absolute', top: 3, width: 24, height: 27, borderWidth: 3, borderColor: colors.ink, borderRadius: 13, backgroundColor: colors.paleGreen, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  bellBase: { position: 'absolute', top: 27, width: 30, height: 3, borderRadius: 2, backgroundColor: colors.ink },
  bellClapper: { position: 'absolute', top: 31, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  emptyText: { maxWidth: 360, color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  errorText: { maxWidth: 360, color: colors.orange, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});

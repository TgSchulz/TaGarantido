import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { AddWarrantySheet } from '../components/AddWarrantySheet';
import { DuplicateInvoiceCard } from '../components/DuplicateInvoiceCard';
import { EmptyWarranties } from '../components/EmptyWarranties';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { HomeHeader } from '../components/HomeHeader';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { WarrantyCard } from '../components/WarrantyCard';
import { WarrantySummary } from '../components/WarrantySummary';
import { DuplicateInvoiceError } from '../services/warranties';
import { useWarranties } from '../hooks/useWarranties';
import { colors } from '../theme/colors';
import type { Warranty } from '../types/warranty';

const MAX_VISIBLE_WARRANTY_CARDS = 4;
const ESTIMATED_WARRANTY_CARD_HEIGHT = 220;

function warrantyKey(warranty: Warranty): string {
  return warranty.id;
}

// A tela coordena carregamento e eventos; a apresentação de cada bloco fica nos componentes.
export function HomeScreen() {
  const {
    warranties,
    loading,
    refreshing,
    loadError,
    refresh,
    importXml,
    setExpiry,
    remove,
  } = useWarranties();
  const [working, setWorking] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [duplicateInvoiceNumber, setDuplicateInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    if (loadError) Alert.alert('Não foi possível carregar', loadError);
  }, [loadError]);

  const handleImportXml = async () => {
    // Primeiro libera a folha de ações; em seguida o seletor nativo escolhe o arquivo do aparelho.
    setAddSheetVisible(false);
    setDuplicateInvoiceNumber(null);
    try {
      // Alguns provedores Android atribuem MIME inconsistente a XML; a validação local confere o arquivo.
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        // Preserva a permissão temporária do seletor para ler diretamente o URI do provedor no Android.
        copyToCacheDirectory: false,
      });
      if (result.canceled) return;

      // A leitura e gravação local são assíncronas; o overlay comunica esse estado.
      setWorking(true);
      const created = await importXml(result.assets[0]);
      const pendingCount = created.filter((item) => !item.expires_at).length;
      const pendingNotice = pendingCount
        ? ` ${pendingCount} ${pendingCount === 1 ? 'card precisa' : 'cards precisam'} da data final.`
        : '';
      Alert.alert(
        'Nota adicionada',
        `${created.length} ${created.length === 1 ? 'produto foi importado' : 'produtos foram importados'} do XML.${pendingNotice}`,
      );
    } catch (error) {
      if (error instanceof DuplicateInvoiceError) {
        setDuplicateInvoiceNumber(error.invoiceNumber);
      } else {
        Alert.alert('Falha ao importar XML', error instanceof Error ? error.message : 'Tente novamente.');
      }
    } finally {
      setWorking(false);
    }
  };

  const renderWarranty = useCallback(({ item }: ListRenderItemInfo<Warranty>) => (
    <WarrantyCard warranty={item} onSaveExpiry={setExpiry} onDelete={remove} />
  ), [remove, setExpiry]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.pageContent}>
        <HomeHeader />
        <View style={styles.content}>
          {duplicateInvoiceNumber ? (
            <DuplicateInvoiceCard
              invoiceNumber={duplicateInvoiceNumber}
              onDismiss={() => setDuplicateInvoiceNumber(null)}
            />
          ) : null}
          <WarrantySummary count={warranties.length} />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Seus produtos</Text>
            <Text style={styles.sectionCount}>{warranties.length.toString().padStart(2, '0')}</Text>
          </View>

          {/* A lista tem viewport próprio: os cards rolam dentro dela sem alongar a tela. */}
          <View style={styles.cardsViewport}>
            <FlatList
              style={styles.list}
              data={loading ? [] : warranties}
              keyExtractor={warrantyKey}
              renderItem={renderWarranty}
              ListEmptyComponent={loading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={colors.green} />
                  <Text style={styles.loadingText}>Carregando suas garantias...</Text>
                </View>
              ) : (
                <EmptyWarranties onAddPress={() => setAddSheetVisible(true)} />
              )}
              contentContainerStyle={styles.cardsContent}
              showsVerticalScrollIndicator
              persistentScrollbar
              refreshControl={(
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void refresh(true)}
                  tintColor={colors.green}
                />
              )}
            />
          </View>
          <Text style={styles.footerNote}>Seus documentos guardados com cuidado.</Text>
        </View>
        <View style={styles.actionBar}>
          <FloatingActionButton label="Adicionar nota" onPress={() => setAddSheetVisible(true)} />
        </View>
      </View>

      {/* Componentes visuais recebem callbacks; a lógica continua concentrada nesta tela. */}
      {working ? <LoadingOverlay label="Importando sua nota fiscal..." /> : null}
      <AddWarrantySheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onImportXml={() => void handleImportXml()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  pageContent: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  cardsViewport: {
    flex: 1,
    minHeight: 100,
    maxHeight: MAX_VISIBLE_WARRANTY_CARDS * ESTIMATED_WARRANTY_CARD_HEIGHT,
  },
  list: { flex: 1 },
  cardsContent: { paddingBottom: 8 },
  actionBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.background },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 19 },
  sectionCount: { color: colors.muted, fontSize: 12, marginLeft: 9, backgroundColor: colors.countBackground, overflow: 'hidden', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  loadingState: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 10 },
  footerNote: { color: colors.footer, fontSize: 11, textAlign: 'center', marginTop: 10, marginBottom: 5 },
});

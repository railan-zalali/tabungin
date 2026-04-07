import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useWalletStore } from '../../store/useWalletStore';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { BorderRadius } from '../../constants/theme';
import {
  buildFullBackupExportData,
  exportToJSON,
  exportToCSV,
  exportToTXT,
  exportGoalsOnly,
  exportTransactionsOnly,
  type ExportFormat,
} from '../../utils/exportData';

type ExportScope = 'all' | 'transactions' | 'goals';

export function ExportDataScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { transactions, loadTransactions } = useTransactionStore();
  const { goals, loadGoals } = useSavingStore();
  const loadWallets = useWalletStore((state) => state.loadWallets);

  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ExportScope>('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    Promise.all([loadTransactions(), loadGoals(), loadWallets()]).catch((error) => {
      console.error('Failed to prime export data:', error);
    });
  }, [loadGoals, loadTransactions, loadWallets]);

  const exportOptions = [
    {
      id: 'json' as ExportFormat,
      title: 'JSON',
      description: 'Backup restore-safe dengan relasi data lengkap',
      icon: 'code-json',
      color: colors.primary,
    },
    {
      id: 'csv' as ExportFormat,
      title: 'CSV',
      description: 'Untuk analisis di Excel atau Google Sheets',
      icon: 'file-excel',
      color: colors.success,
    },
    {
      id: 'txt' as ExportFormat,
      title: 'TXT',
      description: 'Format teks mudah dibaca untuk laporan',
      icon: 'file-document',
      color: colors.info,
    },
  ];

  const scopeOptions = [
    {
      id: 'all' as ExportScope,
      title: 'Semua Data',
      description: 'JSON untuk backup penuh, CSV/TXT untuk ringkasan analisis',
      icon: 'database-export',
    },
    {
      id: 'transactions' as ExportScope,
      title: 'Hanya Transaksi',
      description: 'Data transaksi saja',
      icon: 'swap-horizontal',
    },
    {
      id: 'goals' as ExportScope,
      title: 'Hanya Target',
      description: 'Data target tabungan saja',
      icon: 'target',
    },
  ];

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const exportData = {
        version: 1,
        exportedAt: Date.now(),
        transactions,
        goals,
      };

      switch (selectedScope) {
        case 'all':
          switch (format) {
            case 'json':
              await exportToJSON(await buildFullBackupExportData());
              break;
            case 'csv':
              await exportToCSV(exportData);
              break;
            case 'txt':
              await exportToTXT(exportData);
              break;
          }
          break;

        case 'transactions':
          await exportTransactionsOnly(transactions, format);
          break;

        case 'goals':
          await exportGoalsOnly(goals, format);
          break;
      }

      setShowFormatModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedScopeLabel = selectedScope === 'all' ? 'Semua data' : selectedScope === 'transactions' ? 'Transaksi' : 'Target tabungan';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.bgAuraTop} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Kembali dari layar ekspor data"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Ekspor Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="database-export" size={24} color={colors.textInverse} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Ekspor yang cepat dipahami</Text>
                <Text style={styles.heroSubtitle}>
                  Pilih cakupan data lalu tentukan format yang paling cocok untuk restore aman atau analisis.
                </Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{transactions.length}</Text>
                <Text style={styles.heroStatLabel}>Transaksi</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{goals.length}</Text>
                <Text style={styles.heroStatLabel}>Target</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{selectedScopeLabel}</Text>
                <Text style={styles.heroStatLabel}>Cakupan</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pilih Data yang Diekspor</Text>
          <View style={styles.optionList}>
            {scopeOptions.map((option, index) => (
              <Animated.View key={option.id} entering={FadeInUp.delay(index * 70).springify()}>
                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    selectedScope === option.id && [styles.scopeOptionActive, { backgroundColor: colors.primaryBg, borderColor: colors.primary }],
                  ]}
                  onPress={() => setSelectedScope(option.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih cakupan ${option.title}`}
                  accessibilityState={{ selected: selectedScope === option.id }}
                >
                  <View style={[styles.scopeIcon, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons name={option.icon as any} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.scopeInfo}>
                    <Text style={[styles.scopeTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                    <Text style={[styles.scopeDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {selectedScope === option.id && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pilih Format Ekspor</Text>
          <View style={styles.formatGrid}>
            {exportOptions.map((option, index) => (
              <Animated.View key={option.id} entering={FadeInUp.delay(index * 80).springify()} style={{ flex: 1, minWidth: '45%' }}>
                <TouchableOpacity
                  style={[styles.formatOption, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => setShowFormatModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Buka pilihan format ${option.title}`}
                >
                  <View style={[styles.formatIcon, { backgroundColor: option.color + '20' }]}>
                    <MaterialCommunityIcons name={option.icon as any} size={32} color={option.color} />
                  </View>
                  <Text style={[styles.formatTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                  <Text style={[styles.formatDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.sectionBlock}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Transaksi</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{transactions.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryRow}>
              <MaterialCommunityIcons name="target" size={20} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Target</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{goals.length}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.sectionBlock}>
          <View style={[styles.tipsCard, { backgroundColor: colors.primaryBg, borderColor: `${colors.primary}22` }]}>
            <MaterialCommunityIcons name="lightbulb-outline" size={24} color={colors.primary} />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsTitle, { color: colors.primary }]}>Tips Ekspor Data</Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>• JSON untuk backup lengkap dan restore</Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>• CSV untuk analisis di Excel/Google Sheets</Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>• TXT untuk laporan mudah dibaca</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pilih Format Ekspor</Text>

            <View style={styles.formatList}>
              {exportOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.formatListItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={() => handleExport(option.id)}
                  disabled={isExporting}
                  accessibilityRole="button"
                  accessibilityLabel={`Ekspor data dalam format ${option.title}`}
                >
                  <View style={[styles.listFormatIcon, { backgroundColor: option.color + '20' }]}>
                    <MaterialCommunityIcons name={option.icon as any} size={28} color={option.color} />
                  </View>
                  <View style={styles.listFormatInfo}>
                    <Text style={[styles.listFormatTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                    <Text style={[styles.listFormatDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {isExporting && <ActivityIndicator color={option.color} size="small" />}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label="Batal"
              onPress={() => setShowFormatModal(false)}
              variant="secondary"
              fullWidth
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgAuraTop: {
    position: 'absolute',
    top: -100,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 30,
    padding: 20,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroGlow: {
    position: 'absolute',
    top: -58,
    right: -22,
    width: 150,
    height: 150,
    borderRadius: BorderRadius.full,
    backgroundColor: `${colors.textInverse}24`,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textInverse,
  },
  heroSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textInverse,
    marginTop: 4,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroStatValue: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textInverse,
  },
  heroStatLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 2,
    color: 'rgba(255,255,255,0.82)',
  },
  sectionBlock: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    ...Typography.caption,
    fontFamily: FontFamily.bodyBold,
    marginBottom: 12,
    paddingLeft: 4,
  },
  optionList: {
    gap: 12,
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    backgroundColor: colors.surfaceElevated,
  },
  scopeOptionActive: {},
  scopeIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeInfo: {
    flex: 1,
  },
  scopeTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  scopeDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 2,
    lineHeight: 18,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatOption: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
  },
  formatIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  formatTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    marginBottom: 4,
  },
  formatDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryLabel: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
  },
  summaryValue: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
  },
  tipsCard: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    marginBottom: 8,
  },
  tipsText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    marginBottom: 18,
  },
  formatList: {
    gap: 12,
  },
  formatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    backgroundColor: colors.surfaceElevated,
  },
  listFormatIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFormatInfo: {
    flex: 1,
  },
  listFormatTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  listFormatDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    marginTop: 2,
    lineHeight: 18,
  },
});

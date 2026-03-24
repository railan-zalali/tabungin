import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useSavingStore } from '../../store/useSavingStore';
import {
  exportToJSON,
  exportToCSV,
  exportToTXT,
  exportTransactionsOnly,
  type ExportFormat,
} from '../../utils/exportData';

type ExportScope = 'all' | 'transactions' | 'goals';

export function ExportDataScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { transactions } = useTransactionStore();
  const { goals } = useSavingStore();

  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ExportScope>('all');
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions = [
    {
      id: 'json' as ExportFormat,
      title: 'JSON',
      description: 'Format terstruktur, cocok untuk backup lengkap',
      icon: 'code-json',
      color: colors.primary,
    },
    {
      id: 'csv' as ExportFormat,
      title: 'CSV',
      description: 'Kompatibel dengan Excel, Google Sheets, dll',
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
      description: 'Transaksi dan Target Tabungan',
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
              await exportToJSON(exportData);
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
          Alert.alert('Info', 'Export target tabungan akan segera hadir di update mendatang!');
          break;
      }

      setShowFormatModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor='transparent'
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Ekspor Data</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Scope Selection */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Pilih Data yang Diekspor
          </Text>
          <View style={[styles.scopeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {scopeOptions.map((option, index) => (
              <Animated.View
                key={option.id}
                entering={FadeInUp.delay(index * 100).springify()}
              >
                <TouchableOpacity
                  style={[
                    styles.scopeOption,
                    selectedScope === option.id && [styles.scopeOptionActive, { backgroundColor: colors.primaryBg, borderColor: colors.primary }],
                  ]}
                  onPress={() => setSelectedScope(option.id)}
                >
                  <View style={[styles.scopeIcon, { backgroundColor: colors.primaryLight }]}>
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

        {/* Export Format Selection */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Pilih Format Ekspor
          </Text>
          <View style={styles.formatGrid}>
            {exportOptions.map((option, index) => (
              <Animated.View
                key={option.id}
                entering={FadeInUp.delay(index * 100).springify()}
                style={{ flex: 1, maxWidth: '100%' }}
              >
                <TouchableOpacity
                  style={[
                    styles.formatOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setShowFormatModal(true)}
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

        {/* Export Summary */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Transaksi:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{transactions.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="target" size={20} color={colors.success} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Target:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{goals.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.summaryItem}>
              <MaterialCommunityIcons name="information" size={20} color={colors.info} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Data Diekspor:</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {selectedScope === 'all' ? 'Semua' : selectedScope === 'transactions' ? 'Transaksi' : 'Target'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={[styles.tipsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <MaterialCommunityIcons name="lightbulb" size={24} color={colors.primary} />
            <View style={styles.tipsContent}>
              <Text style={[styles.tipsTitle, { color: colors.primary }]}>Tips Ekspor Data</Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
                • JSON untuk backup lengkap dan restore
              </Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
                • CSV untuk analisis di Excel/Google Sheets
              </Text>
              <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
                • TXT untuk laporan mudah dibaca
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Export Format Modal */}
      <Modal
        visible={showFormatModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Pilih Format Ekspor
            </Text>

            <View style={styles.formatList}>
              {exportOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.formatListItem,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => handleExport(option.id)}
                  disabled={isExporting}
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
                  {isExporting && (
                    <ActivityIndicator color={option.color} size='small' />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowFormatModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingVertical: 20,
    gap: 24,
  },
  sectionTitle: {
    ...Typography.caption,
    color: colors.textSecondary,
    fontFamily: FontFamily.bodyBold,
    marginBottom: 12,
    paddingLeft: 4,
  },
  scopeContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scopeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scopeOptionActive: {
    backgroundColor: colors.primaryBg,
  },
  scopeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scopeInfo: {
    flex: 1,
  },
  scopeTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },
  scopeDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  formatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  formatTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formatDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 8,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.primary,
    marginBottom: 8,
  },
  tipsText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  formatList: {
    gap: 12,
  },
  formatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  listFormatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listFormatInfo: {
    flex: 1,
  },
  listFormatTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },
  listFormatDescription: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
});

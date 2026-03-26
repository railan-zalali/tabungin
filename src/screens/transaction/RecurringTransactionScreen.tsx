import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { RecurringFrequency } from '../../database/recurringQueries';
import { formatCurrency } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { resolveCategoriesForType } from '../../utils/categoryResolver';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';

const FREQUENCY_OPTIONS: { label: string; value: RecurringFrequency }[] = [
  { label: 'Harian', value: 'daily' },
  { label: 'Mingguan', value: 'weekly' },
  { label: 'Dua Mingguan', value: 'biweekly' },
  { label: 'Bulanan', value: 'monthly' },
  { label: 'Tahunan', value: 'yearly' },
];

export function RecurringTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { recurringTransactions, isLoading, loadRecurringTransactions, addRecurringTransaction, toggleRecurringTransaction, deleteRecurringTransaction } = useRecurringStore();
  const { categories, loadCategories } = useCategoryStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formDayOfMonth, setFormDayOfMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRecurringTransactions();
    loadCategories();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecurringTransactions();
    setRefreshing(false);
  }, [loadRecurringTransactions]);

  const handleAddRecurring = async () => {
    if (!formCategory || !formAmount || !formFrequency) {
      Alert.alert('Error', 'Mohon lengkapi semua field yang diperlukan');
      return;
    }

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Jumlah tidak valid');
      return;
    }

    setIsSubmitting(true);
    try {
      const dayOfMonth = formFrequency === 'monthly' ? parseInt(formDayOfMonth, 10) || 1 : null;
      const startDate = Date.now();

      // Calculate first occurrence
      let firstOccurrence = startDate;
      if (formFrequency === 'monthly' && dayOfMonth) {
        const now = new Date();
        const currentDay = now.getDate();
        const targetDay = Math.min(dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
        firstOccurrence = nextMonth.getTime();
      } else if (formFrequency === 'weekly') {
        firstOccurrence = startDate + (7 * 24 * 60 * 60 * 1000);
      } else if (formFrequency === 'biweekly') {
        firstOccurrence = startDate + (14 * 24 * 60 * 60 * 1000);
      } else if (formFrequency === 'yearly') {
        const nextYear = new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate());
        firstOccurrence = nextYear.getTime();
      }

      await addRecurringTransaction({
        user_id: '', // Will be set in store
        wallet_id: null,
        category: formCategory,
        amount,
        type: formType,
        note: formNote || null,
        frequency: formFrequency,
        day_of_month: dayOfMonth,
        day_of_week: null,
        start_date: startDate,
        end_date: null,
        next_occurrence: firstOccurrence,
        is_active: true,
        last_generated_at: null,
      });

      setShowAddModal(false);
      resetForm();
      Alert.alert('Sukses', 'Transaksi berulang berhasil ditambahkan');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menambahkan transaksi berulang');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormType('expense');
    setFormCategory('');
    setFormAmount('');
    setFormNote('');
    setFormFrequency('monthly');
    setFormDayOfMonth('');
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Hapus Transaksi Berulang',
      'Apakah Anda yakin ingin menghapus transaksi berulang ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringTransaction(id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus transaksi');
            }
          },
        },
      ]
    );
  }, [deleteRecurringTransaction]);

  const relevantCategories = React.useMemo(
    () => resolveCategoriesForType(formType, categories),
    [formType, categories],
  );

  const recurringSummary = React.useMemo(() => {
    const activeCount = recurringTransactions.filter((tx) => tx.is_active).length;
    const incomeCount = recurringTransactions.filter((tx) => tx.type === 'income').length;
    const expenseCount = recurringTransactions.filter((tx) => tx.type === 'expense').length;
    const nextActive = recurringTransactions
      .filter((tx) => tx.is_active)
      .slice()
      .sort((a, b) => a.next_occurrence - b.next_occurrence)[0];

    return {
      activeCount,
      incomeCount,
      expenseCount,
      nextLabel: nextActive ? formatDateLong(nextActive.next_occurrence) : 'Belum ada jadwal',
    };
  }, [recurringTransactions]);

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Transaksi Berulang</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="autorenew" size={24} color={colors.textInverse} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Transaksi Berulang</Text>
                <Text style={styles.heroSubtitle}>
                  Jadwalkan pemasukan dan pengeluaran rutin tanpa harus input ulang setiap bulan.
                </Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{recurringSummary.activeCount}</Text>
                <Text style={styles.heroStatLabel}>Aktif</Text>
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{recurringSummary.incomeCount}</Text>
                <Text style={styles.heroStatLabel}>Income</Text>
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{recurringSummary.expenseCount}</Text>
                <Text style={styles.heroStatLabel}>Expense</Text>
              </View>
            </View>

            <View style={styles.heroNextCard}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.primary} />
              <Text style={styles.heroNextText}>Jadwal terdekat: {recurringSummary.nextLabel}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : recurringTransactions.length === 0 ? (
          <EmptyState
            icon="autorenew"
            title="Belum ada transaksi berulang"
            description="Tambahkan transaksi rutin untuk gaji, tagihan, atau kebutuhan bulanan supaya pencatatan lebih rapi."
            actionLabel="Tambah Transaksi"
            onAction={() => setShowAddModal(true)}
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.list}>
            {recurringTransactions.map((transaction, index) => (
              <Animated.View
                key={transaction.id}
                entering={FadeInUp.delay(index * 50).springify()}
                style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: transaction.type === 'income' ? colors.successBg : colors.dangerBg }]}>
                    <MaterialCommunityIcons
                      name={transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}
                      size={20}
                      color={transaction.type === 'income' ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.category, { color: colors.textPrimary }]}>{transaction.category}</Text>
                    <Text style={[styles.frequency, { color: colors.textSecondary }]}>
                      {FREQUENCY_OPTIONS.find(f => f.value === transaction.frequency)?.label}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: transaction.type === 'income' ? colors.success : colors.danger }]}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </Text>
                </View>

                {transaction.note && (
                  <Text style={[styles.note, { color: colors.textSecondary }]}>{transaction.note}</Text>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.nextOccurrence, { color: colors.textSecondary }]}>
                    Berikutnya: {formatDateLong(transaction.next_occurrence)}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => toggleRecurringTransaction(transaction.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons
                        name={transaction.is_active ? 'pause' : 'play'}
                        size={20}
                        color={transaction.is_active ? colors.warning : colors.success}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(transaction.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Tambah Transaksi Berulang
            </Text>

            {/* Type Toggle */}
            <View style={[styles.typeToggle, { backgroundColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  formType === 'expense' && [styles.typeOptionActive, { backgroundColor: colors.danger }],
                ]}
                onPress={() => setFormType('expense')}
              >
                <Text style={[styles.typeText, formType === 'expense' && { color: colors.textInverse }]}>Pengeluaran</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  formType === 'income' && [styles.typeOptionActive, { backgroundColor: colors.success }],
                ]}
                onPress={() => setFormType('income')}
              >
                <Text style={[styles.typeText, formType === 'income' && { color: colors.textInverse }]}>Pemasukan</Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {relevantCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      formCategory === category.name && [styles.categoryChipActive, { backgroundColor: colors.primary }],
                    ]}
                    onPress={() => setFormCategory(category.name)}
                  >
                      <MaterialCommunityIcons name={category.icon as any} size={16} color={formCategory === category.name ? colors.textInverse : category.color} />
                    <Text style={[
                      styles.categoryChipText,
                      formCategory === category.name && { color: colors.textInverse },
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Jumlah</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder='0'
                placeholderTextColor={colors.textTertiary}
                keyboardType='decimal-pad'
              />
            </View>

            {/* Frequency */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Frekuensi</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      formFrequency === option.value && [styles.frequencyOptionActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                    ]}
                    onPress={() => setFormFrequency(option.value)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      formFrequency === option.value && { color: colors.textInverse },
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Day of Month (for monthly) */}
            {formFrequency === 'monthly' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tanggal (1-31)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                  value={formDayOfMonth}
                  onChangeText={setFormDayOfMonth}
                  placeholder='1'
                  placeholderTextColor={colors.textTertiary}
                  keyboardType='number-pad'
                  maxLength={2}
                />
              </View>
            )}

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Catatan (opsional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={formNote}
                onChangeText={setFormNote}
                placeholder='Tambahkan catatan...'
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleAddRecurring}
                disabled={isSubmitting}
              >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.textInverse} size='small' />
                  ) : (
                    <Text style={styles.confirmButtonText}>Simpan</Text>
                  )}
              </TouchableOpacity>
            </View>
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
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 16,
  },
  heroWrap: {
    paddingHorizontal: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
    gap: 14,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
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
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatChip: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroStatValue: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textInverse,
  },
  heroStatLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },
  heroNextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroNextText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textPrimary,
  },
  list: {
    gap: 12,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  category: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },
  frequency: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amount: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextOccurrence: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyState: {
    marginHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.h3,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
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
    maxHeight: '80%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
  },
  typeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    backgroundColor: colors.surfaceElevated,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceElevated,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.surfaceElevated,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  frequencyOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  cancelButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
    confirmButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textInverse,
  },
});

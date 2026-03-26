import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StatusBar,
  Animated as RNAnimated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { BorderRadius } from "../../constants/theme";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useCategoryStore } from "../../store/useCategoryStore";
import { useTheme } from "../../store/useThemeStore";
import type { Transaction } from "../../types/transaction";
import { formatCurrency } from "../../utils/currency";
import { formatDateGroup } from "../../utils/date";
import { TransactionItem } from "../../components/transaction/TransactionItem";
import { TransactionItemSkeleton } from "../../components/common/SkeletonLoader";
import { EmptyState } from "../../components/common/EmptyState";

type FilterType = "all" | "income" | "expense";
type PeriodType = "today" | "week" | "month" | "all";

export function TransactionListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { transactions, isLoading, loadTransactions, removeTransaction } = useTransactionStore();
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const categoryCount = useCategoryStore((state) => state.categories.length);
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterPeriod, setFilterPeriod] = useState<PeriodType>("month");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Header Animation
  const scrollY = new RNAnimated.Value(0);

  const load = useCallback(() => {
    loadTransactions({
      type: filterType === "all" ? "all" : filterType,
      period: filterPeriod === "all" ? undefined : (filterPeriod as any),
      searchQuery: search || undefined,
    });
  }, [filterType, filterPeriod, search, loadTransactions]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, load]);

  // Load when filters change (but not on search as that's handled by debounce)
  useEffect(() => {
    if (search === "") {
      load();
    }
  }, [filterType, filterPeriod, load]);

  useEffect(() => {
    if (categoryCount === 0) {
      loadCategories();
    }
  }, [categoryCount, loadCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Kelompokkan transaksi berdasarkan tanggal
  const grouped = useMemo(() => {
    const map = new Map<string, { date: number; transactions: Transaction[] }>();
    for (const tx of transactions) {
      const dayKey = new Date(tx.date).toDateString();
      if (!map.has(dayKey)) {
        map.set(dayKey, { date: tx.date, transactions: [] });
      }
      map.get(dayKey)!.transactions.push(tx);
    }
    return Array.from(map.values()).map((group) => ({
      title: formatDateGroup(group.date),
      date: group.date,
      data: group.transactions,
      totalIncome: group.transactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
      totalExpense: group.transactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    }));
  }, [transactions]);

  const typeFilters: { id: FilterType; label: string }[] = [
    { id: "all", label: "Semua" },
    { id: "income", label: "Pemasukan" },
    { id: "expense", label: "Pengeluaran" },
  ];

  const periodFilters: { id: PeriodType; label: string }[] = [
    { id: "today", label: "Hari ini" },
    { id: "week", label: "Minggu ini" },
    { id: "month", label: "Bulan ini" },
    { id: "all", label: "Semua" },
  ];

  const totalAmount = useMemo(
    () =>
      transactions.reduce((sum, tx) => {
        const signed = tx.type === "income" ? tx.amount : -tx.amount;
        return sum + signed;
      }, 0),
    [transactions]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor='transparent' translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name='arrow-left' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaksi</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddTransaction")}
        >
          <MaterialCommunityIcons name='plus' size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterHeader}>
          <View>
            <Text style={styles.filterTitle}>Cari dan Saring</Text>
            <Text style={styles.filterHint}>Fokus ke transaksi yang paling penting dulu.</Text>
          </View>
          <View style={styles.filterBadge}>
            <MaterialCommunityIcons name="filter-variant" size={14} color={colors.primary} />
            <Text style={styles.filterBadgeText}>{grouped.length} hari</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name='magnify' size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder='Cari transaksi...'
            placeholderTextColor={colors.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons name='close-circle' size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filter */}
        <View style={styles.typeFilterRow}>
          {typeFilters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.typeFilterTab,
                filterType === f.id && styles.typeFilterTabActive,
                filterType === f.id && {
                  backgroundColor:
                    f.id === "income"
                      ? colors.successBg
                      : f.id === "expense"
                        ? colors.dangerBg
                        : colors.surfaceAlt,
                },
              ]}
              onPress={() => setFilterType(f.id)}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  filterType === f.id && styles.typeFilterTextActive,
                  filterType === f.id && {
                    color:
                      f.id === "income"
                        ? colors.success
                        : f.id === "expense"
                          ? colors.danger
                          : colors.textPrimary,
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient
          colors={[colors.surfaceElevated, colors.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryStrip}
        >
          <View style={styles.summaryStripItem}>
            <Text style={styles.summaryStripLabel}>Transaksi</Text>
            <Text style={styles.summaryStripValue}>{transactions.length}</Text>
          </View>
          <View style={styles.summaryStripDivider} />
          <View style={styles.summaryStripItem}>
            <Text style={styles.summaryStripLabel}>Net</Text>
            <Text style={[styles.summaryStripValue, { color: totalAmount >= 0 ? colors.success : colors.danger }]}>
              {formatCurrency(Math.abs(totalAmount))}
            </Text>
          </View>
          <View style={styles.summaryStripDivider} />
          <View style={styles.summaryStripItem}>
            <Text style={styles.summaryStripLabel}>Mode</Text>
            <Text style={styles.summaryStripValue}>{filterPeriod === "all" ? "Semua" : filterPeriod}</Text>
          </View>
        </LinearGradient>

        {/* Period Filter */}
        <View style={styles.periodFilterRow}>
          {periodFilters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.periodChip, filterPeriod === f.id && styles.periodChipActive]}
              onPress={() => setFilterPeriod(f.id)}
            >
              <Text style={[styles.periodText, filterPeriod === f.id && styles.periodTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={styles.listContainer}>
          <TransactionItemSkeleton />
          <TransactionItemSkeleton />
          <TransactionItemSkeleton />
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon='receipt'
            title='Tidak ada transaksi'
            message='Coba ubah filter atau mulai catat transaksimu'
            actionLabel='Tambah Transaksi'
            onAction={() => navigation.navigate("AddTransaction")}
          />
        </View>
      ) : (
        <SectionList
          sections={grouped}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionSummary}>
                {section.totalIncome > 0 && (
                  <Text style={styles.incomeText}>+{formatCurrency(section.totalIncome)}</Text>
                )}
                {section.totalExpense > 0 && (
                  <Text style={styles.expenseText}>-{formatCurrency(section.totalExpense)}</Text>
                )}
              </View>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View style={styles.itemWrapper}>
              <TransactionItem
                transaction={item}
                onDelete={removeTransaction}
                onEdit={(id) => navigation.navigate("AddTransaction", { editId: id })}
                onPress={(t) => navigation.navigate("TransactionDetail", { transactionId: t.id })}
              />
              {index < section.data.length - 1 && <View style={styles.separator} />}
            </View>
          )}
          renderSectionFooter={() => <View style={{ height: 16 }} />}
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bgAuraTop: {
    position: "absolute",
    top: -90,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  headerTitle: { ...Typography.h2, color: colors.textPrimary },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryBg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}28`,
  },

  filterContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius["4xl"],
    gap: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  filterTitle: {
    ...Typography.h4,
    color: colors.textPrimary,
  },
  filterHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  filterBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: colors.primary,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: BorderRadius["2xl"],
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },

  typeFilterRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: BorderRadius["2xl"],
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeFilterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  typeFilterTabActive: {
    backgroundColor: colors.surfaceAlt,
  },
  typeFilterText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },
  typeFilterTextActive: {
    fontFamily: FontFamily.bodyBold,
    color: colors.textPrimary,
  },

  periodFilterRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  periodChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: `${colors.primary}26`,
  },
  periodText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },
  periodTextActive: {
    fontFamily: FontFamily.bodyBold,
    color: colors.primaryDark,
  },

  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius["3xl"],
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  summaryStripItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryStripDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.divider,
  },
  summaryStripLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },
  summaryStripValue: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },

  listContainer: { padding: 20, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  listContent: { padding: 20, paddingBottom: 100 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  sectionTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSummary: {
    flexDirection: "row",
    gap: 8,
  },
  incomeText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.success,
  },
  expenseText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.danger,
  },

  itemWrapper: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius["3xl"],
    overflow: "hidden",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: -1, // Overlap borders for list look
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 56, // Align with text
  },
});

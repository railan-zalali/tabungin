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
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { BorderRadius, Shadow } from "../../constants/theme";
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
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    borderRadius: BorderRadius["4xl"],
    gap: 14,
    ...Shadow.sm,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceCard,
    borderRadius: BorderRadius["2xl"],
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: `${colors.border}AA`,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },

  typeFilterRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceCard,
    borderRadius: BorderRadius["2xl"],
    padding: 4,
    borderWidth: 1,
    borderColor: `${colors.border}AA`,
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
    borderColor: `${colors.border}AA`,
    backgroundColor: colors.surfaceCard,
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
    borderColor: `${colors.border}88`,
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: BorderRadius["3xl"],
    overflow: "hidden",
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    marginBottom: -1, // Overlap borders for list look
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 56, // Align with text
  },
});

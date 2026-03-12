import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { Shadow } from "../../constants/theme";
import { useAuthStore } from "../../store/useAuthStore";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useSavingStore } from "../../store/useSavingStore";
import { useWalletStore } from "../../store/useWalletStore";
import { formatCurrency } from "../../utils/currency";
import { formatDateLong } from "../../utils/date";
import { TransactionItem } from "../../components/transaction/TransactionItem";
import { SavingGoalCard } from "../../components/saving/SavingGoalCard";
import {
  TransactionItemSkeleton,
  SavingGoalCardSkeleton,
} from "../../components/common/SkeletonLoader";
import { EmptyState } from "../../components/common/EmptyState";
import { ProfileSwitcher } from "../../components/profile/ProfileSwitcher";
import { useProfileStore } from "../../store/useProfileStore";
import { useTheme } from "../../store/useThemeStore";

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { loadProfiles } = useProfileStore();
  const { colors, mode } = useTheme();

  const {
    recentTransactions,
    totalIncome,
    totalExpense,
    isLoading: txLoading,
    loadRecent,
    refreshSummary,
    removeTransaction,
  } = useTransactionStore();

  const { activeGoals, isLoading: savLoading, loadGoals } = useSavingStore();

  const { totalBalance, loadWallets } = useWalletStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const loadAll = useCallback(async () => {
    await loadProfiles();
    await Promise.all([loadRecent(), refreshSummary(), loadGoals(), loadWallets()]);
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // Quick action items - 3 buttons as requested
  const quickActions = [
    {
      id: "1",
      icon: "arrow-up-circle",
      label: "Pemasukan",
      color: Colors.success,
      bgColor: Colors.successBg,
      onPress: () =>
        navigation.navigate("Transactions", {
          screen: "AddTransaction",
          params: { type: "income" },
        }),
    },
    {
      id: "2",
      icon: "arrow-down-circle",
      label: "Pengeluaran",
      color: Colors.danger,
      bgColor: Colors.dangerBg,
      onPress: () =>
        navigation.navigate("Transactions", {
          screen: "AddTransaction",
          params: { type: "expense" },
        }),
    },
    {
      id: "3",
      icon: "target",
      label: "Target",
      color: Colors.primary,
      bgColor: Colors.primaryLight,
      onPress: () => navigation.navigate("Savings", { screen: "AddSavingGoal" }),
    },
  ];

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor='transparent'
        translucent
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>
              Halo, {user?.name?.split(" ")[0] ?? "Kawan"}! 👋
            </Text>
            <View style={{ marginTop: 8 }}>
              <ProfileSwitcher />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.notifBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {}} // TODO: Navigate to notifications
            accessibilityLabel='Notifikasi'
            accessibilityRole='button'
          >
            <MaterialCommunityIcons name='bell-outline' size={24} color={colors.textPrimary} />
            {/* <View style={styles.notifBadge} /> */}
          </TouchableOpacity>
        </View>

        {/* Kartu Saldo Utama */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Saldo Keseluruhan</Text>
            <Text style={styles.balanceAmount} numberOfLines={1}>
              {formatCurrency(totalBalance)}
            </Text>
          </View>

          <View style={styles.dividerH} />

          <View style={styles.incomeExpenseRow}>
            <View style={styles.incomeExpenseItem}>
              <View style={styles.iconRow}>
                <View style={[styles.iconBg, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <MaterialCommunityIcons name='arrow-up' size={16} color='#FFF' />
                </View>
                <Text style={styles.incomeExpenseLabel}>Pemasukan</Text>
              </View>
              <Text style={styles.incomeAmount}>{formatCurrency(totalIncome)}</Text>
              <Text style={styles.periodText}>Bulan ini</Text>
            </View>

            <View style={styles.dividerV} />

            <View style={styles.incomeExpenseItem}>
              <View style={styles.iconRow}>
                <View style={[styles.iconBg, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <MaterialCommunityIcons name='arrow-down' size={16} color='#FFF' />
                </View>
                <Text style={styles.incomeExpenseLabel}>Pengeluaran</Text>
              </View>
              <Text style={styles.incomeAmount}>{formatCurrency(totalExpense)}</Text>
              <Text style={styles.periodText}>Bulan ini</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate("Report")}
            accessibilityLabel='Lihat rincian laporan keuangan'
            accessibilityRole='button'
          >
            <Text style={styles.detailBtnText}>Lihat Rincian</Text>
            <MaterialCommunityIcons name='chevron-right' size={16} color='#FFF' />
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              onPress={action.onPress}
              activeOpacity={0.7}
              accessibilityLabel={action.label}
              accessibilityRole='button'
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                <MaterialCommunityIcons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Saving Goals Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Target Tabungan</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Savings")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel='Lihat semua target tabungan'
              accessibilityRole='button'
            >
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {savLoading ? (
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              <SavingGoalCardSkeleton />
            </View>
          ) : activeGoals.length === 0 ? (
            <View style={{ paddingHorizontal: 20 }}>
              <EmptyState
                icon='piggy-bank-outline'
                title='Belum ada target'
                message='Buat target tabungan impianmu sekarang!'
                actionLabel='Buat Target'
                onAction={() => navigation.navigate("Savings", { screen: "AddSavingGoal" })}
              />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {activeGoals.slice(0, 2).map((goal, idx) => (
                <SavingGoalCard
                  key={goal.id}
                  goal={goal}
                  animationDelay={idx * 100}
                  onPress={() =>
                    navigation.navigate("Savings", {
                      screen: "SavingDetail",
                      params: { goalId: goal.id },
                    })
                  }
                  onAddSaving={() =>
                    navigation.navigate("Savings", {
                      screen: "SavingDetail",
                      params: { goalId: goal.id },
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Transaksi Terbaru */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Transaksi Terbaru
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Transactions")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel='Lihat semua transaksi'
              accessibilityRole='button'
            >
              <Text style={[styles.seeAll, { color: colors.primary }]}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.transactionList,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {txLoading ? (
              <>
                <TransactionItemSkeleton />
                <TransactionItemSkeleton />
              </>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon='receipt'
                title='Belum ada transaksi'
                message='Mulai catat pemasukan & pengeluaranmu'
              />
            ) : (
              recentTransactions.map((tx, idx) => (
                <React.Fragment key={tx.id}>
                  <TransactionItem
                    transaction={tx}
                    onDelete={removeTransaction}
                    onPress={(t) =>
                      navigation.navigate("Transactions", {
                        screen: "TransactionDetail",
                        params: { transactionId: t.id },
                      })
                    }
                  />
                  {idx < recentTransactions.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.divider }]} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { gap: 24, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greeting: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  date: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  notifBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    ...Shadow.lg,
  },
  balanceHeader: { marginBottom: 20 },
  balanceLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    color: "rgba(255,255,255,0.9)",
  },
  balanceAmount: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.display,
    color: "#FFF",
    marginTop: 8,
    letterSpacing: -1,
  },

  dividerH: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 20 },

  incomeExpenseRow: { flexDirection: "row" },
  dividerV: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 20 },
  incomeExpenseItem: { flex: 1, gap: 4 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  incomeExpenseLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: "rgba(255,255,255,0.9)",
  },
  incomeAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: "#FFF" },
  periodText: { fontFamily: FontFamily.body, fontSize: 10, color: "rgba(255,255,255,0.7)" },

  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  detailBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: "#FFF" },

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  section: { gap: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  seeAll: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.primary,
  },

  transactionList: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 8,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 64, marginRight: 16 },
});

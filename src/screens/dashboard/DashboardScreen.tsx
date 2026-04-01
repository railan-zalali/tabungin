import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { BorderRadius, Shadow } from "../../constants/theme";
import { useAuthStore } from "../../store/useAuthStore";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useSavingStore } from "../../store/useSavingStore";
import { useWalletStore } from "../../store/useWalletStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useCategoryStore } from "../../store/useCategoryStore";
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
import { ContextBadge } from "../../components/common/ContextBadge";
import { SectionHeader } from "../../components/common/SectionHeader";
import { getGoalComputedMeta } from "../../utils/goalSharing";
import type { DashboardNavigationProp } from "../../types/navigation";

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { loadProfiles, profiles, activeProfileId } = useProfileStore();
  const { colors, gradients, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const {
    recentTransactions,
    totalIncome,
    totalExpense,
    isLoading: txLoading,
    loadRecent,
    refreshSummary,
    removeTransaction,
  } = useTransactionStore();

  const { activeGoals, goals, isLoading: savLoading, loadGoals } = useSavingStore();

  const { totalBalance, wallets, loadWallets } = useWalletStore();

  const { unreadCount, loadUnreadCount } = useNotificationStore();
  const loadCategories = useCategoryStore((state) => state.loadCategories);
  const categoryCount = useCategoryStore((state) => state.categories.length);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  const [refreshing, setRefreshing] = React.useState(false);

  const loadAll = useCallback(async () => {
    try {
      await loadProfiles();
      await Promise.all([loadRecent(), refreshSummary(), loadGoals(), loadWallets()]);
    } catch (e) {
      console.error("Dashboard refresh error:", e);
    }
  }, [loadRecent, refreshSummary, loadGoals, loadWallets, loadProfiles]);

  useEffect(() => {
    loadAll();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (categoryCount === 0) {
      loadCategories();
    }
  }, [categoryCount, loadCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const quickActions = [
    {
      id: "1",
      icon: "arrow-up-circle",
      label: "Pemasukan",
      color: colors.success,
      bgColor: colors.successBg,
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
      color: colors.danger,
      bgColor: colors.dangerBg,
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
      color: colors.primary,
      bgColor: colors.primaryLight,
      onPress: () => navigation.navigate("Savings", { screen: "AddSavingGoal" }),
    },
  ];
  const sharedGoalsCount = activeGoals.filter((goal) => {
    const wallet = wallets.find((item) => item.id === goal.wallet_id);
    return getGoalComputedMeta(goal, wallet, activeProfileId).isSharedGoal;
  }).length;
  const sharedWalletCount = wallets.filter((wallet) => wallet.profile_id && wallet.profile_id !== activeProfileId).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <View style={styles.bgAuraBottom} pointerEvents="none" />
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Halo, {user?.name ? user.name.split(" ")[0] : "Kawan"}!
            </Text>
            <Text style={styles.date}>{formatDateLong(Date.now())}</Text>
            <View style={styles.profileWrap}>
              <ProfileSwitcher />
            </View>
            <View style={styles.contextBadgeRow}>
              {activeProfile ? (
                <ContextBadge icon="account-circle-outline" label={activeProfile.name} tone="primary" />
              ) : null}
              <ContextBadge icon="wallet-outline" label={`${wallets.length} dompet`} tone="neutral" />
              {sharedWalletCount > 0 ? (
                <ContextBadge icon="account-group-outline" label={`${sharedWalletCount} shared`} tone="info" />
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() =>
              navigation.navigate("Settings", {
                screen: "Notifications",
              } as never)
            }
            accessibilityLabel="Notifikasi"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <LinearGradient
            colors={gradients.hero as unknown as [string, string, ...string[]]}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.balanceGlowTop} />
            <View style={styles.balanceGlowBottom} />

            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceLabel}>Total Saldo Keseluruhan</Text>
                <Text style={styles.balanceAmount} numberOfLines={1}>
                  {formatCurrency(totalBalance)}
                </Text>
              </View>
              <View style={styles.balanceIconWrap}>
                <MaterialCommunityIcons name="wallet-outline" size={28} color={colors.textInverse} />
              </View>
            </View>

            <View style={styles.balanceStatsRow}>
              <View style={styles.balanceStatChip}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={14} color={colors.textInverse} />
                <Text style={styles.balanceStatText}>{goals.length} target</Text>
              </View>
              <View style={styles.balanceStatChip}>
                <MaterialCommunityIcons name="credit-card-multiple-outline" size={14} color={colors.textInverse} />
                <Text style={styles.balanceStatText}>{wallets.length} dompet</Text>
              </View>
              {sharedGoalsCount > 0 ? (
                <View style={styles.balanceStatChip}>
                  <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textInverse} />
                  <Text style={styles.balanceStatText}>{sharedGoalsCount} target bersama</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dividerH} />

            <View style={styles.incomeExpenseRow}>
              <View style={styles.incomeExpenseItem}>
                <View style={styles.iconRow}>
                  <View style={styles.iconBg}>
                    <MaterialCommunityIcons name="arrow-up" size={16} color={colors.textInverse} />
                  </View>
                  <Text style={styles.incomeExpenseLabel}>Pemasukan</Text>
                </View>
                <Text style={styles.incomeAmount}>{formatCurrency(totalIncome)}</Text>
                <Text style={styles.periodText}>Bulan ini</Text>
              </View>

              <View style={styles.dividerV} />

              <View style={styles.incomeExpenseItem}>
                <View style={styles.iconRow}>
                  <View style={styles.iconBg}>
                    <MaterialCommunityIcons name="arrow-down" size={16} color={colors.textInverse} />
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
              accessibilityLabel="Lihat rincian laporan keuangan"
              accessibilityRole="button"
            >
              <Text style={styles.detailBtnText}>Buka Insight Keuangan</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textInverse} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <Animated.View
              key={action.id}
              entering={ZoomIn.delay(180 + index * 80).springify()}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={styles.quickAction}
                onPress={action.onPress}
                activeOpacity={0.8}
                accessibilityLabel={action.label}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[`${action.color}10`, colors.surfaceCard]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionGlass}
                />
                <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                  <MaterialCommunityIcons name={action.icon as any} size={30} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.section}>
          <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.sectionHeader}>
            <SectionHeader
              title="Target Tabungan"
              subtitle="Tujuan yang sedang kamu dorong sekarang"
              actionLabel="Lihat Semua"
              onAction={() => navigation.navigate("Savings", { screen: "SavingList" })}
            />
          </Animated.View>

          {savLoading ? (
            <View style={styles.goalListWrap}>
              <SavingGoalCardSkeleton />
            </View>
          ) : activeGoals.length === 0 ? (
            <View style={styles.goalListWrap}>
              <View style={styles.glassSectionCard}>
                <EmptyState
                  icon="piggy-bank-outline"
                  title="Belum ada target"
                  message="Buat target tabungan impianmu sekarang!"
                  actionLabel="Buat Target"
                  onAction={() => navigation.navigate("Savings", { screen: "AddSavingGoal" })}
                />
              </View>
            </View>
          ) : (
            <View style={styles.goalListWrap}>
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

        <View style={[styles.section, { marginBottom: 100 }]}>
          <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.sectionHeader}>
            <SectionHeader
              title="Transaksi Terbaru"
              subtitle="Pantau arus uang terakhir tanpa pindah screen"
              actionLabel="Lihat Semua"
              onAction={() => navigation.navigate("Transactions", { screen: "TransactionList" })}
            />
          </Animated.View>

          <View style={styles.transactionList}>
            {txLoading ? (
              <>
                <TransactionItemSkeleton />
                <TransactionItemSkeleton />
              </>
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                icon="receipt"
                title="Belum ada transaksi"
                message="Mulai catat pemasukan dan pengeluaranmu"
              />
            ) : (
              recentTransactions.map((tx, idx) => (
                <React.Fragment key={tx.id}>
                  <TransactionItem
                    transaction={tx}
                    onDelete={removeTransaction}
                    onEdit={(id) =>
                      navigation.navigate("Transactions", {
                        screen: "AddTransaction",
                        params: { editId: id },
                      })
                    }
                    onPress={(t) =>
                      navigation.navigate("Transactions", {
                        screen: "TransactionDetail",
                        params: { transactionId: t.id },
                      })
                    }
                  />
                  {idx < recentTransactions.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
      position: "absolute",
      top: -110,
      right: -40,
      width: 250,
      height: 250,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primaryLight,
      opacity: 0.65,
    },
    bgAuraBottom: {
      position: "absolute",
      bottom: 140,
      left: -70,
      width: 220,
      height: 220,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.infoLight,
      opacity: 0.24,
    },
    scrollContent: { gap: 24, paddingBottom: 40 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 16,
    },
    headerLeft: { flex: 1 },
    greeting: {
      ...Typography.h1,
      color: colors.textPrimary,
    },
    date: {
      ...Typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    profileWrap: { marginTop: 8 },
    contextBadgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    notifBtn: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius["2xl"],
      backgroundColor: colors.surfaceGlass,
      ...Shadow.sm,
      borderWidth: 1,
      borderColor: colors.glassStroke,
    },
    notifBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: colors.danger,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    notifBadgeText: {
      fontFamily: FontFamily.bodyBold,
      fontSize: 10,
      color: colors.textInverse,
    },
    balanceCard: {
      marginHorizontal: 20,
      borderRadius: BorderRadius["5xl"],
      padding: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      ...Shadow.xl,
    },
    balanceGlowTop: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: BorderRadius.full,
      top: -70,
      right: -24,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    balanceGlowBottom: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: BorderRadius.full,
      bottom: -40,
      left: -20,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    balanceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    balanceLabel: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.body,
      color: colors.textInverse,
    },
    balanceAmount: {
      fontFamily: FontFamily.heading,
      fontSize: FontSize.display,
      color: colors.textInverse,
      marginTop: 8,
      letterSpacing: -1,
    },
    balanceIconWrap: {
      width: 58,
      height: 58,
      borderRadius: BorderRadius["2xl"],
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    balanceStatsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 12,
    },
    balanceStatChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    balanceStatText: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: colors.textInverse,
    },
    dividerH: { height: 1, backgroundColor: "rgba(255,255,255,0.14)", marginBottom: 20 },
    incomeExpenseRow: { flexDirection: "row" },
    dividerV: { width: 1, backgroundColor: "rgba(255,255,255,0.14)", marginHorizontal: 20 },
    incomeExpenseItem: { flex: 1, gap: 4 },
    iconRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    iconBg: {
      width: 24,
      height: 24,
      borderRadius: BorderRadius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    incomeExpenseLabel: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: colors.textInverse,
    },
    incomeAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: colors.textInverse },
    periodText: { fontFamily: FontFamily.body, fontSize: 10, color: "rgba(255,255,255,0.66)" },
    detailBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.10)",
      marginTop: 20,
      paddingVertical: 13,
      borderRadius: BorderRadius.xl,
      gap: 4,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    detailBtnText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textInverse },
    quickActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      gap: 12,
    },
    quickAction: {
      flex: 1,
      alignItems: "center",
      padding: 16,
      borderRadius: BorderRadius["3xl"],
      gap: 12,
      ...Shadow.sm,
      borderWidth: 1,
      borderColor: colors.glassStroke,
      overflow: "hidden",
      backgroundColor: colors.surfaceGlass,
    },
    quickActionGlass: {
      ...StyleSheet.absoluteFillObject,
    },
    quickActionIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: "center",
      justifyContent: "center",
    },
    quickActionLabel: {
      fontFamily: FontFamily.bodyBold,
      fontSize: FontSize.caption,
      color: colors.textPrimary,
      textAlign: "center",
    },
    section: { gap: 16 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      gap: 12,
    },
    sectionTitle: {
      ...Typography.h2,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    seeAll: {
      fontFamily: FontFamily.bodyBold,
      fontSize: FontSize.body,
      color: colors.primary,
    },
    goalListWrap: { paddingHorizontal: 20, gap: 12 },
    glassSectionCard: {
      backgroundColor: colors.surfaceGlass,
      borderRadius: BorderRadius["4xl"],
      borderWidth: 1,
      borderColor: colors.glassStroke,
      padding: 8,
      ...Shadow.sm,
    },
    transactionList: {
      backgroundColor: colors.surfaceGlass,
      marginHorizontal: 20,
      borderRadius: BorderRadius["4xl"],
      padding: 8,
      ...Shadow.sm,
      borderWidth: 1,
      borderColor: colors.glassStroke,
      overflow: "hidden",
    },
    separator: { height: 1, backgroundColor: colors.divider, marginLeft: 64, marginRight: 16 },
  });

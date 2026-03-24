import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { BorderRadius, Shadow } from "../../constants/theme";
import { useWalletStore } from "../../store/useWalletStore";
import { formatCurrency } from "../../utils/currency";
import { EmptyState } from "../../components/common/EmptyState";
import type { Wallet } from "../../database/walletQueries";
import { useTheme } from "../../store/useThemeStore";

export function WalletListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { wallets, loadWallets, removeWallet, isLoading, error } = useWalletStore();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallets();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Hapus Dompet",
      `Yakin ingin menghapus "${name}"? Transaksi yang terkait mungkin akan kehilangan referensi dompet.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await removeWallet(id);
            } catch (e: any) {
              Alert.alert("Gagal", e.message || "Gagal menghapus dompet.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Wallet }) => {
    // Tentukan icon berdasarkan tipe wallet
    let iconName: any = "wallet-outline";
    if (item.type === "bank") iconName = "bank-outline";
    else if (item.type === "e-wallet") iconName = "cellphone";
    else if (item.type === "cash") iconName = "cash";

    const itemColor = item.color || colors.primary;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("AddWallet", { wallet: item })}
        style={[styles.cardContainer, Shadow.sm, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.cardContent, { borderLeftColor: itemColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.walletInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${itemColor}15` }]}>
                <MaterialCommunityIcons name={iconName} size={24} color={itemColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walletName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name || "Dompet Tanpa Nama"}
                </Text>
                <Text style={[styles.walletType, { color: colors.textSecondary }]}>
                  {item.type ? item.type.toUpperCase() : "GENERAL"}
                </Text>
              </View>
            </View>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <MaterialCommunityIcons name='star' size={12} color='#FFF' />
                <Text style={styles.defaultText}>Utama</Text>
              </View>
            )}
          </View>

          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              Saldo Saat Ini
            </Text>
            <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
              {formatCurrency(item.balance || 0)}
            </Text>
          </View>
        </View>

        {!item.is_default && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={`Hapus dompet ${item.name}`}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name='trash-can-outline'
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
    >
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor='transparent'
        translucent
      />

      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.background, borderColor: colors.divider }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name='arrow-left' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Daftar Dompet</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("QRScanner")}
            style={[
              styles.addBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.divider,
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Scan QR Undangan"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name='qrcode-scan' size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("AddWallet")}
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Tambah Dompet Baru"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name='plus' size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading && !refreshing && wallets.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={wallets || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon='wallet-outline'
              title='Belum ada dompet'
              message='Tambahkan dompet pertama Anda untuk mulai mencatat keuangan.'
              actionLabel='Tambah Dompet'
              onAction={() => navigation.navigate("AddWallet")}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bgAuraTop: {
    position: "absolute",
    top: -100,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
  },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 20, gap: 16, paddingBottom: 100 },

  cardContainer: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: BorderRadius["4xl"],
    marginBottom: 4,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  cardContent: {
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: BorderRadius["4xl"],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  walletInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  walletName: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.body,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  walletType: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
  },
  defaultText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: "#FFF",
  },

  balanceContainer: {
    marginTop: 4,
  },
  balanceLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
  },

  deleteBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: `${colors.border}90`,
  },
});

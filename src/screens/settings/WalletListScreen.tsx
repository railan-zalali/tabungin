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
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { Shadow } from "../../constants/theme";
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

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("AddWallet", { wallet: item })}
        style={[styles.cardContainer, Shadow.sm, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.cardContent, { borderLeftColor: item.color }]}>
          <View style={styles.cardHeader}>
            <View style={styles.walletInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <MaterialCommunityIcons name={iconName} size={24} color={item.color} />
              </View>
              <View>
                <Text style={[styles.walletName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.walletType, { color: colors.textSecondary }]}>
                  {item.type.toUpperCase()}
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
              {formatCurrency(item.balance)}
            </Text>
          </View>
        </View>

        {!item.is_default && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        >
          <MaterialCommunityIcons name='arrow-left' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Daftar Dompet</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("AddWallet")}
          style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name='plus' size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && !refreshing && (!wallets || wallets.length === 0) ? (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: { padding: 4 },
  addBtn: {
    padding: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 20, gap: 16, paddingBottom: 100 },

  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 4,
    position: "relative",
  },
  cardContent: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderRadius: 16,
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
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  walletName: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  walletType: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
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
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
  },

  deleteBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    padding: 8,
  },
});

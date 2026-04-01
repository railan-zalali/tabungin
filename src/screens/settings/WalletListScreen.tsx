import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useWalletStore } from '../../store/useWalletStore';
import { formatCurrency } from '../../utils/currency';
import { EmptyState } from '../../components/common/EmptyState';
import type { Wallet } from '../../database/walletQueries';
import { useTheme } from '../../store/useThemeStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ContextBadge } from '../../components/common/ContextBadge';
import type { WalletFlowNavigationProp } from '../../types/navigation';

function resolveWalletIcon(type?: string) {
  if (type === 'bank') return 'bank-outline';
  if (type === 'e-wallet') return 'cellphone';
  if (type === 'cash') return 'cash';
  return 'wallet-outline';
}

export function WalletListScreen() {
  const navigation = useNavigation<WalletFlowNavigationProp>();
  const insets = useSafeAreaInsets();
  const { wallets, loadWallets, removeWallet, isLoading, error } = useWalletStore();
  const { colors, mode, gradients } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallets();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Hapus Dompet',
      `Yakin ingin menghapus "${name}"? Transaksi yang terkait mungkin akan kehilangan referensi dompet.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWallet(id);
            } catch (e: any) {
              Alert.alert('Gagal', e.message || 'Gagal menghapus dompet.');
            }
          },
        },
      ],
    );
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
  const sharedWalletCount = wallets.filter((wallet) => wallet.profile_id && wallet.profile_id !== activeProfileId).length;

  const renderItem = ({ item }: { item: Wallet }) => {
    const iconName = resolveWalletIcon(item.type);
    const itemColor = item.color || colors.primary;
    const isSharedWallet = Boolean(item.profile_id && item.profile_id !== activeProfileId);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AddWallet', { wallet: item })}
        style={styles.cardContainer}
      >
        <View style={[styles.cardContent, { borderLeftColor: itemColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.walletInfo}>
              <View style={[styles.iconBox, { backgroundColor: `${itemColor}16` }]}>
                <MaterialCommunityIcons name={iconName as any} size={24} color={itemColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.walletName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name || 'Dompet Tanpa Nama'}
                </Text>
                <Text style={[styles.walletType, { color: colors.textSecondary }]}>
                  {item.type ? item.type.toUpperCase() : 'GENERAL'}
                </Text>
                {isSharedWallet ? (
                  <View style={styles.sharedContextWrap}>
                    <ContextBadge icon="account-group-outline" label="Dompet Bersama" tone="info" />
                  </View>
                ) : null}
              </View>
            </View>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <MaterialCommunityIcons name='star' size={12} color={colors.textInverse} />
                <Text style={styles.defaultText}>Utama</Text>
              </View>
            )}
          </View>

          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Saldo Saat Ini</Text>
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
            <MaterialCommunityIcons name='trash-can-outline' size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <View style={styles.bgAuraBottom} pointerEvents="none" />
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor='transparent'
        translucent
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel='Kembali'
          accessibilityRole='button'
        >
          <MaterialCommunityIcons name='arrow-left' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Daftar Dompet</Text>
          <Text style={styles.subtitle}>Kelola saldo pribadi dan dompet bersama dalam satu tempat.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('QRScanner')}
            style={[styles.iconAction, { backgroundColor: colors.surfaceCard }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel='Scan QR Undangan'
            accessibilityRole='button'
          >
            <MaterialCommunityIcons name='qrcode-scan' size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddWallet')}
            style={styles.addBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel='Tambah Dompet Baru'
            accessibilityRole='button'
          >
            <MaterialCommunityIcons name='plus' size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient
        colors={gradients.hero as unknown as [string, string, ...string[]]}
        style={styles.summaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Total Saldo</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalBalance)}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name='wallet-outline' size={28} color={colors.textInverse} />
          </View>
        </View>
        <View style={styles.summaryChipRow}>
          <View style={styles.summaryChip}>
            <MaterialCommunityIcons name='credit-card-multiple-outline' size={14} color={colors.textInverse} />
            <Text style={styles.summaryChipText}>{wallets.length} dompet</Text>
          </View>
          {sharedWalletCount > 0 ? (
            <View style={styles.summaryChip}>
              <MaterialCommunityIcons name='account-group-outline' size={14} color={colors.textInverse} />
              <Text style={styles.summaryChipText}>{sharedWalletCount} bersama</Text>
            </View>
          ) : null}
          <View style={styles.summaryChip}>
            <MaterialCommunityIcons name='shield-account-outline' size={14} color={colors.textInverse} />
            <Text style={styles.summaryChipText}>Aman & sinkron</Text>
          </View>
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name='alert-circle-outline' size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

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
              message='Tambahkan dompet pertama untuk mulai mencatat dan memisahkan arus uang.'
              actionLabel='Tambah Dompet'
              onAction={() => navigation.navigate('AddWallet')}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
      position: 'absolute',
      top: -100,
      right: -30,
      width: 240,
      height: 240,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primaryLight,
      opacity: 0.55,
    },
    bgAuraBottom: {
      position: 'absolute',
      bottom: 120,
      left: -60,
      width: 200,
      height: 200,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.infoBg,
      opacity: 0.26,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    headerCenter: { flex: 1, marginRight: 12 },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    iconAction: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryBg,
      borderWidth: 1,
      borderColor: `${colors.primary}24`,
    },
    title: { ...Typography.h2, color: colors.textPrimary },
    subtitle: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    summaryCard: {
      marginHorizontal: 20,
      marginTop: 8,
      borderRadius: BorderRadius['5xl'],
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 22,
      elevation: 6,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    summaryLabel: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: colors.textInverse,
    },
    summaryAmount: {
      fontFamily: FontFamily.heading,
      fontSize: 30,
      color: colors.textInverse,
      marginTop: 4,
    },
    summaryIcon: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    summaryChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 16,
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    summaryChipText: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: colors.textInverse,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 12,
      padding: 12,
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: `${colors.danger}20`,
    },
    errorText: {
      flex: 1,
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.danger,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, gap: 16, paddingBottom: 100 },
    cardContainer: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius['4xl'],
      marginBottom: 4,
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    cardContent: {
      padding: 18,
      borderLeftWidth: 4,
      borderRadius: BorderRadius['4xl'],
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    walletInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
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
    sharedContextWrap: {
      marginTop: 8,
    },
    defaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
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
      color: colors.textInverse,
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
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

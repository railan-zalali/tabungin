import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatCurrency } from '../../utils/currency';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import type { Wallet } from '../../database/walletQueries';
import type { WalletFlowNavigationProp } from '../../types/navigation';
import { useProfileStore } from '../../store/useProfileStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { resolveWalletContextMeta } from '../../utils/walletContext';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';

function resolveWalletIcon(type?: string) {
    if (type === 'bank') return 'bank-outline';
    if (type === 'e-wallet') return 'cellphone';
    if (type === 'cash') return 'cash';
    return 'wallet-outline';
}

function WalletCard({ item, activeProfileId, onEdit, onDelete }: {
    item: Wallet;
    activeProfileId?: string | null;
    onEdit: (wallet: Wallet) => void;
    onDelete: (wallet: Wallet) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const iconName = resolveWalletIcon(item.type);
    const itemColor = item.color || colors.primary;
    const isSharedWallet = Boolean(item.profile_id && item.profile_id !== activeProfileId);
    const contextMeta = resolveWalletContextMeta(item, activeProfileId);

    return (
        <TouchableOpacity style={styles.walletCard} onPress={() => onEdit(item)} activeOpacity={0.92}>
            <View style={[styles.walletAccent, { backgroundColor: itemColor }]} />
            <View style={styles.walletBody}>
                <View style={styles.walletTopRow}>
                    <View style={[styles.walletIconWrap, { backgroundColor: `${itemColor}18` }]}>
                        <MaterialCommunityIcons name={iconName as any} size={22} color={itemColor} />
                    </View>
                    <View style={styles.walletCopy}>
                        <Text style={styles.walletName}>{item.name || 'Dompet tanpa nama'}</Text>
                        <Text style={styles.walletType}>{item.type ? item.type.toUpperCase() : 'GENERAL'}</Text>
                    </View>
                    {!item.is_default ? (
                        <TouchableOpacity onPress={() => onDelete(item)} style={styles.walletDelete}>
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.walletBadgeRow}>
                    {item.is_default ? <ContextBadge icon="star-outline" label="Utama" tone="warning" /> : null}
                    <ContextBadge icon={contextMeta.icon} label={contextMeta.label} tone={contextMeta.tone} />
                </View>

                <Text style={styles.walletBalanceLabel}>Saldo saat ini</Text>
                <Text style={styles.walletBalance}>{formatCurrency(item.balance || 0)}</Text>
                <Text style={styles.walletContextText}>
                    {isSharedWallet
                        ? 'Dipakai dalam konteks kolaboratif dan bisa memengaruhi aktivitas bersama.'
                        : item.is_default
                          ? 'Dompet ini menjadi konteks default untuk pencatatan harian.'
                          : 'Dompet ini berada di konteks personal profil aktif.'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function WalletListScreen() {
    const navigation = useNavigation<WalletFlowNavigationProp>();
    const { colors } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { wallets, loadWallets, removeWallet, error } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadWallets();
    }, [loadWallets]);

    const totalBalance = useMemo(() => wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0), [wallets]);
    const sharedWalletCount = useMemo(
        () => wallets.filter((wallet) => wallet.profile_id && wallet.profile_id !== activeProfileId).length,
        [activeProfileId, wallets],
    );

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadWallets();
        } finally {
            setRefreshing(false);
        }
    };

    const handleDelete = (wallet: Wallet) => {
        Alert.alert(
            'Hapus dompet',
            `Yakin ingin menghapus "${wallet.name}"? Transaksi terkait akan kehilangan referensi dompet.`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeWallet(wallet.id);
                        } catch (deleteError: any) {
                            Alert.alert('Gagal', deleteError.message || 'Dompet belum bisa dihapus.');
                        }
                    },
                },
            ],
        );
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Daftar dompet"
                subtitle="Kelola saldo pribadi dan ruang kolaborasi dari satu pusat akun keuangan."
                showBack
                onBackPress={() => navigation.goBack()}
                rightSlot={
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate('QRScanner')}>
                            <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerIconButton, styles.headerPrimaryButton]} onPress={() => navigation.navigate('AddWallet')}>
                            <MaterialCommunityIcons name="plus" size={22} color={colors.textInverse} />
                        </TouchableOpacity>
                    </View>
                }
                variant="transparent"
            />

            <FlatList
                data={wallets}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.listContent, { paddingBottom: contentBottomSpacing }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={
                    <View style={styles.headerBlock}>
                        <HeroSummaryCard
                            eyebrow="Akun Keuangan"
                            title="Total saldo lintas dompet"
                            value={formatCurrency(totalBalance)}
                            description="Dompet personal dan shared wallet digabung agar konteks keseluruhan tetap mudah dibaca."
                            icon="wallet-outline"
                            badges={
                                <>
                                    <ContextBadge icon="credit-card-multiple-outline" label={`${wallets.length} dompet`} inverse />
                                    {sharedWalletCount > 0 ? (
                                        <ContextBadge icon="account-group-outline" label={`${sharedWalletCount} bersama`} inverse />
                                    ) : null}
                                </>
                            }
                        />

                        {error ? (
                            <EmptyState
                                icon="alert-circle-outline"
                                title="Daftar dompet belum sinkron"
                                description={error}
                                actionLabel="Muat ulang"
                                onAction={onRefresh}
                                tone="danger"
                                compact
                            />
                        ) : null}
                    </View>
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="wallet-outline"
                        title="Belum ada dompet"
                        description="Tambahkan dompet pertama agar saldo, transaksi, dan target punya konteks yang lebih jelas."
                        actionLabel="Tambah dompet"
                        onAction={() => navigation.navigate('AddWallet')}
                    />
                }
                renderItem={({ item }) => (
                    <WalletCard
                        item={item}
                        activeProfileId={activeProfileId}
                        onEdit={(wallet) => navigation.navigate('AddWallet', { wallet })}
                        onDelete={handleDelete}
                    />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        headerActions: {
            flexDirection: 'row',
            gap: 8,
        },
        headerIconButton: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        headerPrimaryButton: {
            backgroundColor: colors.primary,
            borderColor: `${colors.primaryDark}44`,
        },
        listContent: {
            paddingHorizontal: 20,
        },
        headerBlock: {
            gap: 14,
            marginBottom: 16,
        },
        walletCard: {
            flexDirection: 'row',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
        },
        walletAccent: {
            width: 6,
        },
        walletBody: {
            flex: 1,
            padding: 18,
            gap: 10,
        },
        walletTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        walletIconWrap: {
            width: 48,
            height: 48,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        walletCopy: {
            flex: 1,
        },
        walletName: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        walletType: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        walletDelete: {
            width: 36,
            height: 36,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        walletBadgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        walletBalanceLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        walletBalance: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h2,
            color: colors.textPrimary,
        },
        walletContextText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            lineHeight: 18,
        },
    });

import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatCurrency } from '../../utils/currency';
import type { Wallet } from '../../database/walletQueries';
import type { WalletFlowNavigationProp } from '../../types/navigation';
import { useProfileStore } from '../../store/useProfileStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyIllustrationState } from '../../components/common/EmptyIllustrationState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { StatStrip } from '../../components/common/StatStrip';
import { getReadableTextColor } from '../../utils/colorContrast';
import { useResponsiveMetrics } from '../../utils/responsive';
import { getWalletCapabilities } from '../../utils/walletPermissions';
import type { WalletMember } from '../../database/walletQueries';

function resolveWalletIcon(type?: string) {
    if (type === 'bank') return 'bank-outline';
    if (type === 'e-wallet') return 'cellphone';
    if (type === 'cash') return 'cash';
    return 'wallet-outline';
}

const WalletCard = React.memo(function WalletCard({ item, activeProfileId, membershipRole, onEdit, onDelete }: {
    item: Wallet;
    activeProfileId?: string | null;
    membershipRole?: WalletMember['role'] | null;
    onEdit: (wallet: Wallet) => void;
    onDelete: (wallet: Wallet) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const iconName = resolveWalletIcon(item.type);
    const itemColor = item.color || colors.primary;
    const iconForeground = getReadableTextColor(itemColor, {
        light: colors.textInverse,
        dark: colors.textPrimary,
    });
    const capabilities = getWalletCapabilities({ wallet: item, activeProfileId, membershipRole });
    const isSharedWallet = capabilities.isSharedWallet;
    const interactionHint = capabilities.isReadOnly ? 'Buka detail dompet read only' : 'Buka detail atau edit dompet';

    return (
        <TouchableOpacity
            style={styles.walletCard}
            onPress={() => onEdit(item)}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel={`${item.name || 'Dompet tanpa nama'}, saldo ${formatCurrency(item.balance || 0)}`}
            accessibilityHint={interactionHint}
        >
            <View style={[styles.walletAccent, { backgroundColor: itemColor }]} />
            <View style={styles.walletBody}>
                <View style={styles.walletTopRow}>
                    <View style={[styles.walletIconWrap, { backgroundColor: itemColor }]}>
                        <MaterialCommunityIcons name={iconName as any} size={22} color={iconForeground} />
                    </View>
                    <View style={styles.walletCopy}>
                        <Text style={styles.walletName}>{item.name || 'Dompet tanpa nama'}</Text>
                        <Text style={styles.walletType}>{item.type ? item.type.toUpperCase() : 'GENERAL'}</Text>
                    </View>
                    {!item.is_default && capabilities.canDeleteWallet ? (
                        <TouchableOpacity
                            onPress={() => onDelete(item)}
                            style={styles.walletDelete}
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus dompet ${item.name || 'tanpa nama'}`}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.walletBadgeRow}>
                    {item.is_default ? <ContextBadge icon="star-outline" label="Utama" tone="warning" /> : null}
                    {isSharedWallet ? <ContextBadge icon="account-group-outline" label="Dompet bersama" tone="info" /> : null}
                </View>

                <Text style={styles.walletBalanceLabel}>Saldo saat ini</Text>
                <Text style={styles.walletBalance}>{formatCurrency(item.balance || 0)}</Text>
            </View>
        </TouchableOpacity>
    );
});

export function WalletListScreen() {
    const navigation = useNavigation<WalletFlowNavigationProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const { wallets, walletRoles, loadWallets, removeWallet, error } = useWalletStore();
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
                eyebrow="Wallet Hub"
                title="Daftar dompet"
                subtitle="Kelola saldo pribadi dan ruang kolaborasi dari satu pusat akun keuangan."
                showBack
                onBackPress={() => navigation.goBack()}
                rightSlot={
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerIconButton}
                            onPress={() => navigation.navigate('QRScanner')}
                            accessibilityRole="button"
                            accessibilityLabel="Scan QR undangan dompet"
                        >
                            <MaterialCommunityIcons name="qrcode-scan" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.headerIconButton, styles.headerPrimaryButton]}
                            onPress={() => navigation.navigate('AddWallet')}
                            accessibilityRole="button"
                            accessibilityLabel="Tambah dompet baru"
                        >
                            <MaterialCommunityIcons name="plus" size={22} color={colors.textInverse} />
                        </TouchableOpacity>
                    </View>
                }
                variant="transparent"
            />

            <FlashList
                data={wallets}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                    },
                    metrics.widthClass !== 'compact' ? styles.listContentWide : null,
                ]}
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

                        <StatStrip
                            items={[
                                { label: 'Total dompet', value: `${wallets.length}` },
                                { label: 'Shared', value: `${sharedWalletCount}`, valueColor: sharedWalletCount > 0 ? colors.info : colors.textSecondary },
                                { label: 'Total saldo', value: formatCurrency(totalBalance), valueColor: colors.primary },
                            ]}
                            vertical={metrics.widthClass !== 'compact'}
                        />

                        {error ? (
                            <EmptyIllustrationState
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
                    <EmptyIllustrationState
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
                                membershipRole={walletRoles[item.id] ?? null}
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
            borderColor: colors.cardBorder,
        },
        headerPrimaryButton: {
            backgroundColor: colors.primary,
            borderColor: `${colors.primaryDark}44`,
        },
        listContent: {
            paddingBottom: 100,
        },
        listContentWide: {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
        },
        headerBlock: {
            gap: 14,
            marginBottom: 16,
        },
        walletCard: {
            flexDirection: 'row',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
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
    });

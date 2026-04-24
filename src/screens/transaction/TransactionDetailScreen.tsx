import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { formatRupiah } from '../../utils/currency';
import { formatDateLong, formatDateShort } from '../../utils/date';
import { resolveCategoryByKey } from '../../utils/categoryResolver';
import { resolveWalletContextMeta } from '../../utils/walletContext';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import type { TransactionNavigationProp, TransactionStackParamList } from '../../types/navigation';
import type { RouteProp } from '@react-navigation/native';

type DetailRouteProp = RouteProp<TransactionStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'TransactionDetail'>>();
    const route = useRoute<DetailRouteProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { stickyFooterSpacing } = useScreenLayout();
    const { transactions, recentTransactions, removeTransaction } = useTransactionStore();
    const wallets = useWalletStore((state) => state.wallets);
    const loadWallets = useWalletStore((state) => state.loadWallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const categories = useCategoryStore((state) => state.categories);
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const transactionId = route.params.transactionId;

    const transaction =
        transactions.find((item) => item.id === transactionId) ??
        recentTransactions.find((item) => item.id === transactionId);
    const category = transaction ? resolveCategoryByKey(transaction.category, categories) : null;
    const wallet = transaction?.wallet_id ? wallets.find((item) => item.id === transaction.wallet_id) : null;
    const walletContext = resolveWalletContextMeta(wallet, activeProfileId);

    useEffect(() => {
        if (categories.length === 0) {
            loadCategories().catch((error) => console.error('Failed to load categories:', error));
        }
    }, [categories.length, loadCategories]);

    useEffect(() => {
        if (wallets.length === 0) {
            loadWallets().catch((error) => console.error('Failed to load wallets:', error));
        }
    }, [loadWallets, wallets.length]);

    const detailItems = useMemo(() => {
        if (!transaction) return [];

        return [
            {
                label: 'Kategori',
                value: category?.name ?? transaction.category,
                icon: category?.icon ?? 'tag-outline',
                tone: 'primary' as const,
            },
            {
                label: 'Tanggal',
                value: formatDateLong(transaction.date),
                icon: 'calendar-outline',
                tone: 'info' as const,
            },
            {
                label: 'Dompet',
                value: wallet?.name ?? 'Tidak terhubung',
                icon: walletContext.icon,
                tone: walletContext.tone,
                meta: walletContext.description,
            },
            {
                label: 'Catatan',
                value: transaction.note?.trim() ? transaction.note : 'Tidak ada catatan tambahan',
                icon: 'note-text-outline',
                tone: 'neutral' as const,
            },
        ];
    }, [category?.icon, category?.name, transaction, wallet?.name, walletContext.description, walletContext.icon, walletContext.tone]);

    if (!transaction) {
        return (
            <ScreenShell topInset={false} bottomInset={false} surfaceVariant="alt">
                <AppScreenHeader
                    title="Detail transaksi"
                    subtitle="Transaksi ini sudah tidak tersedia atau belum ikut tersinkron."
                    showBack
                    onBackPress={() => navigation.goBack()}
                    variant="transparent"
                />
                <View style={styles.emptyWrap}>
                    <EmptyState
                        icon="file-search-outline"
                        title="Transaksi tidak ditemukan"
                        description="Kembali ke daftar transaksi lalu pilih item lain yang masih tersedia."
                        actionLabel="Kembali"
                        onAction={() => navigation.goBack()}
                    />
                </View>
            </ScreenShell>
        );
    }

    const isIncome = transaction.type === 'income';
    const amountColor = isIncome ? colors.success : colors.danger;

    const handleDelete = () => {
        Alert.alert('Hapus transaksi', 'Yakin ingin menghapus transaksi ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus',
                style: 'destructive',
                onPress: async () => {
                    await removeTransaction(transaction.id);
                    navigation.goBack();
                },
            },
        ]);
    };

    return (
        <ScreenShell topInset={false} bottomInset={false} surfaceVariant="alt">
            <AppScreenHeader
                title="Detail transaksi"
                subtitle="Tinjau konteks transaksi ini sebelum mengubah atau menghapusnya."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'pencil-outline',
                    label: 'Edit transaksi',
                    onPress: () => navigation.navigate('AddTransaction', { editId: transaction.id }),
                }}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: stickyFooterSpacing + 28 }]}
            >
                <ContentPanel style={styles.heroPanel}>
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroCopy}>
                            <Text style={styles.eyebrow}>{isIncome ? 'Pemasukan tercatat' : 'Pengeluaran tercatat'}</Text>
                            <Text style={styles.heroTitle}>{category?.name ?? transaction.category}</Text>
                            <Text style={styles.heroDate}>{formatDateShort(transaction.date)}</Text>
                        </View>
                        <View style={[styles.heroIconWrap, { backgroundColor: isIncome ? colors.successBg : colors.dangerBg }]}>
                            <MaterialCommunityIcons
                                name={(category?.icon ?? 'cash') as any}
                                size={26}
                                color={amountColor}
                            />
                        </View>
                    </View>

                    <Text style={[styles.heroAmount, { color: amountColor }]}>
                        {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                    </Text>

                    <View style={styles.badgeRow}>
                        <ContextBadge
                            icon={isIncome ? 'trending-up' : 'trending-down'}
                            label={isIncome ? 'Pemasukan' : 'Pengeluaran'}
                            tone={isIncome ? 'success' : 'warning'}
                        />
                        <ContextBadge icon={walletContext.icon} label={walletContext.label} tone={walletContext.tone} />
                    </View>
                </ContentPanel>

                <ContentPanel compact>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Nominal</Text>
                            <Text style={[styles.summaryValue, { color: amountColor }]}>
                                {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                            </Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tanggal</Text>
                            <Text style={styles.summaryValue}>{formatDateLong(transaction.date)}</Text>
                        </View>
                    </View>
                </ContentPanel>

                <ContentPanel compact>
                    <SectionHeader
                        title="Rincian penting"
                        subtitle="Semua informasi yang membuat transaksi ini terbaca jelas saat ditinjau ulang."
                    />
                    <View style={styles.detailList}>
                        {detailItems.map((item, index) => (
                            <View key={item.label}>
                                <View style={styles.detailRow}>
                                    <View
                                        style={[
                                            styles.detailIcon,
                                            item.tone === 'primary'
                                                ? { backgroundColor: colors.primaryBg }
                                                : item.tone === 'info'
                                                  ? { backgroundColor: colors.infoBg }
                                                  : item.tone === 'warning'
                                                    ? { backgroundColor: colors.warningBg }
                                                    : { backgroundColor: colors.surfaceAlt },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={item.icon as any}
                                            size={18}
                                            color={
                                                item.tone === 'primary'
                                                    ? colors.primary
                                                    : item.tone === 'info'
                                                      ? colors.info
                                                      : item.tone === 'warning'
                                                        ? colors.warning
                                                        : colors.textSecondary
                                            }
                                        />
                                    </View>
                                    <View style={styles.detailCopy}>
                                        <Text style={styles.detailLabel}>{item.label}</Text>
                                        <Text style={styles.detailValue}>{item.value}</Text>
                                        {item.meta ? <Text style={styles.detailMeta}>{item.meta}</Text> : null}
                                    </View>
                                </View>
                                {index < detailItems.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                    </View>
                </ContentPanel>
            </ScrollView>

            <PrimaryActionBar
                primaryLabel="Edit transaksi"
                onPrimaryPress={() => navigation.navigate('AddTransaction', { editId: transaction.id })}
                secondaryLabel="Hapus"
                onSecondaryPress={handleDelete}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        emptyWrap: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingBottom: 80,
        },
        content: {
            paddingHorizontal: 20,
            gap: 16,
        },
        heroPanel: {
            gap: 16,
        },
        heroTopRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        heroCopy: { flex: 1 },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.45,
        },
        heroTitle: {
            ...Typography.h3,
            color: colors.textPrimary,
            marginTop: 4,
        },
        heroDate: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 4,
        },
        heroIconWrap: {
            width: 52,
            height: 52,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        heroAmount: {
            fontFamily: FontFamily.heading,
            fontSize: 34,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        summaryRow: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        summaryItem: {
            flex: 1,
            gap: 4,
        },
        summaryDivider: {
            width: 1,
            marginHorizontal: 14,
            backgroundColor: colors.divider,
        },
        summaryLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        summaryValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        detailList: {
            gap: 0,
        },
        detailRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            paddingVertical: 14,
        },
        detailIcon: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        detailCopy: {
            flex: 1,
        },
        detailLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        detailValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginTop: 2,
            lineHeight: 22,
        },
        detailMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textTertiary,
            marginTop: 4,
            lineHeight: 18,
        },
        divider: {
            height: 1,
            marginLeft: 52,
            backgroundColor: colors.divider,
        },
    });

import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatDateLong, formatDateShort } from '../../utils/date';
import { formatRupiah } from '../../utils/currency';
import { resolveCategoryByKey } from '../../utils/categoryResolver';
import { useTheme } from '../../store/useThemeStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyIllustrationState } from '../../components/common/EmptyIllustrationState';
import { FormSection } from '../../components/common/FormSection';
import { InfoRow } from '../../components/common/InfoRow';
import { InlineNotice } from '../../components/common/InlineNotice';
import { MetricCard } from '../../components/common/MetricCard';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';

export function TransactionDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { transactions, recentTransactions, removeTransaction } = useTransactionStore();
    const wallets = useWalletStore((state) => state.wallets);
    const loadWallets = useWalletStore((state) => state.loadWallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const categories = useCategoryStore((state) => state.categories);
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const transactionId = route.params?.transactionId;

    const transaction = transactions.find((item) => item.id === transactionId) ?? recentTransactions.find((item) => item.id === transactionId);
    const category = transaction ? resolveCategoryByKey(transaction.category, categories) : null;
    const wallet = transaction?.wallet_id ? wallets.find((item) => item.id === transaction.wallet_id) : null;
    const isSharedWallet = Boolean(wallet?.profile_id && wallet.profile_id !== activeProfileId);

    useEffect(() => {
        if (categories.length === 0) {
            loadCategories();
        }
    }, [categories.length, loadCategories]);

    useEffect(() => {
        if (wallets.length === 0) {
            loadWallets();
        }
    }, [loadWallets, wallets.length]);

    if (!transaction) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader eyebrow="Transaction Detail" title="Detail Transaksi" subtitle="Data transaksi tidak tersedia lagi di daftar aktif." showBack onBackPress={() => navigation.goBack()} />
                <View style={[styles.emptyWrap, { paddingHorizontal: metrics.horizontalPadding }]}>
                    <EmptyIllustrationState
                        icon="file-search-outline"
                        title="Transaksi tidak ditemukan"
                        description="Data transaksi yang kamu cari sudah tidak tersedia atau belum tersinkron."
                        actionLabel="Kembali"
                        onAction={() => navigation.goBack()}
                    />
                </View>
            </ScreenShell>
        );
    }

    const isIncome = transaction.type === 'income';
    const amountColor = isIncome ? colors.success : colors.danger;

    const detailItems = [
        {
            label: 'Kategori',
            value: category?.name ?? transaction.category,
            icon: category?.icon ?? 'tag-outline',
        },
        {
            label: 'Tanggal',
            value: formatDateLong(transaction.date),
            icon: 'calendar-outline',
        },
        {
            label: 'Dompet',
            value: wallet ? wallet.name : 'Tidak terhubung',
            icon: isSharedWallet ? 'account-group-outline' : 'wallet-outline',
            meta: wallet ? (isSharedWallet ? 'Shared wallet' : 'Personal wallet') : 'Opsional',
        },
        {
            label: 'Catatan',
            value: transaction.note?.trim() ? transaction.note : 'Tidak ada catatan tambahan',
            icon: 'note-text-outline',
        },
    ];

    const handleEdit = () => navigation.navigate('AddTransaction', { editId: transaction.id });

    const handleDelete = () => {
        Alert.alert('Hapus Transaksi', 'Yakin ingin menghapus transaksi ini?', [
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
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                eyebrow="Transaction Detail"
                title="Detail Transaksi"
                subtitle="Ringkasan transaksi dengan konteks kategori, tanggal, dan dompet."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'pencil-outline',
                    label: 'Edit transaksi',
                    onPress: handleEdit,
                }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.floatingActionClearance + 24,
                    },
                ]}
            >
                <LinearGradient
                    colors={isIncome ? [colors.success, colors.primaryDark, colors.success] : [colors.danger, colors.primaryDark, colors.danger]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroTopRow}>
                        <View style={styles.heroIcon}>
                            <MaterialCommunityIcons name={(category?.icon ?? 'cash') as any} size={30} color={colors.textInverse} />
                        </View>
                        <View style={styles.heroCopy}>
                            <Text style={styles.heroCategory}>{category?.name ?? transaction.category}</Text>
                            <Text style={styles.heroDate}>{formatDateShort(transaction.date)}</Text>
                        </View>
                    </View>

                    <Text style={styles.heroAmount}>
                        {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                    </Text>

                    <View style={styles.badgeRow}>
                        <ContextBadge icon={isIncome ? 'trending-up' : 'trending-down'} label={isIncome ? 'Pemasukan' : 'Pengeluaran'} inverse />
                        {wallet ? (
                            <ContextBadge icon={isSharedWallet ? 'account-group-outline' : 'wallet-outline'} label={wallet.name} inverse />
                        ) : null}
                    </View>
                </LinearGradient>

                <FormSection
                    eyebrow="Key Snapshot"
                    title="Ringkasan cepat"
                    subtitle="Dua informasi yang paling sering dicek sebelum memutuskan edit atau hapus."
                    variant="highlight"
                >
                    <View style={styles.metricGrid}>
                        <MetricCard
                            label="Nominal"
                            value={`${isIncome ? '+' : '-'} ${formatRupiah(transaction.amount)}`}
                            icon="cash"
                            tone={isIncome ? 'success' : 'danger'}
                        />
                        <MetricCard
                            label="Tanggal"
                            value={formatDateShort(transaction.date)}
                            icon="calendar-check-outline"
                            tone="primary"
                        />
                    </View>
                </FormSection>

                <FormSection
                    eyebrow="Context"
                    title="Rincian transaksi"
                    subtitle="Informasi lengkap yang membantu kamu membaca konteks sebelum melakukan perubahan."
                    density="compact"
                >
                    <View style={styles.detailList}>
                        {detailItems.map((item, index) => (
                            <View key={item.label}>
                                <InfoRow
                                    icon={item.icon}
                                    label={item.label}
                                    value={item.value}
                                    tone={item.label === 'Dompet' ? 'primary' : 'neutral'}
                                />
                                {item.meta ? <Text style={styles.detailMeta}>{item.meta}</Text> : null}
                                {index < detailItems.length - 1 ? <View style={styles.divider} /> : null}
                            </View>
                        ))}
                    </View>
                </FormSection>

                <InlineNotice
                    icon={isIncome ? 'trending-up' : 'trending-down'}
                    title={isIncome ? 'Pemasukan tercatat' : 'Pengeluaran tercatat'}
                    description={isSharedWallet
                        ? 'Transaksi ini terhubung ke shared wallet, jadi perubahan nominal akan memengaruhi konteks kolaborasi dan histori bersama.'
                        : 'Transaksi ini terhubung ke dompet personal, jadi perubahan akan langsung memengaruhi ringkasan saldo dan laporan periodik.'}
                    tone={isIncome ? 'success' : 'warning'}
                />
            </ScrollView>

            <PrimaryActionBar
                primaryLabel="Edit Transaksi"
                onPrimaryPress={handleEdit}
                secondaryLabel="Hapus"
                onSecondaryPress={handleDelete}
                bottomInset={metrics.tabBarClearance}
            />
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        emptyWrap: {
            flex: 1,
            justifyContent: 'center',
            paddingTop: 20,
        },
        content: {
            gap: 18,
            paddingTop: 20,
        },
        heroCard: {
            borderRadius: BorderRadius['5xl'],
            padding: 24,
            gap: 16,
            overflow: 'hidden',
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        heroIcon: {
            width: 58,
            height: 58,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        heroCopy: {
            flex: 1,
        },
        heroCategory: {
            ...Typography.h4,
            color: colors.textInverse,
        },
        heroDate: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 2,
        },
        heroAmount: {
            fontFamily: FontFamily.heading,
            fontSize: 32,
            color: colors.textInverse,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        summaryRow: {
            gap: 12,
        },
        metricGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        summaryItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['2xl'],
            padding: 14,
        },
        summaryCopy: {
            flex: 1,
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
            marginTop: 3,
        },
        detailList: {
            gap: 0,
        },
        detailMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textTertiary,
            marginTop: 8,
            marginLeft: 48,
        },
        divider: {
            height: 1,
            backgroundColor: colors.divider,
            marginLeft: 48,
            marginTop: 14,
        },
    });

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../store/useThemeStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import { resolveCategoryByKey } from '../../utils/categoryResolver';
import { formatRupiah } from '../../utils/currency';
import { formatDateLong, formatDateShort } from '../../utils/date';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';

export function TransactionDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { transactions, recentTransactions, removeTransaction } = useTransactionStore();
    const wallets = useWalletStore((state) => state.wallets);
    const loadWallets = useWalletStore((state) => state.loadWallets);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const categories = useCategoryStore((state) => state.categories);
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const transactionId = route.params?.transactionId;

    const transaction = transactions.find((t) => t.id === transactionId)
        ?? recentTransactions.find((t) => t.id === transactionId);
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

    const detailItems = useMemo(() => {
        if (!transaction) return [];

        return [
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
                icon: wallet?.profile_id && wallet.profile_id !== activeProfileId ? 'account-group-outline' : 'wallet-outline',
                meta: wallet ? (isSharedWallet ? 'Shared wallet' : 'Personal wallet') : 'Opsional',
            },
            {
                label: 'Catatan',
                value: transaction.note?.trim() ? transaction.note : 'Tidak ada catatan tambahan',
                icon: 'note-text-outline',
            },
        ];
    }, [activeProfileId, category?.icon, category?.name, isSharedWallet, transaction, wallet]);

    if (!transaction) {
        return (
            <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
                <EmptyState
                    icon="file-search-outline"
                    title="Transaksi tidak ditemukan"
                    description="Data transaksi yang kamu cari sudah tidak tersedia atau belum tersinkron."
                    actionLabel="Kembali"
                    onAction={() => navigation.goBack()}
                    style={styles.emptyState}
                />
            </SafeAreaView>
        );
    }

    const isIncome = transaction.type === 'income';
    const amountColor = isIncome ? colors.success : colors.danger;

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
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <View style={styles.bgAuraBottom} pointerEvents="none" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.iconBtn}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Kembali"
                >
                    <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} allowFontScaling accessibilityRole="header">
                        Detail Transaksi
                    </Text>
                    <Text style={styles.headerSubtitle} allowFontScaling>
                        Ringkasan cepat untuk membaca konteks dan aksi berikutnya
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleEdit}
                    style={styles.iconBtn}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Edit transaksi"
                >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(40).springify()}>
                    <LinearGradient
                        colors={isIncome ? [colors.success, colors.primaryDark, colors.success] : [colors.danger, colors.primaryDark, colors.danger]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroGlow} />
                        <View style={styles.heroTopRow}>
                            <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                                <MaterialCommunityIcons
                                    name={(category?.icon ?? 'cash') as any}
                                    size={34}
                                    color={colors.textInverse}
                                    accessibilityElementsHidden
                                />
                            </View>
                            <View style={styles.heroMeta}>
                                <Text style={styles.heroCategory}>{category?.name ?? transaction.category}</Text>
                                <Text style={styles.heroDate}>{formatDateShort(transaction.date)}</Text>
                            </View>
                        </View>

                        <Text style={styles.heroAmount} accessibilityLiveRegion="polite">
                            {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                        </Text>

                        <View style={styles.chipRow}>
                            <View style={styles.typeChip}>
                                <MaterialCommunityIcons
                                    name={isIncome ? 'trending-up' : 'trending-down'}
                                    size={14}
                                    color={colors.textInverse}
                                    accessibilityElementsHidden
                                />
                                <Text style={styles.typeChipText}>{isIncome ? 'Pemasukan' : 'Pengeluaran'}</Text>
                            </View>
                            {wallet && (
                                <View style={styles.typeChip}>
                                    <MaterialCommunityIcons
                                        name={isSharedWallet ? 'account-group-outline' : 'wallet-outline'}
                                        size={14}
                                        color={colors.textInverse}
                                        accessibilityElementsHidden
                                    />
                                    <Text style={styles.typeChipText}>{wallet.name}</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="cash" size={18} color={amountColor} />
                        <View style={styles.summaryTextWrap}>
                            <Text style={styles.summaryLabel}>Nominal</Text>
                            <Text style={[styles.summaryValue, { color: amountColor }]}>
                                {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="calendar-check-outline" size={18} color={colors.primary} />
                        <View style={styles.summaryTextWrap}>
                            <Text style={styles.summaryLabel}>Tanggal</Text>
                            <Text style={styles.summaryValue}>{formatDateLong(transaction.date)}</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.detailCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Rincian</Text>
                        <Text style={styles.sectionSubtitle}>Informasi yang membantu kamu meninjau transaksi</Text>
                    </View>
                    {detailItems.map((item, index) => (
                        <View key={item.label}>
                            <View style={styles.detailRow}>
                                <View style={styles.detailIcon}>
                                    <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.primary} />
                                </View>
                                <View style={styles.detailInfo}>
                                    <Text style={styles.detailLabel}>{item.label}</Text>
                                    <Text style={styles.detailValue}>{item.value}</Text>
                                    {item.meta ? <Text style={styles.detailMeta}>{item.meta}</Text> : null}
                                </View>
                            </View>
                            {index < detailItems.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(220).springify()} style={styles.actionCard}>
                    <View style={styles.actionCopy}>
                        <Text style={styles.sectionTitle}>Aksi cepat</Text>
                        <Text style={styles.sectionSubtitle}>Perbarui jika ada koreksi atau hapus jika sudah tidak relevan.</Text>
                    </View>
                    <View style={styles.actionRow}>
                        <Button
                            label="Edit Transaksi"
                            onPress={handleEdit}
                            variant="primary"
                            fullWidth
                        />
                        <Button
                            label="Hapus"
                            onPress={handleDelete}
                            variant="danger"
                            fullWidth
                        />
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -100,
        right: -40,
        width: 220,
        height: 220,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryLight,
        opacity: 0.45,
    },
    bgAuraBottom: {
        position: 'absolute',
        bottom: -120,
        left: -60,
        width: 260,
        height: 260,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.successBg,
        opacity: 0.32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    iconBtn: {
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
    headerCenter: { flex: 1 },
    headerTitle: { ...Typography.h3, color: colors.textPrimary },
    headerSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    content: { padding: 20, gap: 16, paddingBottom: 36 },
    heroCard: {
        borderRadius: 30,
        padding: 24,
        overflow: 'hidden',
        gap: 16,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 6,
    },
    heroGlow: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: BorderRadius.full,
        top: -58,
        right: -24,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heroIcon: {
        width: 62,
        height: 62,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    heroMeta: { flex: 1, gap: 2 },
    heroCategory: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: colors.textInverse,
    },
    heroDate: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.82)',
    },
    heroAmount: {
        fontFamily: FontFamily.heading,
        fontSize: 34,
        color: colors.textInverse,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    typeChipText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textInverse,
    },
    summaryCard: {
        flexDirection: 'row',
        gap: 12,
        padding: 18,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    summaryTextWrap: { flex: 1 },
    summaryLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        marginTop: 2,
    },
    detailCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    sectionHeader: {
        padding: 18,
        paddingBottom: 14,
    },
    sectionTitle: {
        ...Typography.h4,
        color: colors.textPrimary,
    },
    sectionSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        marginTop: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryBg,
    },
    detailInfo: { flex: 1 },
    detailLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    detailValue: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        marginTop: 3,
        lineHeight: 22,
    },
    detailMeta: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textTertiary,
        marginTop: 3,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: 72,
    },
    actionCard: {
        gap: 14,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    actionCopy: { gap: 2 },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    emptyState: {
        marginHorizontal: 20,
    },
});

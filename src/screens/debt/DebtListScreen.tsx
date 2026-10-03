// Daftar utang & piutang dengan filter.
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BorderRadius } from '../../constants/theme';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useDebtStore } from '../../store/useDebtStore';
import { useTheme } from '../../store/useThemeStore';
import { formatCurrency } from '../../utils/currency';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { DebtCard } from '../../components/debt/DebtCard';
import type { TransactionNavigationProp } from '../../types/navigation';

type FilterTab = 'all' | 'debt' | 'receivable' | 'paid';

const EMPTY_COPY: Record<FilterTab, { title: string; description: string }> = {
    all: {
        title: 'Belum ada utang maupun piutang',
        description: 'Catat utang atau piutang supaya sisa kewajiban dan temannya tidak terlupakan.',
    },
    debt: {
        title: 'Belum ada utang aktif',
        description: 'Utang yang sedang berjalan akan muncul di sini beserta jatuh temponya.',
    },
    receivable: {
        title: 'Belum ada piutang aktif',
        description: 'Uang yang dipinjamkan ke orang lain akan terpantau di sini.',
    },
    paid: {
        title: 'Belum ada yang lunas',
        description: 'Utang atau piutang yang sudah selesai dibayar akan tersimpan di sini.',
    },
};

export function DebtListScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'DebtList'>>();
    const { colors } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { debts, isLoading, summary, loadDebts, loadSummary } = useDebtStore();
    const [filterTab, setFilterTab] = useState<FilterTab>('all');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDebts();
        loadSummary();
    }, [loadDebts, loadSummary]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadDebts(), loadSummary()]);
        } finally {
            setRefreshing(false);
        }
    };

    const visibleDebts = debts.filter((debt) => {
        switch (filterTab) {
            case 'debt':
                return debt.type === 'debt' && debt.status === 'active';
            case 'receivable':
                return debt.type === 'receivable' && debt.status === 'active';
            case 'paid':
                return debt.status === 'paid';
            case 'all':
            default:
                return true;
        }
    });

    const activeDebts = debts.filter((debt) => debt.status === 'active');
    const activeDebtCount = activeDebts.filter((debt) => debt.type === 'debt').length;
    const activeReceivableCount = activeDebts.filter((debt) => debt.type === 'receivable').length;
    const paidCount = debts.filter((debt) => debt.status === 'paid').length;
    const overdueCount = summary?.overdueCount ?? 0;

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Utang & Piutang"
                subtitle="Pantau sisa kewajiban, piutang teman, dan mana yang sudah lewat jatuh tempo."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'plus',
                    label: 'Catat utang',
                    onPress: () => navigation.navigate('AddDebt'),
                }}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                <Animated.View entering={FadeInDown.delay(60).springify()}>
                    <HeroSummaryCard
                        eyebrow="Ringkasan Utang & Piutang"
                        title="Sisa utang yang harus dibayar"
                        value={formatCurrency(summary?.totalDebt ?? 0)}
                        description={
                            (summary?.totalReceivable ?? 0) > 0
                                ? `Dan ${formatCurrency(summary?.totalReceivable ?? 0)} masih dipinjamkan ke orang lain.`
                                : 'Belum ada piutang berjalan. Fokus menutup sisa utang dulu.'
                        }
                        icon="hand-coin-outline"
                        tone={overdueCount > 0 ? 'warning' : 'primary'}
                        badges={
                            <>
                                <ContextBadge icon="bullseye-arrow" label={`${summary?.activeCount ?? 0} aktif`} inverse />
                                <ContextBadge icon="check-circle-outline" label={`${paidCount} lunas`} inverse />
                                {overdueCount > 0 ? (
                                    <ContextBadge icon="alert-circle-outline" label={`${overdueCount} terlambat`} inverse />
                                ) : null}
                            </>
                        }
                        stats={[
                            { label: 'Piutang', value: formatCurrency(summary?.totalReceivable ?? 0), icon: 'arrow-down' },
                            { label: 'Terlambat', value: String(overdueCount), icon: 'alert' },
                        ]}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.filterBlock}>
                    <SectionHeader
                        title="Fokus tampilan"
                        subtitle="Saring berdasarkan arah uang atau status pelunasan."
                    />
                    <SegmentedControl
                        value={filterTab}
                        onChange={setFilterTab}
                        scrollable
                        options={[
                            { id: 'all', label: 'Semua', count: debts.length },
                            { id: 'debt', label: 'Utang', count: activeDebtCount },
                            { id: 'receivable', label: 'Piutang', count: activeReceivableCount },
                            { id: 'paid', label: 'Selesai', count: paidCount },
                        ]}
                    />
                </Animated.View>

                {isLoading && !refreshing ? (
                    <View style={styles.listWrap}>
                        <View style={styles.skeletonPlaceholder} />
                        <View style={styles.skeletonPlaceholder} />
                    </View>
                ) : visibleDebts.length === 0 ? (
                    <Animated.View entering={FadeInUp.delay(180).springify()}>
                        <EmptyState
                            icon={filterTab === 'paid' ? 'check-circle-outline' : 'hand-coin-outline'}
                            title={EMPTY_COPY[filterTab].title}
                            description={EMPTY_COPY[filterTab].description}
                            actionLabel={filterTab === 'paid' ? undefined : 'Catat utang'}
                            onAction={
                                filterTab === 'paid' ? undefined : () => navigation.navigate('AddDebt')
                            }
                        />
                    </Animated.View>
                ) : (
                    <View style={styles.listWrap}>
                        {visibleDebts.map((debt, index) => (
                            <DebtCard
                                key={debt.id}
                                debt={debt}
                                animationDelay={index * 70}
                                onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        filterBlock: {
            gap: 14,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        listWrap: {
            gap: 12,
        },
        skeletonPlaceholder: {
            height: 148,
            borderRadius: 24,
            backgroundColor: colors.surfaceMuted,
            opacity: 0.5,
        },
    });

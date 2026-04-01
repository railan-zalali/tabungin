import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import type { CategorySummary, MonthlySummary } from '../../types/transaction';
import { resolveCategoryByKey } from '../../utils/categoryResolver';
import { formatCurrency } from '../../utils/currency';
import { ContextBadge } from '../../components/common/ContextBadge';
import { SectionHeader } from '../../components/common/SectionHeader';

type PeriodFilter = 'month' | '3months' | '6months' | 'year';

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
    { id: 'month', label: 'Bulan ini' },
    { id: '3months', label: '3 Bulan' },
    { id: '6months', label: '6 Bulan' },
    { id: 'year', label: 'Tahun ini' },
];

function getPeriodDates(period: PeriodFilter): { start: number; end: number } {
    const now = new Date();
    const end = now.getTime();
    const start = new Date();
    if (period === 'month') start.setDate(1);
    else if (period === '3months') start.setMonth(start.getMonth() - 3);
    else if (period === '6months') start.setMonth(start.getMonth() - 6);
    else {
        start.setMonth(0);
        start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end };
}

export function ReportScreen() {
    const insets = useSafeAreaInsets();
    const { colors, gradients, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { getCategorySummary, getMonthlyData } = useTransactionStore();
    const { categories, loadCategories } = useCategoryStore();
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [expenseCategories, setExpenseCategories] = useState<CategorySummary[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<CategorySummary[]>([]);
    const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const totalIncome = incomeCategories.reduce((sum, item) => sum + item.total, 0);
    const totalExpense = expenseCategories.reduce((sum, item) => sum + item.total, 0);
    const netBalance = totalIncome - totalExpense;
    const maxMonthly = Math.max(...monthlyData.map((d) => Math.max(d.totalIncome, d.totalExpense)), 1);

    useEffect(() => {
        loadData();
    }, [period]);

    useEffect(() => {
        if (categories.length === 0) {
            loadCategories();
        }
    }, [categories.length, loadCategories]);

    const loadData = async () => {
        setIsLoading(true);
        const { start, end } = getPeriodDates(period);
        const [exp, inc, monthly] = await Promise.all([
            getCategorySummary('expense', start, end),
            getCategorySummary('income', start, end),
            getMonthlyData(),
        ]);
        setExpenseCategories(exp);
        setIncomeCategories(inc);
        setMonthlyData(monthly);
        setIsLoading(false);
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const htmlContent = generateHTMLReport(expenseCategories, incomeCategories, totalIncome, totalExpense, period);
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ekspor Laporan Tabungin' });
            }
        } catch (e) {
            console.error('Export gagal:', e);
        } finally {
            setIsExporting(false);
        }
    };

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Laporan</Text>
                    <Text style={styles.headerSubtitle}>Insight ringkas untuk membaca ritme keuanganmu</Text>
                </View>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF} disabled={isExporting}>
                    {isExporting ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="file-pdf-box" size={20} color={colors.primary} />
                            <Text style={styles.exportText}>PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(70).springify()}>
                    <LinearGradient
                        colors={gradients.hero as unknown as [string, string, ...string[]]}
                        style={styles.heroCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.heroGlow} />
                        <Text style={styles.heroLabel}>Ringkasan Periode</Text>
                        <Text style={styles.heroValue}>{formatCurrency(Math.abs(netBalance))}</Text>
                        <Text style={styles.heroSubtext}>
                            {netBalance >= 0 ? 'Surplus kas pada periode terpilih' : 'Defisit kas pada periode terpilih'}
                        </Text>
                        <View style={styles.heroChips}>
                            <View style={styles.heroChip}>
                                <MaterialCommunityIcons name="arrow-up-circle-outline" size={14} color={colors.textInverse} />
                                <Text style={styles.heroChipText}>{formatCurrency(totalIncome)}</Text>
                            </View>
                            <View style={styles.heroChip}>
                                <MaterialCommunityIcons name="arrow-down-circle-outline" size={14} color={colors.textInverse} />
                                <Text style={styles.heroChipText}>{formatCurrency(totalExpense)}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.periodBlock}>
                    <SectionHeader
                        title="Pilih Periode"
                        subtitle="Ubah snapshot, tren, dan breakdown sesuai horizon yang ingin kamu baca."
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
                        {PERIOD_OPTIONS.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.periodChip, period === item.id && styles.periodChipActive]}
                                onPress={() => setPeriod(item.id)}
                            >
                                <Text style={[styles.periodChipText, period === item.id && styles.periodChipTextActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <View style={styles.insightIcon}>
                            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightTitle}>Insight Cepat</Text>
                            <Text style={styles.insightSubtitle}>
                                {expenseCategories[0]
                                    ? `Kategori terbesar saat ini adalah ${resolveCategoryByKey(expenseCategories[0].category, categories)?.name ?? expenseCategories[0].category}.`
                                    : 'Belum ada pengeluaran yang cukup untuk dianalisis.'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.insightBadgeRow}>
                        <ContextBadge
                            icon={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                            label={netBalance >= 0 ? 'Surplus' : 'Defisit'}
                            tone={netBalance >= 0 ? 'success' : 'warning'}
                        />
                        <ContextBadge icon="calendar-range" label={PERIOD_OPTIONS.find((item) => item.id === period)?.label || 'Bulan ini'} tone="neutral" />
                    </View>
                    <View style={styles.insightChipRow}>
                        <View style={styles.insightChip}>
                            <Text style={styles.insightChipValue}>
                                {totalIncome > 0 ? `${Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100).toFixed(0)}%` : '0%'}
                            </Text>
                            <Text style={styles.insightChipLabel}>Saving rate</Text>
                        </View>
                        <View style={styles.insightChip}>
                            <Text style={styles.insightChipValue}>{expenseCategories.length}</Text>
                            <Text style={styles.insightChipLabel}>Kategori aktif</Text>
                        </View>
                    </View>
                </Animated.View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
                ) : (
                    <>
                        <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <View style={styles.summaryIconRow}>
                                        <MaterialCommunityIcons name="arrow-up-circle" size={20} color={colors.success} />
                                        <Text style={[styles.summaryLabel, { color: colors.success }]}>Pemasukan</Text>
                                    </View>
                                    <Text style={styles.summaryAmount}>{formatCurrency(totalIncome)}</Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <View style={styles.summaryIconRow}>
                                        <MaterialCommunityIcons name="arrow-down-circle" size={20} color={colors.danger} />
                                        <Text style={[styles.summaryLabel, { color: colors.danger }]}>Pengeluaran</Text>
                                    </View>
                                    <Text style={[styles.summaryAmount, { color: colors.danger }]}>{formatCurrency(totalExpense)}</Text>
                                </View>
                            </View>
                            <View style={styles.summaryBalance}>
                                <Text style={styles.balanceLabel}>Selisih</Text>
                                <Text style={[styles.balanceAmount, { color: netBalance >= 0 ? colors.success : colors.danger }]}>
                                    {netBalance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(netBalance))}
                                </Text>
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.chartCard}>
                            <SectionHeader
                                title="Pemasukan vs Pengeluaran"
                                subtitle="6 bulan terakhir untuk membaca ritme naik-turun kas."
                            />
                            <View style={styles.barChart}>
                                {monthlyData.map((month, idx) => (
                                    <View key={idx} style={styles.barGroup}>
                                        <View style={styles.barsRow}>
                                            <View
                                                style={[
                                                    styles.bar,
                                                    { height: Math.max((month.totalIncome / maxMonthly) * 110, 6), backgroundColor: colors.success },
                                                ]}
                                            />
                                            <View
                                                style={[
                                                    styles.bar,
                                                    { height: Math.max((month.totalExpense / maxMonthly) * 110, 6), backgroundColor: colors.danger },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.barLabel}>{MONTH_NAMES[month.month - 1]}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                                    <Text style={styles.legendText}>Pemasukan</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                                    <Text style={styles.legendText}>Pengeluaran</Text>
                                </View>
                            </View>
                        </Animated.View>

                        {expenseCategories.length > 0 && (
                            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.tableCard}>
                                <SectionHeader
                                    title="Breakdown Pengeluaran"
                                    subtitle="Kategori dominan di periode ini untuk membaca fokus pengeluaran."
                                />

                                {expenseCategories.map((cat, index) => {
                                    const categoryInfo = resolveCategoryByKey(cat.category, categories);
                                    return (
                                        <View key={cat.category}>
                                            <View style={styles.tableRow}>
                                                <View style={styles.catInfo}>
                                                    <View style={[styles.catIconBox, { backgroundColor: `${categoryInfo?.color || colors.textSecondary}20` }]}>
                                                        <MaterialCommunityIcons
                                                            name={(categoryInfo?.icon ?? 'tag') as any}
                                                            size={16}
                                                            color={categoryInfo?.color ?? colors.textSecondary}
                                                        />
                                                    </View>
                                                    <Text style={styles.catName} numberOfLines={1}>{categoryInfo?.name ?? cat.category}</Text>
                                                </View>

                                                <View style={styles.catRight}>
                                                    <Text style={styles.catAmount}>{formatCurrency(cat.total)}</Text>
                                                    <Text style={styles.catPercent}>{cat.percentage.toFixed(0)}%</Text>
                                                </View>
                                            </View>

                                            <View style={styles.catBarBg}>
                                                <View
                                                    style={[
                                                        styles.catBarFill,
                                                        { width: `${cat.percentage}%`, backgroundColor: categoryInfo?.color ?? colors.primary },
                                                    ]}
                                                />
                                            </View>

                                            {index < expenseCategories.length - 1 && <View style={styles.rowDivider} />}
                                        </View>
                                    );
                                })}
                            </Animated.View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function generateHTMLReport(
    expense: CategorySummary[],
    income: CategorySummary[],
    totalIncome: number,
    totalExpense: number,
    period: PeriodFilter
): string {
    const periodLabel = PERIOD_OPTIONS_MAP[period];
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><title>Laporan Tabungin</title>
    <style>
      body { font-family: sans-serif; padding: 32px; color: #1A1A2E; }
      h1 { color: #16A34A; } h2 { color: #333; margin-top: 24px; }
      .summary { display: flex; gap: 32px; margin: 16px 0; }
      .item { flex: 1; }
      .income { color: #16A34A; } .expense { color: #DC2626; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
      th { background: #F7F9FC; }
    </style></head>
    <body>
      <h1>Laporan Keuangan - ${periodLabel}</h1>
      <p>Digenerate oleh Tabungin • ${new Date().toLocaleDateString('id-ID')}</p>
      <div class="summary">
        <div class="item"><p>Pemasukan</p><h2 class="income">Rp ${totalIncome.toLocaleString('id-ID')}</h2></div>
        <div class="item"><p>Pengeluaran</p><h2 class="expense">Rp ${totalExpense.toLocaleString('id-ID')}</h2></div>
        <div class="item"><p>Selisih</p><h2 class="${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}">Rp ${Math.abs(totalIncome - totalExpense).toLocaleString('id-ID')}</h2></div>
      </div>
      <h2>Pengeluaran per Kategori</h2>
      <table><tr><th>Kategori</th><th>Total</th><th>%</th></tr>
        ${expense.map((c) => `<tr><td>${c.category}</td><td>Rp ${c.total.toLocaleString('id-ID')}</td><td>${c.percentage.toFixed(1)}%</td></tr>`).join('')}
      </table>
    </body></html>
  `;
}

const PERIOD_OPTIONS_MAP = {
    month: 'Bulan Ini',
    '3months': '3 Bulan Terakhir',
    '6months': '6 Bulan Terakhir',
    year: 'Tahun Ini',
};

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -120,
        right: -34,
        width: 260,
        height: 260,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primaryLight,
        opacity: 0.48,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    headerTitle: { ...Typography.h2, color: colors.textPrimary },
    headerSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.xl,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    exportText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: colors.primary,
    },
    content: { padding: 20, gap: 20, paddingBottom: 100 },
    heroCard: {
        borderRadius: BorderRadius['5xl'],
        padding: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    heroGlow: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        top: -55,
        right: -26,
        backgroundColor: 'rgba(255,255,255,0.10)',
    },
    heroLabel: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textInverse,
    },
    heroValue: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.display,
        color: colors.textInverse,
        marginTop: 8,
    },
    heroSubtext: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textInverse,
        marginTop: 6,
    },
    heroChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 16,
    },
    heroChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    heroChipText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.caption,
        color: colors.textInverse,
    },
    periodBlock: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    blockTitle: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        marginBottom: 12,
    },
    periodRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    periodChip: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    periodChipActive: {
        backgroundColor: colors.background,
        borderColor: `${colors.primary}25`,
    },
    periodChipText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    periodChipTextActive: {
        color: colors.primaryDark,
        fontFamily: FontFamily.bodyBold,
    },
    insightCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 16,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    insightIcon: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryBg,
        borderWidth: 1,
        borderColor: `${colors.primary}24`,
    },
    insightTitle: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
    },
    insightSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        lineHeight: 20,
        marginTop: 2,
    },
    insightChipRow: {
        flexDirection: 'row',
        gap: 10,
    },
    insightBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    insightChip: {
        flex: 1,
        padding: 14,
        borderRadius: BorderRadius['3xl'],
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    insightChipValue: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h3,
        color: colors.textPrimary,
    },
    insightChipLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    summaryCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    summaryRow: { flexDirection: 'row', gap: 12 },
    summaryItem: { flex: 1, gap: 8 },
    summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption },
    summaryAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    summaryDivider: { width: 1, backgroundColor: colors.divider },
    summaryBalance: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    balanceLabel: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textSecondary },
    balanceAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4 },
    chartCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    chartTitle: { ...Typography.h4, color: colors.textPrimary },
    cardHint: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingTop: 12 },
    barGroup: { flex: 1, alignItems: 'center', gap: 8 },
    barsRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 118 },
    bar: { width: 12, borderRadius: BorderRadius.sm },
    barLabel: { fontFamily: FontFamily.body, fontSize: 10, color: colors.textSecondary },
    legend: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    tableCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: BorderRadius['4xl'],
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    catInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    catIconBox: {
        width: 34,
        height: 34,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catName: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.textPrimary, flex: 1 },
    catRight: { alignItems: 'flex-end' },
    catAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.caption, color: colors.textPrimary },
    catPercent: { fontFamily: FontFamily.body, fontSize: 10, color: colors.textSecondary },
    catBarBg: { height: 7, backgroundColor: colors.surfaceInset, borderRadius: BorderRadius.sm, overflow: 'hidden' },
    catBarFill: { height: 7, borderRadius: BorderRadius.sm },
    rowDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },
});

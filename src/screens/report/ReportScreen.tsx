// Report Screen — charts dan laporan keuangan
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useTransactionStore } from '../../store/useTransactionStore';
import type { CategorySummary, MonthlySummary } from '../../types/transaction';
import { formatRupiah, formatRupiahShort } from '../../utils/currency';
import { getCategoryById } from '../../constants/categories';

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
    else start.setMonth(0), start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end };
}

export function ReportScreen() {
    const { getCategorySummary, getMonthlyData } = useTransactionStore();
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [expenseCategories, setExpenseCategories] = useState<CategorySummary[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<CategorySummary[]>([]);
    const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const totalIncome = incomeCategories.reduce((s, c) => s + c.total, 0);
    const totalExpense = expenseCategories.reduce((s, c) => s + c.total, 0);

    useEffect(() => {
        loadData();
    }, [period]);

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
    const maxMonthly = Math.max(...monthlyData.map((d) => Math.max(d.totalIncome, d.totalExpense)), 1);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.title} allowFontScaling={true} accessibilityRole="header">Laporan</Text>
                <TouchableOpacity
                    style={styles.exportBtn}
                    onPress={handleExportPDF}
                    disabled={isExporting}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Ekspor laporan ke PDF"
                    accessibilityState={{ busy: isExporting }}
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="file-pdf-box" size={20} color={Colors.primary} accessibilityElementsHidden={true} />
                            <Text style={styles.exportText} allowFontScaling={true}>PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Period Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
                    {PERIOD_OPTIONS.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.periodChip, period === p.id && styles.periodChipActive]}
                            onPress={() => setPeriod(p.id)}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={p.label}
                            accessibilityState={{ selected: period === p.id }}
                        >
                            <Text style={[styles.periodChipText, period === p.id && styles.periodChipTextActive]} allowFontScaling={true}>{p.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} accessibilityLabel="Memuat laporan" />
                ) : (
                    <>
                        {/* Summary Card */}
                        <View style={[styles.summaryCard, Shadow.md]}>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <View style={styles.summaryIconRow} accessibilityElementsHidden={true}>
                                        <MaterialCommunityIcons name="arrow-up-circle" size={20} color={Colors.success} />
                                        <Text style={[styles.summaryLabel, { color: Colors.success }]} allowFontScaling={true}>Pemasukan</Text>
                                    </View>
                                    <Text style={styles.summaryAmount} allowFontScaling={true}>{formatRupiah(totalIncome)}</Text>
                                </View>
                                <View style={styles.summaryDivider} />
                                <View style={styles.summaryItem}>
                                    <View style={styles.summaryIconRow} accessibilityElementsHidden={true}>
                                        <MaterialCommunityIcons name="arrow-down-circle" size={20} color={Colors.danger} />
                                        <Text style={[styles.summaryLabel, { color: Colors.danger }]} allowFontScaling={true}>Pengeluaran</Text>
                                    </View>
                                    <Text style={[styles.summaryAmount, { color: Colors.danger }]} allowFontScaling={true}>{formatRupiah(totalExpense)}</Text>
                                </View>
                            </View>
                            <View style={styles.summaryBalance} accessible={true} accessibilityLabel={`Selisih ${totalIncome - totalExpense >= 0 ? 'surplus' : 'defisit'} ${formatRupiah(Math.abs(totalIncome - totalExpense))}`}>
                                <Text style={styles.balanceLabel} allowFontScaling={true}>Selisih</Text>
                                <Text style={[styles.balanceAmount, { color: totalIncome - totalExpense >= 0 ? Colors.success : Colors.danger }]} allowFontScaling={true}>
                                    {totalIncome - totalExpense >= 0 ? '+' : '-'} {formatRupiah(Math.abs(totalIncome - totalExpense))}
                                </Text>
                            </View>
                        </View>

                        {/* Bar Chart Manual — 6 bulan terakhir */}
                        <View style={[styles.chartCard, Shadow.sm]}>
                            <Text style={styles.chartTitle} allowFontScaling={true} accessibilityRole="header">Pemasukan vs Pengeluaran</Text>
                            <View style={styles.barChart} accessibilityRole="figure" accessibilityLabel="Grafik perbandingan pemasukan dan pengeluaran 6 bulan terakhir">
                                {monthlyData.map((m, idx) => (
                                    <View key={idx} style={styles.barGroup}>
                                        <View style={styles.barsRow}>
                                            <View
                                                style={[styles.bar, { height: Math.max((m.totalIncome / maxMonthly) * 100, 4), backgroundColor: Colors.success }]}
                                                accessible={true}
                                                accessibilityLabel={`Pemasukan ${MONTH_NAMES[m.month - 1]} ${formatRupiahShort(m.totalIncome)}`}
                                            />
                                            <View
                                                style={[styles.bar, { height: Math.max((m.totalExpense / maxMonthly) * 100, 4), backgroundColor: Colors.danger }]}
                                                accessible={true}
                                                accessibilityLabel={`Pengeluaran ${MONTH_NAMES[m.month - 1]} ${formatRupiahShort(m.totalExpense)}`}
                                            />
                                        </View>
                                        <Text style={styles.barLabel} allowFontScaling={false}>{MONTH_NAMES[m.month - 1]}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.legend}>
                                <View style={styles.legendItem} accessible={true} accessibilityLabel="Hijau: pemasukan">
                                    <View style={[styles.legendDot, { backgroundColor: Colors.success }]} accessibilityElementsHidden={true} />
                                    <Text style={styles.legendText} allowFontScaling={true}>Pemasukan</Text>
                                </View>
                                <View style={styles.legendItem} accessible={true} accessibilityLabel="Merah: pengeluaran">
                                    <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} accessibilityElementsHidden={true} />
                                    <Text style={styles.legendText} allowFontScaling={true}>Pengeluaran</Text>
                                </View>
                            </View>
                        </View>

                        {/* Tabel Kategori Pengeluaran */}
                        {expenseCategories.length > 0 && (
                            <View style={[styles.tableCard, Shadow.sm]}>
                                <Text style={styles.chartTitle} allowFontScaling={true} accessibilityRole="header">Breakdown Pengeluaran</Text>
                                {expenseCategories.map((cat) => {
                                    const categoryInfo = getCategoryById(cat.category);
                                    return (
                                        <View
                                            key={cat.category}
                                            style={styles.tableRow}
                                            accessible={true}
                                            accessibilityLabel={`${categoryInfo?.name ?? cat.category}: ${formatRupiah(cat.total)}, ${cat.percentage.toFixed(0)} persen dari total pengeluaran`}
                                        >
                                            <View style={styles.catInfo}>
                                                <MaterialCommunityIcons name={(categoryInfo?.icon ?? 'tag') as any} size={18} color={categoryInfo?.color ?? Colors.textSecondary} accessibilityElementsHidden={true} />
                                                <Text style={styles.catName} allowFontScaling={true} numberOfLines={1}>{categoryInfo?.name ?? cat.category}</Text>
                                            </View>
                                            <View style={styles.catBar}>
                                                <View style={[styles.catBarFill, { width: `${cat.percentage}%`, backgroundColor: categoryInfo?.color ?? Colors.primary }]} />
                                            </View>
                                            <Text style={styles.catAmount} allowFontScaling={true}>{formatRupiahShort(cat.total)}</Text>
                                            <Text style={styles.catPercent} allowFontScaling={true}>{cat.percentage.toFixed(0)}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
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
      h1 { color: #1DB954; } h2 { color: #333; margin-top: 24px; }
      .summary { display: flex; gap: 32px; margin: 16px 0; }
      .item { flex: 1; }
      .income { color: #10B981; } .expense { color: #EF4444; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
      th { background: #F7F9FC; }
    </style></head>
    <body>
      <h1>Laporan Keuangan — ${periodLabel}</h1>
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

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.primary, minHeight: 44 },
    exportText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.primary },
    content: { padding: 16, gap: 16, paddingBottom: 100 },
    periodRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 40, justifyContent: 'center' },
    periodChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    periodChipText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    periodChipTextActive: { color: Colors.primaryDark, fontFamily: FontFamily.bodyMedium },
    summaryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 16 },
    summaryRow: { flexDirection: 'row', gap: 12 },
    summaryItem: { flex: 1, gap: 8 },
    summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption },
    summaryAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.h4, color: Colors.textPrimary },
    summaryDivider: { width: 1, backgroundColor: Colors.border },
    summaryBalance: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider },
    balanceLabel: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary },
    balanceAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.h4 },
    chartCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 16 },
    chartTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: 16 },
    barGroup: { flex: 1, alignItems: 'center', gap: 6 },
    barsRow: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 100 },
    bar: { width: 10, borderRadius: 4 },
    barLabel: { fontFamily: FontFamily.body, fontSize: 10, color: Colors.textSecondary },
    legend: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    tableCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 14 },
    tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    catInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
    catName: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.textPrimary, flex: 1 },
    catBar: { flex: 1, height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
    catBarFill: { height: 6, borderRadius: 3 },
    catAmount: { fontFamily: FontFamily.bodyMedium, fontSize: 11, color: Colors.textPrimary, width: 64, textAlign: 'right' },
    catPercent: { fontFamily: FontFamily.body, fontSize: 11, color: Colors.textSecondary, width: 32, textAlign: 'right' },
});

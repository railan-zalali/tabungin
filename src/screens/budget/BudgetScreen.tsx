import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useBudgetStore } from '../../store/useBudgetStore';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Shadow } from '../../constants/theme';
import { EmptyState } from '../../components/common/EmptyState';

export function BudgetScreen() {
    const navigation = useNavigation();
    const { budgets, loadBudgets, saveBudget, removeBudget, isLoading, totalBudget, totalSpent } = useBudgetStore();
    const { colors, isDark, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [amountInput, setAmountInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadBudgets();
    }, [loadBudgets]);

    const handleSave = async () => {
        if (!selectedCategory) {
            Alert.alert('Error', 'Pilih kategori terlebih dahulu');
            return;
        }
        const amount = parseRupiah(amountInput);
        if (amount <= 0) {
            Alert.alert('Error', 'Nominal harus lebih dari 0');
            return;
        }

        await saveBudget(selectedCategory, amount);
        setSelectedCategory(null);
        setAmountInput('');
        setIsEditing(false);
    };

    const handleEdit = (category: string, amount: number) => {
        setSelectedCategory(category);
        setAmountInput(amount.toString());
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Hapus Budget', 'Yakin ingin menghapus budget ini?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => removeBudget(id) },
        ]);
    };

    const expenseCategories = EXPENSE_CATEGORIES;
    const budgetLeft = totalBudget - totalSpent;
    const usagePercent = Math.min(100, (totalSpent / (totalBudget || 1)) * 100);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.bgAuraTop} pointerEvents="none" />
            <View style={styles.bgAuraBottom} pointerEvents="none" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Budget Bulanan</Text>
                    <Text style={styles.subtitle}>Kontrol pengeluaran per kategori dengan lebih jelas.</Text>
                </View>
                <TouchableOpacity style={styles.headerAction} onPress={() => setIsEditing(true)}>
                    <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Summary */}
                <LinearGradient
                    colors={gradients.hero as unknown as [string, string, ...string[]]}
                    style={styles.summaryCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.summaryTitle}>Total Budget Bulan Ini</Text>
                    <Text style={styles.summaryAmount}>{formatRupiah(totalBudget)}</Text>
                    <Text style={styles.summarySubtitle}>
                        {budgetLeft >= 0 ? `Sisa ${formatRupiah(budgetLeft)}` : `Melebihi ${formatRupiah(Math.abs(budgetLeft))}`}
                    </Text>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[
                                styles.progressFill, 
                                { width: `${usagePercent}%` },
                                totalSpent > totalBudget ? { backgroundColor: colors.danger } : {}
                            ]} />
                        </View>
                        <View style={styles.summaryMetaRow}>
                            <Text style={styles.summaryMetaText}>Terpakai: {formatRupiah(totalSpent)}</Text>
                            <Text style={styles.summaryMetaText}>Sisa: {formatRupiah(Math.max(0, budgetLeft))}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Form Add/Edit */}
                {isEditing ? (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Atur Budget Kategori</Text>
                        
                        <Text style={styles.label}>Pilih Kategori:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {expenseCategories.map(cat => (
                                <TouchableOpacity 
                                    key={cat.id}
                                    style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <MaterialCommunityIcons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? colors.textInverse : colors.textPrimary} />
                                    <Text style={[styles.catChipText, selectedCategory === cat.id && { color: colors.textInverse }]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Nominal (Rp):</Text>
                        <TextInput
                            style={styles.input}
                            value={amountInput}
                            onChangeText={v => setAmountInput(formatInputRupiah(v))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textDisabled}
                        />

                        <View style={styles.formActions}>
                            <Button label="Batal" onPress={() => { setIsEditing(false); setSelectedCategory(null); setAmountInput(''); }} variant="outline" style={{ flex: 1 }} />
                            <Button label="Simpan" onPress={handleSave} variant="primary" style={{ flex: 1 }} />
                        </View>
                    </View>
                ) : (
                    <View style={styles.ctaCard}>
                        <View style={styles.ctaInfo}>
                            <Text style={styles.ctaTitle}>Buat budget baru</Text>
                            <Text style={styles.ctaSubtitle}>Pilih kategori prioritas dan beri batas yang realistis.</Text>
                        </View>
                        <Button label="Atur Budget" onPress={() => setIsEditing(true)} variant="primary" />
                    </View>
                )}

                {/* List Budgets */}
                <Text style={styles.sectionTitle}>Budget Aktif</Text>
                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : budgets.length === 0 ? (
                    <EmptyState
                        icon="chart-pie"
                        title="Belum ada budget"
                        message="Atur batas pengeluaran per kategori agar belanja tetap terkendali."
                        actionLabel="Atur Budget"
                        onAction={() => setIsEditing(true)}
                    />
                ) : (
                    budgets.map(b => (
                        <View key={b.id} style={styles.budgetCard}>
                            <View style={styles.budgetHeader}>
                                <Text style={styles.budgetCat}>{b.category}</Text>
                                <View style={styles.budgetActions}>
                                    <TouchableOpacity onPress={() => handleEdit(b.category, b.amount)}>
                                        <MaterialCommunityIcons name="pencil" size={20} color={colors.info} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(b.id)}>
                                        <MaterialCommunityIcons name="delete" size={20} color={colors.danger} style={{ marginLeft: 12 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <Text style={styles.budgetAmount}>{formatRupiah(b.amount)}</Text>
                            
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View style={[
                                        styles.progressFill, 
                                        { width: `${Math.min(100, b.percentage)}%` },
                                        b.spent > b.amount ? { backgroundColor: colors.danger } : {}
                                    ]} />
                                </View>
                                <View style={styles.progressLabels}>
                                    <Text style={styles.progressText}>Terpakai: {formatRupiah(b.spent)}</Text>
                                    <Text style={[styles.progressText, b.spent > b.amount && { color: colors.danger }]}>Sisa: {formatRupiah(b.amount - b.spent)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
        position: 'absolute',
        top: -110,
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
        opacity: 0.3,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    headerCenter: { flex: 1 },
    headerAction: {
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
    backBtn: { width: 44, height: 44, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: colors.textPrimary },
    subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginTop: 2 },
    content: { padding: 20, gap: 16, paddingBottom: 40 },
    summaryCard: { padding: 20, borderRadius: BorderRadius['5xl'], gap: 8, overflow: 'hidden', borderWidth: 1, borderColor: `${colors.textInverse}2E`, ...Shadow.md },
    summaryTitle: { fontFamily: FontFamily.bodyMedium, color: colors.textInverse },
    summaryAmount: { fontFamily: FontFamily.heading, fontSize: 32, color: colors.textInverse, marginVertical: 2 },
    summarySubtitle: { fontFamily: FontFamily.body, color: colors.textInverse },
    progressContainer: { gap: 8, marginTop: 12 },
    progressBar: { height: 8, backgroundColor: `${colors.textInverse}33`, borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.primaryLight, borderRadius: 999 },
    summaryMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    summaryMetaText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: colors.textInverse },
    formCard: { backgroundColor: colors.surfaceElevated, padding: 16, borderRadius: BorderRadius['4xl'], gap: 12, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
    ctaCard: { backgroundColor: colors.surfaceElevated, padding: 16, borderRadius: BorderRadius['4xl'], gap: 14, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
    ctaInfo: { gap: 4 },
    ctaTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    ctaSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    formTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    label: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: colors.textSecondary },
    categoryScroll: { flexDirection: 'row', marginBottom: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: colors.surface, marginRight: 8, borderWidth: 1, borderColor: colors.border },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontFamily: FontFamily.bodyMedium, color: colors.textPrimary },
    input: { backgroundColor: colors.surface, borderRadius: BorderRadius.xl, padding: 12, borderWidth: 1, borderColor: colors.border, fontFamily: FontFamily.bodyBold, fontSize: FontSize.h3, color: colors.textPrimary },
    formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    sectionTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary, marginTop: 8 },
    budgetCard: { backgroundColor: colors.surfaceElevated, padding: 16, borderRadius: BorderRadius['4xl'], gap: 8, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetCat: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: colors.textPrimary },
    budgetActions: { flexDirection: 'row' },
    budgetAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.h3, color: colors.primary },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    progressText: { fontFamily: FontFamily.body, fontSize: 12, color: colors.textSecondary },
});

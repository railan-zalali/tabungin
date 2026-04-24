import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useTheme } from '../../store/useThemeStore';
import { formatInputRupiah, formatRupiah, parseRupiah } from '../../utils/currency';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';

export function BudgetScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { contentBottomSpacing } = useScreenLayout();
    const {
        budgets,
        loadBudgets,
        saveBudget,
        removeBudget,
        isLoading,
        totalBudget,
        totalSpent,
        categoriesOver,
    } = useBudgetStore();

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [amountInput, setAmountInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadBudgets().catch((error) => console.error('Failed to load budgets:', error));
    }, [loadBudgets]);

    const budgetLeft = totalBudget - totalSpent;
    const usagePercent = Math.min(100, (totalSpent / (totalBudget || 1)) * 100);

    const resetForm = () => {
        setSelectedCategory(null);
        setAmountInput('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!selectedCategory) {
            Alert.alert('Kategori belum dipilih', 'Pilih kategori dulu agar budget punya fokus yang jelas.');
            return;
        }

        const amount = parseRupiah(amountInput);
        if (amount <= 0) {
            Alert.alert('Nominal belum valid', 'Masukkan nominal budget yang lebih besar dari nol.');
            return;
        }

        await saveBudget(selectedCategory, amount);
        resetForm();
    };

    const handleEdit = (category: string, amount: number) => {
        setSelectedCategory(category);
        setAmountInput(formatInputRupiah(String(amount)));
        setIsEditing(true);
    };

    const handleDelete = (id: string, category: string) => {
        Alert.alert('Hapus budget', `Yakin ingin menghapus budget untuk ${category}?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => removeBudget(id) },
        ]);
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Budget bulanan"
                subtitle="Beri batas yang realistis agar pengeluaran tetap terbaca sebelum kebablasan."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: isEditing ? 'close' : 'plus',
                    label: isEditing ? 'Tutup form budget' : 'Buat budget baru',
                    onPress: () => (isEditing ? resetForm() : setIsEditing(true)),
                }}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
            >
                <HeroSummaryCard
                    eyebrow="Kontrol pengeluaran"
                    title="Porsi budget bulan ini"
                    value={formatRupiah(totalBudget)}
                    description={
                        budgetLeft >= 0
                            ? `Masih ada ruang ${formatRupiah(budgetLeft)} sebelum melewati batas yang kamu tetapkan.`
                            : `Pengeluaran sudah melewati budget sebesar ${formatRupiah(Math.abs(budgetLeft))}.`
                    }
                    icon="chart-pie"
                    tone={budgetLeft >= 0 ? 'primary' : 'warning'}
                    badges={
                        <>
                            <ContextBadge icon="cash-multiple" label={`Terpakai ${formatRupiah(totalSpent)}`} inverse />
                            <ContextBadge icon="alert-outline" label={`${categoriesOver} kategori kritis`} inverse />
                        </>
                    }
                />

                <ContentPanel>
                    <SectionHeader
                        title={isEditing ? 'Atur budget kategori' : 'Budget baru'}
                        subtitle="Mulai dari kategori yang paling sering aktif supaya batas bulanan lebih actionable."
                    />

                    <View style={styles.categoryWrap}>
                        {EXPENSE_CATEGORIES.map((category) => {
                            const active = selectedCategory === category.id;
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.categoryChip,
                                        active
                                            ? {
                                                  backgroundColor: `${category.color}18`,
                                                  borderColor: category.color,
                                              }
                                            : null,
                                    ]}
                                    onPress={() => setSelectedCategory(category.id)}
                                >
                                    <MaterialCommunityIcons
                                        name={category.icon as any}
                                        size={16}
                                        color={active ? category.color : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.categoryChipText,
                                            active ? { color: category.color, fontFamily: FontFamily.bodyBold } : null,
                                        ]}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>Nominal budget</Text>
                        <View style={styles.currencyInput}>
                            <Text style={styles.currencyPrefix}>Rp</Text>
                            <TextInput
                                style={styles.currencyField}
                                value={amountInput}
                                onChangeText={(value) => setAmountInput(formatInputRupiah(value))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.textDisabled}
                            />
                        </View>
                    </View>

                    <View style={styles.formActions}>
                        {isEditing ? (
                            <Button label="Batal" onPress={resetForm} variant="outline" style={{ flex: 1 }} />
                        ) : null}
                        <Button
                            label={isEditing ? 'Simpan budget' : 'Aktifkan budget'}
                            onPress={handleSave}
                            variant="primary"
                            style={{ flex: 1 }}
                        />
                    </View>
                </ContentPanel>

                <ContentPanel>
                    <SectionHeader
                        title="Kesehatan budget"
                        subtitle="Lihat kategori yang masih sehat dan yang sudah butuh perhatian."
                    />

                    <View style={styles.progressRail}>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${usagePercent}%`,
                                        backgroundColor: budgetLeft >= 0 ? colors.primary : colors.danger,
                                    },
                                ]}
                            />
                        </View>
                        <View style={styles.progressMetaRow}>
                            <Text style={styles.progressMeta}>Terpakai {formatRupiah(totalSpent)}</Text>
                            <Text style={styles.progressMeta}>
                                {budgetLeft >= 0 ? `Sisa ${formatRupiah(budgetLeft)}` : `Minus ${formatRupiah(Math.abs(budgetLeft))}`}
                            </Text>
                        </View>
                    </View>
                </ContentPanel>

                <ContentPanel>
                    <SectionHeader
                        title="Budget aktif"
                        subtitle="Semua kategori yang sedang kamu pantau bulan ini."
                    />

                    {isLoading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : budgets.length === 0 ? (
                        <EmptyState
                            icon="chart-pie"
                            title="Belum ada budget aktif"
                            description="Aktifkan satu budget dulu agar pengeluaran bulanan terasa lebih terarah."
                            actionLabel="Atur budget"
                            onAction={() => setIsEditing(true)}
                        />
                    ) : (
                        <View style={styles.budgetList}>
                            {budgets.map((budget) => {
                                const overLimit = budget.spent > budget.amount;
                                const progress = Math.min(100, budget.percentage);

                                return (
                                    <View key={budget.id} style={styles.budgetCard}>
                                        <View style={styles.budgetTopRow}>
                                            <View style={styles.budgetCopy}>
                                                <Text style={styles.budgetCategory}>{budget.category}</Text>
                                                <Text style={styles.budgetAmount}>{formatRupiah(budget.amount)}</Text>
                                            </View>
                                            <View style={styles.budgetActions}>
                                                <TouchableOpacity onPress={() => handleEdit(budget.category, budget.amount)}>
                                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.info} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDelete(budget.id, budget.category)}>
                                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${progress}%`,
                                                        backgroundColor: overLimit ? colors.danger : colors.primary,
                                                    },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.budgetMetaRow}>
                                            <Text style={styles.budgetMeta}>Terpakai {formatRupiah(budget.spent)}</Text>
                                            <Text style={[styles.budgetMeta, overLimit ? { color: colors.danger } : null]}>
                                                {overLimit
                                                    ? `Melebihi ${formatRupiah(Math.abs(budget.amount - budget.spent))}`
                                                    : `Sisa ${formatRupiah(budget.amount - budget.spent)}`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ContentPanel>
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
        categoryWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        categoryChipText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        inputBlock: {
            gap: 8,
        },
        inputLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            textTransform: 'uppercase',
            letterSpacing: 0.45,
            color: colors.textSecondary,
        },
        currencyInput: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
        },
        currencyPrefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textSecondary,
            marginRight: 8,
        },
        currencyField: {
            flex: 1,
            paddingVertical: 16,
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textPrimary,
        },
        formActions: {
            flexDirection: 'row',
            gap: 12,
        },
        progressRail: {
            gap: 10,
        },
        progressTrack: {
            height: 10,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.surfaceAlt,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: BorderRadius.full,
        },
        progressMetaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        progressMeta: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        loadingWrap: {
            paddingVertical: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
        budgetList: {
            gap: 12,
        },
        budgetCard: {
            gap: 10,
            padding: 14,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        budgetTopRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
        },
        budgetCopy: {
            flex: 1,
        },
        budgetCategory: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        budgetAmount: {
            ...Typography.h4,
            color: colors.primary,
            marginTop: 2,
        },
        budgetActions: {
            flexDirection: 'row',
            gap: 14,
        },
        budgetMetaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        budgetMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
    });

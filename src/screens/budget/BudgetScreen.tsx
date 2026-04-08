import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/theme';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { formatInputRupiah, formatRupiah, parseRupiah } from '../../utils/currency';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { FormSection } from '../../components/common/FormSection';
import { InlineNotice } from '../../components/common/InlineNotice';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SelectionChip } from '../../components/common/SelectionChip';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatStrip } from '../../components/common/StatStrip';

export function BudgetScreen() {
    const navigation = useNavigation();
    const { budgets, loadBudgets, saveBudget, removeBudget, isLoading, totalBudget, totalSpent } = useBudgetStore();
    const { colors, gradients } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [amountInput, setAmountInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadBudgets();
    }, [loadBudgets]);

    const budgetLeft = totalBudget - totalSpent;
    const usagePercent = Math.min(100, (totalSpent / (totalBudget || 1)) * 100);
    const showEditor = isEditing || budgets.length === 0;

    const resetEditor = () => {
        setSelectedCategory(null);
        setAmountInput('');
        setIsEditing(false);
    };

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
        resetEditor();
    };

    const handleEdit = (category: string, amount: number) => {
        setSelectedCategory(category);
        setAmountInput(formatInputRupiah(String(amount)));
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Hapus Budget', 'Yakin ingin menghapus budget ini?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: () => removeBudget(id) },
        ]);
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Budget Bulanan"
                subtitle="Kontrol pengeluaran per kategori dengan pola yang lebih rapi dan mudah dibaca."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={
                    showEditor
                        ? undefined
                        : {
                              icon: 'plus',
                              label: 'Atur budget baru',
                              onPress: () => setIsEditing(true),
                          }
                }
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: showEditor ? metrics.floatingActionClearance + 20 : metrics.contentBottomInset,
                    },
                ]}
            >
                <LinearGradient
                    colors={gradients.hero as unknown as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <Text style={styles.heroEyebrow}>Ringkasan Budget</Text>
                    <Text style={styles.heroValue}>{formatRupiah(totalBudget)}</Text>
                    <Text style={styles.heroSubtitle}>
                        {budgetLeft >= 0 ? `Sisa ${formatRupiah(budgetLeft)}` : `Melebihi ${formatRupiah(Math.abs(budgetLeft))}`}
                    </Text>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${usagePercent}%`,
                                    backgroundColor: totalSpent > totalBudget ? colors.danger : colors.primaryLight,
                                },
                            ]}
                        />
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Terpakai</Text>
                            <Text style={styles.summaryValue}>{formatRupiah(totalSpent)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Sisa aman</Text>
                            <Text style={styles.summaryValue}>{formatRupiah(Math.max(0, budgetLeft))}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <StatStrip
                    items={[
                        { label: 'Kategori aktif', value: String(budgets.length) },
                        { label: 'Terpakai', value: formatRupiah(totalSpent) },
                        { label: 'Sisa', value: formatRupiah(Math.max(0, budgetLeft)), valueColor: budgetLeft < 0 ? colors.danger : colors.textPrimary },
                    ]}
                    vertical={metrics.widthClass === 'compact'}
                />

                {showEditor ? (
                    <FormSection
                        eyebrow="Category Budget"
                        title={selectedCategory ? 'Perbarui budget kategori' : 'Atur budget kategori'}
                        subtitle="Pilih kategori prioritas lalu tetapkan batas yang realistis untuk bulan berjalan."
                        variant="highlight"
                    >
                        <View style={styles.chipWrap}>
                            {EXPENSE_CATEGORIES.map((category) => {
                                const active = selectedCategory === category.id;
                                return (
                                    <SelectionChip
                                        key={category.id}
                                        icon={category.icon}
                                        label={category.name}
                                        selected={active}
                                        onPress={() => setSelectedCategory(category.id)}
                                    />
                                );
                            })}
                        </View>

                        <InlineNotice
                            icon="lightbulb-outline"
                            description="Pilih kategori yang benar-benar perlu dijaga. Budget yang terlalu banyak justru membuat monitoring terasa berat."
                            tone="info"
                        />

                        <Input
                            label="Nominal Budget"
                            value={amountInput}
                            onChangeText={(value) => setAmountInput(formatInputRupiah(value))}
                            keyboardType="numeric"
                            placeholder="0"
                            leftIcon="cash"
                            hint="Nominal akan dipakai sebagai batas kategori untuk bulan aktif."
                        />
                    </FormSection>
                ) : (
                    <FormSection
                        eyebrow="Quick Add"
                        title="Tambah budget baru"
                        subtitle="Buat batas baru kapan saja tanpa harus meninggalkan ringkasan yang sedang dibaca."
                    >
                        <Button label="Atur Budget" onPress={() => setIsEditing(true)} variant="primary" />
                    </FormSection>
                )}

                <SectionHeader
                    title="Budget Aktif"
                    subtitle="Daftar kategori yang sudah punya batas pengeluaran."
                    actionLabel={budgets.length > 0 && !showEditor ? 'Tambah' : undefined}
                    onAction={budgets.length > 0 && !showEditor ? () => setIsEditing(true) : undefined}
                />

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : budgets.length === 0 ? (
                    <EmptyState
                        icon="chart-pie"
                        title="Belum ada budget"
                        description="Atur batas pengeluaran per kategori agar belanja tetap terkendali."
                        actionLabel="Atur Budget"
                        onAction={() => setIsEditing(true)}
                    />
                ) : (
                    <View style={styles.listWrap}>
                        {budgets.map((budget) => (
                            <View key={budget.id} style={styles.budgetCard}>
                                <View style={styles.budgetHeader}>
                                    <View style={styles.budgetCopy}>
                                        <Text style={styles.budgetCategory}>{budget.category}</Text>
                                        <Text style={styles.budgetAmount}>{formatRupiah(budget.amount)}</Text>
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity onPress={() => handleEdit(budget.category, budget.amount)} style={styles.iconButton}>
                                            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.info} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(budget.id)} style={styles.iconButton}>
                                            <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.progressTrackLight}>
                                    <View
                                        style={[
                                            styles.progressFillLight,
                                            {
                                                width: `${Math.min(100, budget.percentage)}%`,
                                                backgroundColor: budget.spent > budget.amount ? colors.danger : colors.primary,
                                            },
                                        ]}
                                    />
                                </View>

                                <View style={styles.metaRow}>
                                    <Text style={styles.metaText}>Terpakai {formatRupiah(budget.spent)}</Text>
                                    <Text style={[styles.metaText, budget.spent > budget.amount ? styles.metaDanger : null]}>
                                        Sisa {formatRupiah(budget.amount - budget.spent)}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {showEditor ? (
                <PrimaryActionBar
                    primaryLabel="Simpan Budget"
                    onPrimaryPress={handleSave}
                    secondaryLabel="Batal"
                    onSecondaryPress={resetEditor}
                    bottomInset={metrics.tabBarClearance}
                />
            ) : null}
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            gap: 18,
            paddingTop: 20,
        },
        heroCard: {
            borderRadius: BorderRadius['5xl'],
            padding: 22,
            gap: 10,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: `${colors.textInverse}26`,
        },
        heroEyebrow: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textInverse,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        heroValue: {
            fontFamily: FontFamily.heading,
            fontSize: 32,
            color: colors.textInverse,
        },
        heroSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textInverse,
        },
        progressTrack: {
            height: 10,
            borderRadius: BorderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.24)',
            overflow: 'hidden',
            marginTop: 4,
        },
        progressFill: {
            height: '100%',
            borderRadius: BorderRadius.full,
        },
        summaryRow: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 6,
        },
        summaryItem: {
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            borderRadius: BorderRadius['2xl'],
            padding: 14,
        },
        summaryLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.82)',
        },
        summaryValue: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textInverse,
            marginTop: 4,
        },
        chipWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        loadingWrap: {
            paddingVertical: 28,
        },
        listWrap: {
            gap: 12,
        },
        budgetCard: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 12,
        },
        budgetHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
        },
        budgetCopy: {
            flex: 1,
            gap: 4,
        },
        budgetCategory: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        budgetAmount: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.primary,
        },
        actionRow: {
            flexDirection: 'row',
            gap: 8,
        },
        iconButton: {
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.xl,
            backgroundColor: colors.surfaceAlt,
        },
        progressTrackLight: {
            height: 10,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.surfaceMuted,
            overflow: 'hidden',
        },
        progressFillLight: {
            height: '100%',
            borderRadius: BorderRadius.full,
        },
        metaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
        },
        metaText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        metaDanger: {
            color: colors.danger,
        },
    });

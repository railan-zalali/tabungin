import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { useBudgetStore } from '../../store/useBudgetStore';
import { EXPENSE_CATEGORIES, type CategoryItem } from '../../constants/categories';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { Button } from '../../components/common/Button';

export function BudgetScreen() {
    const navigation = useNavigation();
    const { budgets, loadBudgets, saveBudget, removeBudget, isLoading, totalBudget, totalSpent } = useBudgetStore();
    
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [amountInput, setAmountInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadBudgets();
    }, []);

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

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Budget Bulanan</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Total Budget Bulan Ini</Text>
                    <Text style={styles.summaryAmount}>{formatRupiah(totalBudget)}</Text>
                    
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[
                                styles.progressFill, 
                                { width: `${Math.min(100, (totalSpent / (totalBudget || 1)) * 100)}%` },
                                totalSpent > totalBudget ? { backgroundColor: Colors.danger } : {}
                            ]} />
                        </View>
                        <Text style={styles.progressText}>Terpakai: {formatRupiah(totalSpent)}</Text>
                    </View>
                </View>

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
                                    <MaterialCommunityIcons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? Colors.surface : Colors.textPrimary} />
                                    <Text style={[styles.catChipText, selectedCategory === cat.id && { color: Colors.surface }]}>{cat.name}</Text>
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
                        />

                        <View style={styles.formActions}>
                            <Button label="Batal" onPress={() => { setIsEditing(false); setSelectedCategory(null); setAmountInput(''); }} variant="outline" style={{ flex: 1 }} />
                            <Button label="Simpan" onPress={handleSave} variant="primary" style={{ flex: 1 }} />
                        </View>
                    </View>
                ) : (
                    <Button label="+ Atur Budget Baru" onPress={() => setIsEditing(true)} variant="outline" />
                )}

                {/* List Budgets */}
                <Text style={styles.sectionTitle}>Budget Aktif</Text>
                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : budgets.length === 0 ? (
                    <Text style={styles.emptyText}>Belum ada budget yang diatur bulan ini.</Text>
                ) : (
                    budgets.map(b => (
                        <View key={b.id} style={styles.budgetCard}>
                            <View style={styles.budgetHeader}>
                                <Text style={styles.budgetCat}>{b.category}</Text>
                                <View style={styles.budgetActions}>
                                    <TouchableOpacity onPress={() => handleEdit(b.category, b.amount)}>
                                        <MaterialCommunityIcons name="pencil" size={20} color={Colors.info} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(b.id)}>
                                        <MaterialCommunityIcons name="delete" size={20} color={Colors.danger} style={{ marginLeft: 12 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <Text style={styles.budgetAmount}>{formatRupiah(b.amount)}</Text>
                            
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View style={[
                                        styles.progressFill, 
                                        { width: `${Math.min(100, b.percentage)}%` },
                                        b.spent > b.amount ? { backgroundColor: Colors.danger } : {}
                                    ]} />
                                </View>
                                <View style={styles.progressLabels}>
                                    <Text style={styles.progressText}>Terpakai: {formatRupiah(b.spent)}</Text>
                                    <Text style={[styles.progressText, b.spent > b.amount && { color: Colors.danger }]}>Sisa: {formatRupiah(b.amount - b.spent)}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.surface },
    backBtn: { padding: 8, marginLeft: -8 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: Colors.textPrimary },
    content: { padding: 16, gap: 16, paddingBottom: 40 },
    summaryCard: { backgroundColor: Colors.primary, padding: 20, borderRadius: 16 },
    summaryTitle: { fontFamily: FontFamily.body, color: Colors.surface, opacity: 0.9 },
    summaryAmount: { fontFamily: FontFamily.heading, fontSize: 32, color: Colors.surface, marginVertical: 8 },
    progressContainer: { gap: 8, marginTop: 12 },
    progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: Colors.surface, borderRadius: 4 },
    progressText: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.textSecondary },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    formCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 16, gap: 12 },
    formTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    label: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textSecondary },
    categoryScroll: { flexDirection: 'row', marginBottom: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
    catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catChipText: { fontFamily: FontFamily.bodyMedium, color: Colors.textPrimary },
    input: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: FontFamily.bodyBold, fontSize: FontSize.h3, color: Colors.textPrimary },
    formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    sectionTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary, marginTop: 8 },
    emptyText: { fontFamily: FontFamily.body, color: Colors.textSecondary, textAlign: 'center', marginTop: 24 },
    budgetCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 16, gap: 8 },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetCat: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    budgetActions: { flexDirection: 'row' },
    budgetAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.h3, color: Colors.primary },
});

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { resolveCategoriesForType, type ResolvedCategory } from '../../utils/categoryResolver';
import { resolveMaterialIcon } from '../../utils/materialIcon';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import type { CategoryType } from '../../database/categoryQueries';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SegmentedControl } from '../../components/common/SegmentedControl';

const DEFAULT_ICONS = ['tag', 'food', 'car', 'shopping', 'gamepad', 'file-document', 'medical-bag', 'school', 'cash', 'star', 'trending-up', 'gift'];
const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#2ECC71', '#F39C12', '#3498DB', '#E91E63', '#9B59B6'];

export function CategoryManagementScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { categories, isLoading, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<Exclude<CategoryType, 'both'>>('expense');
    const [formType, setFormType] = useState<CategoryType>('expense');
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('tag');
    const [formColor, setFormColor] = useState('#1DB954');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ResolvedCategory | null>(null);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCategories();
        setRefreshing(false);
    }, [loadCategories]);

    const resetForm = () => {
        setEditingCategory(null);
        setFormType('expense');
        setFormName('');
        setFormIcon('tag');
        setFormColor('#1DB954');
    };

    const closeModal = () => { setShowAddModal(false); resetForm(); };

    const handleSaveCategory = async () => {
        if (!formName.trim()) return Alert.alert('Error', 'Nama kategori tidak boleh kosong');
        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name: formName, icon: resolveMaterialIcon(formIcon), color: formColor, type: formType });
                Alert.alert('Sukses', 'Kategori berhasil diperbarui');
            } else {
                await addCategory({ user_id: '', name: formName, icon: resolveMaterialIcon(formIcon), color: formColor, type: formType, updated_at: null });
                Alert.alert('Sukses', 'Kategori berhasil ditambahkan');
            }
            closeModal();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Gagal menyimpan kategori');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCategory = useCallback((category: ResolvedCategory) => {
        setEditingCategory(category);
        setFormName(category.name);
        setFormType(category.type);
        setFormIcon(resolveMaterialIcon(category.icon));
        setFormColor(category.color);
        setShowAddModal(true);
    }, []);

    const handleDeleteCategory = useCallback((id: string) => {
        const category = categories.find((item) => item.id === id);
        if (!category) return;
        if (category.is_default) return Alert.alert('Tidak Bisa Hapus', 'Kategori default tidak dapat dihapus');
        Alert.alert('Hapus Kategori', `Apakah Anda yakin ingin menghapus kategori "${category.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Hapus', style: 'destructive', onPress: async () => {
                try { await deleteCategory(id); } catch (error: any) { Alert.alert('Error', error.message || 'Gagal menghapus kategori'); }
            } },
        ]);
    }, [categories, deleteCategory]);

    const displayedCategories = React.useMemo(() => resolveCategoriesForType(activeTab, categories), [activeTab, categories]);
    const defaultCount = displayedCategories.filter((category) => Boolean(category.is_default)).length;
    const customCount = displayedCategories.length - defaultCount;

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Kelola Kategori"
                subtitle="Rapikan kategori bawaan dan kategori kustom agar pencatatan tetap presisi."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{ icon: 'plus', label: 'Tambah kategori', onPress: () => { setFormType(activeTab); setShowAddModal(true); } }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingHorizontal: metrics.horizontalPadding, paddingBottom: 40 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            >
                <LinearGradient colors={[`${colors.primary}F2`, `${colors.primary}D6`, `${colors.primaryDark}F4`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                    <Text style={styles.heroEyebrow}>Kurasi Kategori</Text>
                    <Text style={styles.heroTitle}>{activeTab === 'income' ? 'Kategori pemasukan yang rapi' : 'Kategori pengeluaran yang lebih presisi'}</Text>
                    <Text style={styles.heroSubtitle}>Kategori bawaan dan kustom hidup berdampingan agar pencatatan harian tetap jelas.</Text>
                    <View style={styles.stats}>
                        <View style={styles.stat}><Text style={styles.statValue}>{displayedCategories.length}</Text><Text style={styles.statLabel}>Total</Text></View>
                        <View style={styles.stat}><Text style={styles.statValue}>{defaultCount}</Text><Text style={styles.statLabel}>Default</Text></View>
                        <View style={styles.stat}><Text style={styles.statValue}>{customCount}</Text><Text style={styles.statLabel}>Kustom</Text></View>
                    </View>
                </LinearGradient>

                <SegmentedControl value={activeTab} onChange={setActiveTab} options={[{ id: 'expense', label: 'Pengeluaran' }, { id: 'income', label: 'Pemasukan' }]} />

                {isLoading ? (
                    <View style={styles.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
                ) : displayedCategories.length === 0 ? (
                    <EmptyState icon="tag-off" title={`Belum ada kategori ${activeTab === 'income' ? 'pemasukan' : 'pengeluaran'}`} description="Tambahkan kategori kustom untuk mengelola pencatatanmu dengan lebih rapi." actionLabel="Tambah Kategori" onAction={() => { setFormType(activeTab); setShowAddModal(true); }} />
                ) : (
                    <View style={styles.list}>
                        {displayedCategories.map((category) => (
                            <View key={category.id} style={[styles.categoryCard, { borderLeftColor: category.color }]}>
                                <View style={[styles.iconWrap, { backgroundColor: `${category.color}20` }]}>
                                    <MaterialCommunityIcons name={resolveMaterialIcon(category.icon) as any} size={22} color={category.color} />
                                </View>
                                <View style={styles.flex1}>
                                    <Text style={styles.categoryName}>{category.name}</Text>
                                    {category.is_default ? <Text style={styles.categoryMeta}>Kategori bawaan</Text> : <Text style={styles.categoryMeta}>Kategori kustom</Text>}
                                </View>
                                {!category.is_default ? (
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => handleEditCategory(category)}><MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} /></TouchableOpacity>
                                        <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteCategory(category.id)}><MaterialCommunityIcons name="delete-outline" size={18} color={colors.danger} /></TouchableOpacity>
                                    </View>
                                ) : null}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <FormSection title={editingCategory ? 'Edit kategori' : 'Tambah kategori'} subtitle="Gunakan warna dan ikon yang mudah dikenali saat memilih kategori nanti.">
                            {!editingCategory ? (
                                <SegmentedControl value={formType as 'expense' | 'income'} onChange={(value) => setFormType(value)} options={[{ id: 'expense', label: 'Pengeluaran' }, { id: 'income', label: 'Pemasukan' }]} />
                            ) : null}

                            <Input
                                label="Nama Kategori"
                                value={formName}
                                onChangeText={setFormName}
                                leftIcon="tag-outline"
                                placeholder="Contoh: Makanan"
                            />

                            <View style={styles.optionWrap}>
                                {DEFAULT_ICONS.map((icon) => (
                                    <TouchableOpacity key={icon} style={[styles.optionButton, formIcon === icon ? { borderColor: formColor, backgroundColor: `${formColor}14` } : null]} onPress={() => setFormIcon(icon)}>
                                        <MaterialCommunityIcons name={resolveMaterialIcon(icon) as any} size={22} color={formIcon === icon ? formColor : colors.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.optionWrap}>
                                {DEFAULT_COLORS.map((item) => (
                                    <TouchableOpacity key={item} style={[styles.colorButton, { backgroundColor: item }]} onPress={() => setFormColor(item)}>
                                        {formColor === item ? <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} /> : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormSection>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryAction} onPress={closeModal}>
                                <Text style={styles.secondaryActionText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryAction, { backgroundColor: formColor }]} onPress={handleSaveCategory} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={styles.primaryActionText}>{editingCategory ? 'Simpan' : 'Tambah'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    flex1: { flex: 1 },
    content: { gap: 18, paddingTop: 20 },
    hero: { borderRadius: BorderRadius['5xl'], padding: 22, gap: 10, overflow: 'hidden' },
    heroEyebrow: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: colors.textInverse, textTransform: 'uppercase', letterSpacing: 0.6 },
    heroTitle: { ...Typography.h3, color: colors.textInverse },
    heroSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 22, color: colors.textInverse },
    stats: { flexDirection: 'row', gap: 10, marginTop: 4 },
    stat: { flex: 1, borderRadius: BorderRadius['2xl'], padding: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    statValue: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: colors.textInverse },
    statLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
    loadingWrap: { paddingVertical: 24 },
    list: { gap: 12 },
    categoryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panelSurface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderRadius: BorderRadius['4xl'], padding: 16 },
    iconWrap: { width: 46, height: 46, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center' },
    categoryName: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
    categoryMeta: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    actionButton: { width: 34, height: 34, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 20, 0.54)', justifyContent: 'center', paddingHorizontal: 16 },
    modalCard: { borderRadius: BorderRadius['4xl'], backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 },
    optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionButton: { width: 48, height: 48, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
    colorButton: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
    modalActions: { flexDirection: 'row', gap: 12 },
    secondaryAction: { flex: 1, minHeight: 48, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
    secondaryActionText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textSecondary },
    primaryAction: { flex: 1, minHeight: 48, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center' },
    primaryActionText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textInverse },
});

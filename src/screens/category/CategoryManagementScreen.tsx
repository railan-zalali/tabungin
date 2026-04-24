import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
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
import type { CategoryType } from '../../database/categoryQueries';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import { resolveCategoriesForType, type ResolvedCategory } from '../../utils/categoryResolver';
import { resolveMaterialIcon } from '../../utils/materialIcon';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SegmentedControl } from '../../components/common/SegmentedControl';

const DEFAULT_ICONS = ['tag', 'food', 'car', 'shopping', 'gamepad', 'file-document', 'medical-bag', 'school', 'cash', 'star', 'trending-up', 'gift'];
const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#2ECC71', '#F39C12', '#3498DB', '#E91E63', '#9B59B6'];

type CategoryTab = Exclude<CategoryType, 'both'>;

function CategoryRow({
    category,
    onEdit,
    onDelete,
}: {
    category: ResolvedCategory;
    onEdit: (category: ResolvedCategory) => void;
    onDelete: (category: ResolvedCategory) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={styles.categoryRow}>
            <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
                <MaterialCommunityIcons name={resolveMaterialIcon(category.icon) as any} size={20} color={category.color} />
            </View>
            <View style={styles.categoryCopy}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryMeta}>{category.is_default ? 'Kategori bawaan sistem' : 'Kategori kustom milikmu'}</Text>
            </View>
            {category.is_default ? (
                <ContextBadge icon="shield-check-outline" label="Bawaan" tone="neutral" />
            ) : (
                <View style={styles.categoryActions}>
                    <TouchableOpacity onPress={() => onEdit(category)}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.info} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(category)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

export function CategoryManagementScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { contentBottomSpacing } = useScreenLayout();
    const { categories, isLoading, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

    const [showModal, setShowModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<CategoryTab>('expense');
    const [formType, setFormType] = useState<CategoryType>('expense');
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('tag');
    const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ResolvedCategory | null>(null);

    useEffect(() => {
        loadCategories().catch((error) => console.error('Failed to load categories:', error));
    }, [loadCategories]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadCategories();
        } finally {
            setRefreshing(false);
        }
    }, [loadCategories]);

    const displayedCategories = useMemo(
        () => resolveCategoriesForType(activeTab, categories),
        [activeTab, categories],
    );
    const defaultCategories = displayedCategories.filter((category) => Boolean(category.is_default));
    const customCategories = displayedCategories.filter((category) => !category.is_default);

    const resetForm = () => {
        setEditingCategory(null);
        setFormType(activeTab);
        setFormName('');
        setFormIcon('tag');
        setFormColor(DEFAULT_COLORS[0]);
    };

    const openAddModal = () => {
        resetForm();
        setFormType(activeTab);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!formName.trim()) {
            Alert.alert('Nama kategori kosong', 'Isi nama kategori dulu sebelum menyimpannya.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, {
                    name: formName.trim(),
                    icon: resolveMaterialIcon(formIcon),
                    color: formColor,
                    type: formType,
                });
            } else {
                await addCategory({
                    user_id: '',
                    name: formName.trim(),
                    icon: resolveMaterialIcon(formIcon),
                    color: formColor,
                    type: formType,
                    updated_at: null,
                });
            }

            closeModal();
        } catch (error: any) {
            Alert.alert('Gagal menyimpan kategori', error?.message || 'Kategori belum berhasil disimpan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (category: ResolvedCategory) => {
        setEditingCategory(category);
        setFormName(category.name);
        setFormType(category.type);
        setFormIcon(resolveMaterialIcon(category.icon));
        setFormColor(category.color);
        setShowModal(true);
    };

    const handleDelete = (category: ResolvedCategory) => {
        Alert.alert('Hapus kategori', `Yakin ingin menghapus kategori "${category.name}"?`, [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteCategory(category.id);
                    } catch (error: any) {
                        Alert.alert('Gagal menghapus kategori', error?.message || 'Kategori belum berhasil dihapus.');
                    }
                },
            },
        ]);
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Kelola kategori"
                subtitle="Rapikan bahasa pencatatan agar transaksi dan laporan selalu terasa presisi."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{
                    icon: 'plus',
                    label: 'Tambah kategori',
                    onPress: openAddModal,
                }}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
            >
                <HeroSummaryCard
                    eyebrow="Kurasi kategori"
                    title={activeTab === 'income' ? 'Kategori pemasukan aktif' : 'Kategori pengeluaran aktif'}
                    value={`${displayedCategories.length} kategori`}
                    description="Pisahkan kategori bawaan dan kategori kustom agar kamu langsung paham mana yang stabil dan mana yang bisa disesuaikan."
                    icon="tag-multiple-outline"
                    badges={
                        <>
                            <ContextBadge icon="shield-check-outline" label={`${defaultCategories.length} bawaan`} inverse />
                            <ContextBadge icon="pencil-outline" label={`${customCategories.length} kustom`} inverse />
                        </>
                    }
                />

                <ContentPanel>
                    <SectionHeader
                        title="Fokus kategori"
                        subtitle="Pilih dulu konteks pemasukan atau pengeluaran yang ingin kamu kurasi."
                    />
                    <SegmentedControl
                        value={activeTab}
                        onChange={setActiveTab}
                        options={[
                            { id: 'expense', label: 'Pengeluaran', count: resolveCategoriesForType('expense', categories).length },
                            { id: 'income', label: 'Pemasukan', count: resolveCategoriesForType('income', categories).length },
                        ]}
                    />
                </ContentPanel>

                {isLoading ? (
                    <ContentPanel>
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    </ContentPanel>
                ) : displayedCategories.length === 0 ? (
                    <EmptyState
                        icon="tag-off"
                        title={`Belum ada kategori ${activeTab === 'income' ? 'pemasukan' : 'pengeluaran'}`}
                        description="Tambahkan kategori kustom bila kamu butuh bahasa pencatatan yang lebih spesifik dari kategori bawaan."
                        actionLabel="Tambah kategori"
                        onAction={openAddModal}
                    />
                ) : (
                    <>
                        <ContentPanel>
                            <SectionHeader
                                title="Kategori bawaan"
                                subtitle="Kategori stabil yang menjaga konsistensi pencatatan dasar."
                            />
                            <View style={styles.listWrap}>
                                {defaultCategories.map((category) => (
                                    <CategoryRow
                                        key={category.id}
                                        category={category}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </View>
                        </ContentPanel>

                        <ContentPanel>
                            <SectionHeader
                                title="Kategori kustom"
                                subtitle="Kategori buatanmu sendiri untuk kebutuhan yang lebih spesifik."
                                actionLabel="Tambah"
                                onAction={openAddModal}
                            />
                            {customCategories.length === 0 ? (
                                <EmptyState
                                    icon="pencil-box-outline"
                                    title="Belum ada kategori kustom"
                                    description="Tambahkan kategori baru bila pola pemasukan atau pengeluaranmu butuh klasifikasi yang lebih personal."
                                    actionLabel="Tambah kategori"
                                    onAction={openAddModal}
                                    compact
                                />
                            ) : (
                                <View style={styles.listWrap}>
                                    {customCategories.map((category) => (
                                        <CategoryRow
                                            key={category.id}
                                            category={category}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </View>
                            )}
                        </ContentPanel>
                    </>
                )}
            </ScrollView>

            <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <ContentPanel style={styles.modalPanel}>
                        <View style={styles.modalPreview}>
                            <View style={[styles.modalPreviewIcon, { backgroundColor: `${formColor}18` }]}>
                                <MaterialCommunityIcons name={resolveMaterialIcon(formIcon) as any} size={22} color={formColor} />
                            </View>
                            <View style={styles.modalPreviewCopy}>
                                <Text style={styles.modalPreviewLabel}>Preview kategori</Text>
                                <Text style={styles.modalPreviewValue}>{formName.trim() || 'Nama kategori'}</Text>
                            </View>
                        </View>

                        <SectionHeader
                            title={editingCategory ? 'Edit kategori' : 'Tambah kategori'}
                            subtitle="Beri nama, ikon, dan warna yang mudah dipindai saat kamu mencatat transaksi."
                        />

                        {!editingCategory ? (
                            <SegmentedControl
                                value={formType as CategoryTab}
                                onChange={(value) => setFormType(value)}
                                options={[
                                    { id: 'expense', label: 'Pengeluaran' },
                                    { id: 'income', label: 'Pemasukan' },
                                ]}
                            />
                        ) : null}

                        <View style={styles.inputBlock}>
                            <Text style={styles.inputLabel}>Nama kategori</Text>
                            <TextInput
                                style={styles.input}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="Contoh: Jajan kantor"
                                placeholderTextColor={colors.textDisabled}
                            />
                        </View>

                        <View style={styles.inputBlock}>
                            <Text style={styles.inputLabel}>Ikon</Text>
                            <View style={styles.optionGrid}>
                                {DEFAULT_ICONS.map((icon) => {
                                    const active = formIcon === icon;
                                    return (
                                        <TouchableOpacity
                                            key={icon}
                                            style={[styles.optionTile, active ? { borderColor: formColor, backgroundColor: `${formColor}14` } : null]}
                                            onPress={() => setFormIcon(icon)}
                                        >
                                            <MaterialCommunityIcons
                                                name={resolveMaterialIcon(icon) as any}
                                                size={22}
                                                color={active ? formColor : colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.inputBlock}>
                            <Text style={styles.inputLabel}>Warna penanda</Text>
                            <View style={styles.colorRow}>
                                {DEFAULT_COLORS.map((color) => {
                                    const active = formColor === color;
                                    return (
                                        <TouchableOpacity
                                            key={color}
                                            style={[styles.colorTile, { backgroundColor: color }, active ? styles.colorTileActive : null]}
                                            onPress={() => setFormColor(color)}
                                        >
                                            {active ? <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} /> : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <Button label="Batal" onPress={closeModal} variant="outline" style={{ flex: 1 }} />
                            <Button
                                label={editingCategory ? 'Simpan' : 'Tambah'}
                                onPress={handleSubmit}
                                variant="primary"
                                style={{ flex: 1 }}
                                loading={isSubmitting}
                            />
                        </View>
                    </ContentPanel>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        loadingWrap: {
            paddingVertical: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
        listWrap: {
            gap: 10,
        },
        categoryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        categoryIcon: {
            width: 42,
            height: 42,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        categoryCopy: {
            flex: 1,
        },
        categoryName: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        categoryMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        categoryActions: {
            flexDirection: 'row',
            gap: 14,
        },
        modalOverlay: {
            flex: 1,
            justifyContent: 'center',
            backgroundColor: colors.overlay,
            paddingHorizontal: 16,
        },
        modalPanel: {
            maxHeight: '88%',
        },
        modalPreview: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.primaryBg,
            padding: 14,
        },
        modalPreviewIcon: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalPreviewCopy: {
            flex: 1,
        },
        modalPreviewLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        modalPreviewValue: {
            ...Typography.h4,
            color: colors.textPrimary,
            marginTop: 2,
        },
        inputBlock: {
            gap: 8,
        },
        inputLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.45,
        },
        input: {
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        optionGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        optionTile: {
            width: 50,
            height: 50,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
        },
        colorRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        colorTile: {
            width: 38,
            height: 38,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
        },
        colorTileActive: {
            borderWidth: 2,
            borderColor: colors.surface,
        },
        modalActions: {
            flexDirection: 'row',
            gap: 12,
        },
    });

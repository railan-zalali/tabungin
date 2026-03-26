import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { CategoryType } from '../../database/categoryQueries';
import { resolveCategoriesForType, type ResolvedCategory } from '../../utils/categoryResolver';
import { resolveMaterialIcon } from '../../utils/materialIcon';

const DEFAULT_ICONS = ['tag', 'food', 'car', 'shopping', 'gamepad', 'file-document', 'medical-bag', 'school', 'cash', 'star', 'trending-up', 'gift'];
const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#2ECC71', '#F39C12', '#3498DB', '#E91E63', '#9B59B6'];

export function CategoryManagementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { categories, isLoading, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Exclude<CategoryType, 'both'>>('expense');

  // Form state
  const [formType, setFormType] = useState<CategoryType>('expense');
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('tag');
  const [formColor, setFormColor] = useState('#1DB954');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ResolvedCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, [loadCategories]);

  const handleAddCategory = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Nama kategori tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName,
          icon: resolveMaterialIcon(formIcon),
          color: formColor,
          type: formType,
        });
        Alert.alert('Sukses', 'Kategori berhasil diperbarui');
      } else {
        await addCategory({
          user_id: '',
          name: formName,
          icon: resolveMaterialIcon(formIcon),
          color: formColor,
          type: formType,
          updated_at: null,
        });
        Alert.alert('Sukses', 'Kategori berhasil ditambahkan');
      }

      setShowAddModal(false);
      resetForm();
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
    const category = categories.find(c => c.id === id);
    if (!category) return;

    if (category.is_default) {
      Alert.alert('Tidak Bisa Hapus', 'Kategori default tidak dapat dihapus');
      return;
    }

    Alert.alert(
      'Hapus Kategori',
      `Apakah Anda yakin ingin menghapus kategori "${category.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus kategori');
            }
          },
        },
      ]
    );
  }, [categories, deleteCategory]);

  const resetForm = () => {
    setEditingCategory(null);
    setFormType('expense');
    setFormName('');
    setFormIcon('tag');
    setFormColor('#1DB954');
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const displayedCategories = React.useMemo(
    () => resolveCategoriesForType(activeTab, categories),
    [activeTab, categories],
  );
  const defaultCount = displayedCategories.filter((category) => Boolean(category.is_default)).length;
  const customCount = displayedCategories.length - defaultCount;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor='transparent'
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Kelola Kategori</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setFormType(activeTab);
            setShowAddModal(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'expense' && [styles.tabActive, { backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}35` }],
          ]}
          onPress={() => setActiveTab('expense')}
        >
          <MaterialCommunityIcons
            name="arrow-down-circle-outline"
            size={16}
            color={activeTab === 'expense' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'expense' && { color: colors.primary }]}>Pengeluaran</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'income' && [styles.tabActive, { backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}35` }],
          ]}
          onPress={() => setActiveTab('income')}
        >
          <MaterialCommunityIcons
            name="arrow-up-circle-outline"
            size={16}
            color={activeTab === 'income' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'income' && { color: colors.primary }]}>Pemasukan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.heroWrap}>
          <LinearGradient
            colors={[`${colors.primary}F2`, `${colors.primary}D6`, `${colors.primaryDark}F4`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />
            <Text style={styles.heroLabel}>Kurasi Kategori</Text>
            <Text style={styles.heroTitle}>
              {activeTab === 'income' ? 'Kategori pemasukan yang rapi' : 'Kategori pengeluaran yang lebih presisi'}
            </Text>
            <Text style={styles.heroSubtitle}>
              Kategori bawaan dan kategori kustom sekarang hidup berdampingan agar pencatatan tetap lengkap.
            </Text>
            <View style={styles.heroStatRow}>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{displayedCategories.length}</Text>
                <Text style={styles.heroStatLabel}>Total</Text>
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{defaultCount}</Text>
                <Text style={styles.heroStatLabel}>Default</Text>
              </View>
              <View style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{customCount}</Text>
                <Text style={styles.heroStatLabel}>Kustom</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : displayedCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="tag-off" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {`Belum ada kategori ${activeTab === 'income' ? 'pemasukan' : 'pengeluaran'}`}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Tambahkan kategori kustom untuk mengelola keuanganmu
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {displayedCategories.map((category, index) => (
              <Animated.View
                key={category.id}
                entering={FadeInUp.delay(index * 50).springify()}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderLeftColor: category.color,
                  },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                  <MaterialCommunityIcons
                    name={resolveMaterialIcon(category.icon) as any}
                    size={24}
                    color={category.color}
                  />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{category.name}</Text>
                  {Boolean(category.is_default) && (
                    <View style={[styles.badgePill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}30` }]}>
                      <Text style={[styles.defaultBadge, { color: colors.primaryDark }]}>Bawaan</Text>
                    </View>
                  )}
                </View>
                {!Boolean(category.is_default) && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditCategory(category)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteCategory(category.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType='fade'
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalPreview}>
              <View style={[styles.modalPreviewIcon, { backgroundColor: `${formColor}20` }]}>
                <MaterialCommunityIcons name={resolveMaterialIcon(formIcon) as any} size={22} color={formColor} />
              </View>
              <View style={styles.modalPreviewInfo}>
                <Text style={[styles.modalPreviewLabel, { color: colors.textSecondary }]}>Preview</Text>
                <Text style={[styles.modalPreviewValue, { color: colors.textPrimary }]}>
                  {formName.trim() || 'Nama kategori'}
                </Text>
              </View>
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
            </Text>

            {/* Type Toggle */}
            {!editingCategory && (
              <View style={[styles.typeToggle, { backgroundColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formType === 'expense' && [styles.typeOptionActive, { backgroundColor: colors.danger }],
                  ]}
                  onPress={() => setFormType('expense')}
                >
                  <Text style={[styles.typeText, formType === 'expense' && { color: colors.textInverse }]}>Pengeluaran</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formType === 'income' && [styles.typeOptionActive, { backgroundColor: colors.success }],
                  ]}
                  onPress={() => setFormType('income')}
                >
                  <Text style={[styles.typeText, formType === 'income' && { color: colors.textInverse }]}>Pemasukan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Kategori</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                value={formName}
                onChangeText={setFormName}
                placeholder='Contoh: Makanan'
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Icon Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ikon</Text>
              <View style={styles.iconGrid}>
                {DEFAULT_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formIcon === icon && [styles.iconOptionActive, { borderColor: formColor }],
                    ]}
                    onPress={() => setFormIcon(icon)}
                  >
                    <MaterialCommunityIcons
                      name={resolveMaterialIcon(icon) as any}
                      size={24}
                      color={formIcon === icon ? formColor : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Warna</Text>
              <View style={styles.colorGrid}>
                {DEFAULT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      formColor === color && [styles.colorOptionActive, { borderColor: color }],
                    ]}
                    onPress={() => setFormColor(color)}
                  >
                    <View style={[styles.colorPreview, { backgroundColor: color }]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={closeModal}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: formColor }]}
                onPress={handleAddCategory}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.textInverse} size='small' />
                ) : (
                  <Text style={styles.confirmButtonText}>{editingCategory ? 'Simpan' : 'Tambah'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 6,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    alignItems: 'center',
  },
  tabActive: {},
  tabText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  heroWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
  },
  heroGlowTop: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -64,
    right: -24,
    backgroundColor: `${colors.textInverse}24`,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -36,
    left: -18,
    backgroundColor: `${colors.textInverse}1A`,
  },
  heroLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h2,
    color: colors.textInverse,
    marginTop: 10,
  },
  heroSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textInverse,
    marginTop: 8,
    lineHeight: 22,
  },
  heroStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroStatChip: {
    flex: 1,
    backgroundColor: colors.primaryBg,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  heroStatValue: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h4,
    color: colors.primaryDark,
  },
  heroStatLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.primaryDark,
    marginTop: 2,
  },
  list: {
    gap: 12,
    paddingHorizontal: 16,
  },
  categoryItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },
  defaultBadge: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
  },
  badgePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.h3,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 16,
    maxHeight: '90%',
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  modalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
  },
  modalPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPreviewInfo: {
    flex: 1,
  },
  modalPreviewLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
  },
  modalPreviewValue: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    marginTop: 2,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
  },
  typeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  iconOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  colorOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  cancelButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textInverse,
  },
});

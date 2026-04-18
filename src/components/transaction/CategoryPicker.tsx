// Komponen CategoryPicker — grid 4 kolom untuk pilih kategori transaksi
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontFamily, FontSize } from '../../constants/typography';
import { useCategoryStore } from '../../store/useCategoryStore';
import { resolveCategoriesForType } from '../../utils/categoryResolver';
import { useTheme } from '../../store/useThemeStore';

interface CategoryPickerProps {
    type: 'income' | 'expense';
    selectedCategory: string;
    onSelect: (categoryId: string) => void;
}

export function CategoryPicker({ type, selectedCategory, onSelect }: CategoryPickerProps) {
    const { categories: storedCategories, loadCategories, isLoading } = useCategoryStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const categories = resolveCategoriesForType(type, storedCategories);

    useEffect(() => {
        if (storedCategories.length === 0) {
            loadCategories();
        }
    }, [storedCategories.length, loadCategories]);

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
                {isLoading && categories.length === 0 ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.loadingText}>Memuat kategori...</Text>
                    </View>
                ) : (
                    categories.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.item,
                                    isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                                ]}
                                onPress={() => onSelect(cat.id)}
                                accessible={true}
                                accessibilityRole="radio"
                                accessibilityLabel={cat.name}
                                accessibilityState={{ selected: isSelected }}
                                accessibilityHint={`Ketuk dua kali untuk memilih kategori ${cat.name}`}
                            >
                                <View
                                    style={[
                                        styles.iconWrap,
                                        { backgroundColor: isSelected ? cat.color : `${cat.color}20` },
                                    ]}
                                    accessibilityElementsHidden={true}
                                >
                                        <MaterialCommunityIcons
                                            name={cat.icon as any}
                                            size={24}
                                            color={isSelected ? colors.textInverse : cat.color}
                                        />
                                    </View>
                                    <Text
                                    style={[styles.label, isSelected && { color: cat.color, fontFamily: FontFamily.bodyMedium }]}
                                    allowFontScaling={true}
                                    numberOfLines={2}
                                    textBreakStrategy="balanced"
                                >
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            paddingVertical: 8,
        },
        item: {
            width: '22%',
            aspectRatio: 0.85,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingVertical: 10,
            minHeight: 80,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 1,
        },
        iconWrap: {
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        label: {
            fontFamily: FontFamily.body,
            fontSize: 10,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 14,
        },
        loadingState: {
            width: '100%',
            minHeight: 88,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        loadingText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
    });

// Komponen CategoryPicker — grid 4 kolom untuk pilih kategori transaksi
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    type CategoryItem,
} from '../../constants/categories';

interface CategoryPickerProps {
    type: 'income' | 'expense';
    selectedCategory: string;
    onSelect: (categoryId: string) => void;
}

export function CategoryPicker({ type, selectedCategory, onSelect }: CategoryPickerProps) {
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
                {categories.map((cat) => {
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
                                    color={isSelected ? Colors.textInverse : cat.color}
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
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'transparent',
        backgroundColor: Colors.surfaceElevated,
        paddingVertical: 10,
        minHeight: 80,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontFamily: FontFamily.body,
        fontSize: 10,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
    },
});

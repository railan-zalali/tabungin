import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { SegmentedControl } from './SegmentedControl';

export interface FilterChipOption<T extends string> {
    id: T;
    label: string;
    icon?: string;
}

interface FilterBarProps<T extends string, U extends string> {
    title: string;
    subtitle?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    resultLabel?: string;
    segmentValue?: T;
    segmentOptions?: Array<FilterChipOption<T>>;
    onSegmentChange?: (value: T) => void;
    chipValue?: U;
    chipOptions?: Array<FilterChipOption<U>>;
    onChipChange?: (value: U) => void;
}

export function FilterBar<T extends string, U extends string>({
    title,
    subtitle,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Cari...',
    resultLabel,
    segmentValue,
    segmentOptions,
    onSegmentChange,
    chipValue,
    chipOptions,
    onChipChange,
}: FilterBarProps<T, U>) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.copy}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                {resultLabel ? (
                    <View style={styles.resultBadge}>
                        <MaterialCommunityIcons name="filter-variant" size={14} color={colors.primary} />
                        <Text style={styles.resultBadgeText}>{resultLabel}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    value={searchValue}
                    onChangeText={onSearchChange}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.textDisabled}
                />
                {searchValue ? (
                    <TouchableOpacity
                        onPress={() => onSearchChange('')}
                        accessibilityRole="button"
                        accessibilityLabel="Bersihkan pencarian"
                    >
                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {segmentValue && segmentOptions?.length && onSegmentChange ? (
                <SegmentedControl
                    value={segmentValue}
                    options={segmentOptions}
                    onChange={onSegmentChange}
                    scrollable
                />
            ) : null}

            {chipValue && chipOptions?.length && onChipChange ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {chipOptions.map((option) => {
                        const active = chipValue === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => onChipChange(option.id)}
                            >
                                {option.icon ? (
                                    <MaterialCommunityIcons
                                        name={option.icon as any}
                                        size={14}
                                        color={active ? colors.primary : colors.textSecondary}
                                    />
                                ) : null}
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ) : null}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        container: {
            backgroundColor: colors.brutalWhite,
            borderRadius: BorderRadius.md,
            padding: 16,
            gap: 14,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
        },
        copy: {
            flex: 1,
        },
        title: {
            ...Typography.h4,
            fontSize: scaleFontSize(FontSize.h4, textSize),
            color: colors.textPrimary,
        },
        subtitle: {
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            marginTop: 3,
        },
        resultBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: BorderRadius.md,
            backgroundColor: colors.brutalYellow,
            borderWidth: 2,
            borderColor: colors.brutalInk,
        },
        resultBadgeText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.brutalInk,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 52,
            borderRadius: BorderRadius.md,
            paddingHorizontal: 14,
            backgroundColor: colors.brutalPaper,
            borderWidth: 2,
            borderColor: colors.brutalInk,
        },
        searchInput: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.textPrimary,
        },
        chipRow: {
            gap: 8,
        },
        chip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: BorderRadius.md,
            backgroundColor: colors.brutalWhite,
            borderWidth: 2,
            borderColor: colors.brutalInk,
        },
        chipActive: {
            backgroundColor: colors.brutalLime,
            borderColor: colors.brutalInk,
        },
        chipText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
        },
        chipTextActive: {
            color: colors.brutalInk,
            fontFamily: FontFamily.bodyBold,
        },
    });

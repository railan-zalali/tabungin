import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SelectionChipProps {
    icon?: string;
    label: string;
    selected?: boolean;
    accentColor?: string;
    selectedIconColor?: string;
    selectedLabelColor?: string;
    onPress: () => void;
}

export function SelectionChip({
    icon,
    label,
    selected = false,
    accentColor,
    selectedIconColor,
    selectedLabelColor,
    onPress,
}: SelectionChipProps) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const accent = accentColor || colors.primary;

    return (
        <TouchableOpacity
            style={[
                styles.chip,
                selected
                    ? {
                        backgroundColor: colors.chipSelectedSurface,
                        borderColor: accentColor ? `${accent}66` : colors.chipSelectedBorder,
                    }
                    : null,
            ]}
            onPress={onPress}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
        >
            {icon ? (
                <View style={[styles.iconWrap, selected ? { backgroundColor: accent } : null]}>
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={15}
                        color={selected ? selectedIconColor || colors.textInverse : colors.textSecondary}
                    />
                </View>
            ) : null}
            <Text style={[styles.label, selected ? styles.labelSelected : null, selected && selectedLabelColor ? { color: selectedLabelColor } : null]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        chip: {
            minHeight: 42,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: colors.chipSurface,
        },
        iconWrap: {
            width: 28,
            height: 28,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.interactiveSoft,
        },
        label: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
        },
        labelSelected: {
            fontFamily: FontFamily.bodyBold,
            color: colors.textPrimary,
        },
    });

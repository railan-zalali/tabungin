import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SegmentOption<T extends string> {
    id: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    value: T;
    options: SegmentOption<T>[];
    onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
}: SegmentedControlProps<T>) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.container}>
            {options.map((option) => {
                const active = option.id === value;
                return (
                    <TouchableOpacity
                        key={option.id}
                        style={[styles.segment, active && styles.segmentActive]}
                        onPress={() => onChange(option.id)}
                    >
                        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceAlt,
            borderRadius: BorderRadius.xl,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 4,
        },
        segment: {
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            alignItems: 'center',
            borderRadius: BorderRadius.lg,
        },
        segmentActive: {
            backgroundColor: colors.background,
        },
        segmentLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            textAlign: 'center',
        },
        segmentLabelActive: {
            color: colors.textPrimary,
            fontFamily: FontFamily.bodyBold,
        },
    });

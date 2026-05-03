import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, scaleFontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';

interface SegmentOption<T extends string> {
    id: T;
    label: string;
    icon?: string;
    count?: number | string;
}

interface SegmentedControlProps<T extends string> {
    value: T;
    options: SegmentOption<T>[];
    onChange: (value: T) => void;
    scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    scrollable = false,
}: SegmentedControlProps<T>) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    const content = (
        <View style={[styles.container, scrollable && styles.containerScrollable]}>
            {options.map((option) => {
                const active = option.id === value;
                return (
                    <TouchableOpacity
                        key={option.id}
                        style={[styles.segment, scrollable && styles.segmentAuto, active && styles.segmentActive]}
                        onPress={() => onChange(option.id)}
                    >
                        <View style={styles.segmentInner}>
                            {option.icon ? (
                                <Text style={[styles.segmentIcon, active && styles.segmentLabelActive]}>{option.icon}</Text>
                            ) : null}
                            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
                            {option.count !== undefined ? (
                                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                                    <Text style={[styles.countText, active && styles.countTextActive]}>{option.count}</Text>
                                </View>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    if (scrollable) {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollableWrap}>
                {content}
            </ScrollView>
        );
    }

    return content;
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], textSize: ReturnType<typeof useTheme>['textSize']) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            backgroundColor: colors.brutalWhite,
            borderRadius: BorderRadius.md,
            padding: 4,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            gap: 4,
        },
        containerScrollable: {
            alignSelf: 'flex-start',
        },
        scrollableWrap: {
            paddingRight: 4,
        },
        segment: {
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            alignItems: 'center',
            borderRadius: BorderRadius.sm,
            borderWidth: 2,
            borderColor: 'transparent',
        },
        segmentAuto: {
            flex: 0,
            minWidth: 96,
        },
        segmentActive: {
            backgroundColor: colors.brutalLime,
            borderColor: colors.brutalInk,
            shadowOffset: { width: 3, height: 3 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 3,
        },
        segmentInner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        segmentIcon: {
            fontSize: scaleFontSize(FontSize.caption, textSize),
        },
        segmentLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: scaleFontSize(FontSize.caption, textSize),
            color: colors.textSecondary,
            textAlign: 'center',
        },
        segmentLabelActive: {
            color: colors.brutalInk,
            fontFamily: FontFamily.bodyBold,
        },
        countBadge: {
            minWidth: 22,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.brutalPaper,
            borderWidth: 1,
            borderColor: colors.brutalInk,
        },
        countBadgeActive: {
            backgroundColor: colors.brutalYellow,
        },
        countText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: scaleFontSize(FontSize.label, textSize),
            color: colors.textSecondary,
        },
        countTextActive: {
            color: colors.brutalInk,
        },
    });

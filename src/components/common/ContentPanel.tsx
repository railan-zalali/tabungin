import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';

interface ContentPanelProps extends ViewProps {
    children: React.ReactNode;
    compact?: boolean;
}

export function ContentPanel({ children, style, compact = false, ...rest }: ContentPanelProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={[styles.panel, compact ? styles.compact : null, style]} {...rest}>
            {children}
        </View>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        panel: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 14,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 3,
        },
        compact: {
            padding: 14,
            gap: 12,
        },
    });

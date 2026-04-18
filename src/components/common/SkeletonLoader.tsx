// Komponen SkeletonLoader dengan animasi shimmer
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';

interface SkeletonProps {
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const shimmer = useSharedValue(0);
    const { colors } = useTheme();

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1100, easing: Easing.ease }),
            -1,
            true
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: 0.3 + shimmer.value * 0.4,
    }));

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width: width as any, height, borderRadius, backgroundColor: colors.surfaceMuted },
                shimmerStyle,
                style,
            ]}
            accessible={true}
            accessibilityLabel="Memuat..."
            accessibilityLiveRegion="polite"
        />
    );
}

// Preset untuk transaction item skeleton
export function TransactionItemSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[styles.transactionItem, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={styles.transactionContent}>
                <Skeleton width="60%" height={14} />
                <View style={{ height: 6 }} />
                <Skeleton width="40%" height={12} />
            </View>
            <Skeleton width={80} height={16} />
        </View>
    );
}

// Preset untuk saving goal card skeleton
export function SavingGoalCardSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[styles.goalCard, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.goalHeader}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton width="70%" height={16} />
                    <Skeleton width="50%" height={12} />
                </View>
            </View>
            <View style={{ height: 12 }} />
            <Skeleton width="100%" height={8} borderRadius={4} />
            <View style={{ height: 8 }} />
            <Skeleton width="40%" height={12} />
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {},
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: BorderRadius['3xl'],
    },
    transactionContent: { flex: 1 },
    goalCard: {
        borderRadius: BorderRadius['3xl'],
        padding: 16,
        marginBottom: 12,
    },
    goalHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});

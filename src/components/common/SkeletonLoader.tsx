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
import { Colors } from '../../constants/colors';

interface SkeletonProps {
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1000, easing: Easing.ease }),
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
                { width: width as any, height, borderRadius },
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
    return (
        <View style={styles.transactionItem}>
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
    return (
        <View style={styles.goalCard}>
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
    skeleton: {
        backgroundColor: Colors.border,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: Colors.surface,
    },
    transactionContent: { flex: 1 },
    goalCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    goalHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});

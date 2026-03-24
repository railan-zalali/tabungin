// Komponen item transaksi dengan swipe-to-delete dan long-press menu
import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FontFamily, FontSize } from '../../constants/typography';
import type { Transaction } from '../../types/transaction';
import { formatRupiah } from '../../utils/currency';
import { BorderRadius } from '../../constants/theme';

import { useAuthStore } from '../../store/useAuthStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTheme } from '../../store/useThemeStore';
import { resolveCategoryByKey } from '../../utils/categoryResolver';

interface TransactionItemProps {
    transaction: Transaction;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onPress?: (transaction: Transaction) => void;
}

const DELETE_THRESHOLD = -80;

export function TransactionItem({ transaction, onDelete, onEdit, onPress }: TransactionItemProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const translateX = useSharedValue(0);
    const hapticEnabled = useAuthStore((s) => s.hapticEnabled);
    const categories = useCategoryStore((s) => s.categories);

    const category = resolveCategoryByKey(transaction.category, categories);
    const isIncome = transaction.type === 'income';

    const handleDelete = useCallback(() => {
        Alert.alert(
            'Hapus Transaksi',
            'Yakin ingin menghapus transaksi ini?',
            [
                { text: 'Batal', style: 'cancel', onPress: () => { translateX.value = withSpring(0); } },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: () => {
                        if (hapticEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        onDelete?.(transaction.id);
                    },
                },
            ]
        );
    }, [transaction.id, onDelete, hapticEnabled]);

    const handleLongPress = useCallback(() => {
        if (hapticEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Pilihan', '', [
            { text: 'Edit', onPress: () => onEdit?.(transaction.id) },
            { text: 'Hapus', style: 'destructive', onPress: () => onDelete?.(transaction.id) },
            { text: 'Batal', style: 'cancel' },
        ]);
    }, [transaction.id, onDelete, onEdit, hapticEnabled]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
            if (e.translationX < 0) {
                translateX.value = Math.max(e.translationX, DELETE_THRESHOLD * 1.2);
            }
        })
        .onEnd((e) => {
            if (e.translationX < DELETE_THRESHOLD) {
                translateX.value = withTiming(DELETE_THRESHOLD, {}, () => {
                    runOnJS(handleDelete)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.wrapper}>
            {/* Background hapus — terlihat saat diswipe */}
            <View style={styles.deleteBackground} accessibilityElementsHidden={true}>
                <MaterialCommunityIcons name="trash-can" size={24} color={colors.textInverse} />
                <Text style={styles.deleteText}>Hapus</Text>
            </View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.container, animatedStyle]}>
                    <TouchableOpacity
                        style={styles.inner}
                        onPress={() => onPress?.(transaction)}
                        onLongPress={handleLongPress}
                        delayLongPress={400}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Transaksi ${isIncome ? 'pemasukan' : 'pengeluaran'} ${category?.name ?? transaction.category}, ${formatRupiah(transaction.amount)}`}
                        accessibilityHint="Ketuk dua kali untuk melihat detail. Tahan untuk opsi edit dan hapus. Geser kiri untuk hapus"
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: isIncome ? colors.successLight : colors.dangerLight },
                            ]}
                            accessibilityElementsHidden={true}
                        >
                            <MaterialCommunityIcons
                                name={(category?.icon ?? 'cash') as any}
                                size={22}
                                color={isIncome ? colors.success : colors.danger}
                            />
                        </View>

                        <View style={styles.info}>
                            <Text style={styles.categoryName} allowFontScaling={true} numberOfLines={1}>
                                {category?.name ?? transaction.category}
                            </Text>
                            {transaction.note && (
                                <Text style={styles.note} allowFontScaling={true} numberOfLines={1}>
                                    {transaction.note}
                                </Text>
                            )}
                        </View>

                        {/* Amount dengan warna + teks prefix — WCAG triple redundancy */}
                        <View
                            style={[
                                styles.amountContainer,
                                {
                                    backgroundColor: isIncome ? colors.successBg : colors.dangerBg,
                                    borderColor: isIncome ? `${colors.success}1F` : `${colors.danger}1F`,
                                },
                            ]}
                        >
                            <Text
                                style={[styles.amount, { color: isIncome ? colors.success : colors.danger }]}
                                allowFontScaling={true}
                                accessibilityLabel={`${isIncome ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(transaction.amount)}`}
                            >
                                {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}



const getStyles = (colors: any) => StyleSheet.create({
    wrapper: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: BorderRadius['3xl'],
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 8,
    },
    deleteText: {
        color: colors.textInverse,
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
    },
    container: {
        backgroundColor: colors.surfaceCard,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 76,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${colors.glassStroke}`,
    },
    info: { flex: 1, gap: 4 },
    categoryName: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: colors.textPrimary,
    },
    note: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    amountContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    amount: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
    },
});

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
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { Transaction } from '../../types/transaction';
import { formatRupiah } from '../../utils/currency';

import { getCategoryById } from '../../constants/categories';
import { useAuthStore } from '../../store/useAuthStore';

interface TransactionItemProps {
    transaction: Transaction;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onPress?: (transaction: Transaction) => void;
}

const DELETE_THRESHOLD = -80;

export function TransactionItem({ transaction, onDelete, onEdit, onPress }: TransactionItemProps) {
    const translateX = useSharedValue(0);
    const hapticEnabled = useAuthStore((s) => s.hapticEnabled);

    const category = getCategoryById(transaction.category);
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
                <MaterialCommunityIcons name="trash-can" size={24} color={Colors.textInverse} />
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
                        {/* Ikon kategori — WCAG: icon + warna + teks */}
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: isIncome ? Colors.successLight : Colors.dangerLight },
                            ]}
                            accessibilityElementsHidden={true}
                        >
                            <MaterialCommunityIcons
                                name={(category?.icon ?? 'cash') as any}
                                size={22}
                                color={isIncome ? Colors.success : Colors.danger}
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
                        <View style={styles.amountContainer}>
                            <Text
                                style={[styles.amount, { color: isIncome ? Colors.success : Colors.danger }]}
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



const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: Colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    deleteText: {
        color: Colors.textInverse,
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
    },
    container: {
        backgroundColor: Colors.surface,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 72,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: { flex: 1, gap: 3 },
    categoryName: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
    },
    note: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
    },
    amountContainer: { alignItems: 'flex-end' },
    amount: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
    },
});

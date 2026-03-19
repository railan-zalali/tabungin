// Transaction Detail Screen
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useTransactionStore } from '../../store/useTransactionStore';
import { getCategoryById } from '../../constants/categories';
import { formatRupiah } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';

export function TransactionDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { transactions, removeTransaction } = useTransactionStore();
    const transaction = transactions.find((t) => t.id === route.params?.transactionId);
    const category = transaction ? getCategoryById(transaction.category) : null;

    if (!transaction) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text style={styles.notFound} allowFontScaling={true}>Transaksi tidak ditemukan</Text>
            </SafeAreaView>
        );
    }

    const isIncome = transaction.type === 'income';

    const handleDelete = () => {
        Alert.alert('Hapus Transaksi', 'Yakin ingin menghapus transaksi ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive',
                onPress: async () => { await removeTransaction(transaction.id); navigation.goBack(); }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Kembali"
                >
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} allowFontScaling={true} accessibilityRole="header">Detail Transaksi</Text>
                <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.deleteBtn}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus transaksi"
                >
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.danger} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero */}
                <View style={[styles.heroCard, { backgroundColor: isIncome ? Colors.successLight : Colors.dangerLight }]}>
                    <View style={[styles.heroIcon, { backgroundColor: isIncome ? Colors.success : Colors.danger }]}>
                        <MaterialCommunityIcons name={(category?.icon ?? 'cash') as any} size={36} color={Colors.textInverse} accessibilityElementsHidden={true} />
                    </View>
                    <Text style={[styles.heroAmount, { color: isIncome ? Colors.success : Colors.danger }]} allowFontScaling={true} accessibilityLiveRegion="polite">
                        {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
                    </Text>
                    <View style={styles.typePill} accessible={true} accessibilityLabel={isIncome ? 'Pemasukan' : 'Pengeluaran'}>
                        <MaterialCommunityIcons name={isIncome ? 'arrow-up' : 'arrow-down'} size={14} color={isIncome ? Colors.success : Colors.danger} accessibilityElementsHidden={true} />
                        <Text style={[styles.typePillText, { color: isIncome ? Colors.success : Colors.danger }]} allowFontScaling={true}>
                            {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                        </Text>
                    </View>
                </View>

                {/* Detail Info */}
                <View style={[styles.detailCard, Shadow.sm]}>
                    {[
                        { label: 'Kategori', value: category?.name ?? transaction.category, icon: category?.icon ?? 'tag' },
                        { label: 'Tanggal', value: formatDateLong(transaction.date), icon: 'calendar' },
                        { label: 'Catatan', value: transaction.note ?? '-', icon: 'note-text' },
                    ].map((item) => (
                        <View key={item.label} style={styles.detailRow}>
                            <MaterialCommunityIcons name={item.icon as any} size={18} color={Colors.textSecondary} accessibilityElementsHidden={true} />
                            <View style={styles.detailInfo}>
                                <Text style={styles.detailLabel} allowFontScaling={true}>{item.label}</Text>
                                <Text style={styles.detailValue} allowFontScaling={true}>{item.value}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    deleteBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 16 },
    notFound: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textSecondary, textAlign: 'center', padding: 40 },
    heroCard: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 12 },
    heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    heroAmount: { fontFamily: FontFamily.heading, fontSize: 32, textAlign: 'center' },
    typePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    typePillText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption },
    detailCard: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.divider },
    detailInfo: { flex: 1 },
    detailLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    detailValue: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textPrimary, marginTop: 2 },
});


import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useWalletStore } from '../../store/useWalletStore';
import { formatCurrency } from '../../utils/currency';
import { EmptyState } from '../../components/common/EmptyState';

export function WalletListScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { wallets, loadWallets, removeWallet } = useWalletStore();

    React.useEffect(() => {
        loadWallets();
    }, []);

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Hapus Dompet',
            `Yakin ingin menghapus "${name}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                { 
                    text: 'Hapus', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await removeWallet(id);
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Gagal menghapus dompet.');
                        }
                    } 
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            onPress={() => navigation.navigate('AddWallet', { wallet: item })}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <MaterialCommunityIcons 
                    name={item.type === 'bank' ? 'bank' : item.type === 'e-wallet' ? 'cellphone' : 'wallet'} 
                    size={24} 
                    color={item.color} 
                />
            </View>
            <View style={styles.info}>
                <View style={styles.headerRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.is_default && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Utama</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.balance}>{formatCurrency(item.balance)}</Text>
            </View>
            <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id, item.name)}
                disabled={item.is_default}
            >
                <MaterialCommunityIcons 
                    name="trash-can-outline" 
                    size={20} 
                    color={item.is_default ? Colors.textDisabled : Colors.danger} 
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Dompet Saya</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AddWallet')} style={styles.addBtn}>
                    <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={wallets}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <EmptyState
                        icon="wallet-outline"
                        title="Belum ada dompet"
                        message="Tambahkan dompet pertama Anda untuk mulai mencatat keuangan."
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 8, marginLeft: -8 },
    addBtn: { padding: 8, marginRight: -8 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h4, color: Colors.textPrimary },
    list: { padding: 20, gap: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: { flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.textPrimary },
    badge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.primary },
    balance: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    deleteBtn: { padding: 8 },
});

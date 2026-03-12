
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { useWalletStore } from '../../store/useWalletStore';
import { formatCurrencyInput, parseCurrencyInput } from '../../utils/currency';

const WALLET_TYPES = [
    { id: 'general', label: 'Umum', icon: 'wallet' },
    { id: 'cash', label: 'Tunai', icon: 'cash' },
    { id: 'bank', label: 'Bank', icon: 'bank' },
    { id: 'e-wallet', label: 'E-Wallet', icon: 'cellphone' },
];

const COLORS = ['#1DB954', '#F5A623', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#6B7280'];

export function AddWalletScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const wallet = route.params?.wallet;
    const isEditing = !!wallet;

    const { addWallet, editWallet } = useWalletStore();

    const [name, setName] = useState(wallet?.name || '');
    const [type, setType] = useState(wallet?.type || 'general');
    const [color, setColor] = useState(wallet?.color || COLORS[0]);
    const [balance, setBalance] = useState(wallet ? formatCurrencyInput(wallet.balance) : '0');
    const [isDefault, setIsDefault] = useState(wallet?.is_default || false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Nama dompet tidak boleh kosong');
            return;
        }

        try {
            setIsLoading(true);
            const balanceValue = parseCurrencyInput(balance);

            if (isEditing) {
                await editWallet(wallet.id, {
                    name,
                    type,
                    color,
                    balance: balanceValue, // Update saldo via edit wallet (hati-hati, biasanya via transaksi)
                    is_default: isDefault,
                });
            } else {
                await addWallet({
                    name,
                    type,
                    color,
                    balance: balanceValue,
                    is_default: isDefault,
                });
            }
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Gagal menyimpan dompet');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{isEditing ? 'Edit Dompet' : 'Tambah Dompet'}</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isLoading}>
                    <MaterialCommunityIcons name="check" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.label}>Nama Dompet</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Contoh: Dompet Utama"
                        placeholderTextColor={Colors.textDisabled}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Saldo Awal</Text>
                    <TextInput
                        style={styles.input}
                        value={balance}
                        onChangeText={(text) => setBalance(formatCurrencyInput(parseCurrencyInput(text)))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={Colors.textDisabled}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Jenis</Text>
                    <View style={styles.typesRow}>
                        {WALLET_TYPES.map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
                                onPress={() => setType(t.id)}
                            >
                                <MaterialCommunityIcons 
                                    name={t.icon as any} 
                                    size={24} 
                                    color={type === t.id ? Colors.primary : Colors.textSecondary} 
                                />
                                <Text style={[styles.typeText, type === t.id && styles.typeTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Warna</Text>
                    <View style={styles.colorsRow}>
                        {COLORS.map((c) => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
                                onPress={() => setColor(c)}
                            >
                                {color === c && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Jadikan Utama</Text>
                    <Switch
                        value={isDefault}
                        onValueChange={setIsDefault}
                        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                        thumbColor={isDefault ? Colors.primary : Colors.textDisabled}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 8, marginLeft: -8 },
    saveBtn: { padding: 8, marginRight: -8 },
    title: { fontFamily: FontFamily.heading, fontSize: FontSize.h4, color: Colors.textPrimary },
    content: { padding: 20, gap: 24 },
    section: { gap: 8 },
    label: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.textSecondary },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    typeBtn: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    typeText: { fontFamily: FontFamily.body, color: Colors.textSecondary },
    typeTextActive: { fontFamily: FontFamily.bodyBold, color: Colors.primary },
    colorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    colorBtnActive: { borderWidth: 2, borderColor: Colors.surface, elevation: 4 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: 16, borderRadius: 12 },
});

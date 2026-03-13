
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useWalletStore } from '../../store/useWalletStore';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { Shadow } from '../../constants/theme';
import { WalletMemberList } from '../../components/wallet/WalletMemberList';

const WALLET_TYPES = [
    { id: 'general', label: 'Umum', icon: 'wallet-outline' },
    { id: 'cash', label: 'Tunai', icon: 'cash' },
    { id: 'bank', label: 'Bank', icon: 'bank-outline' },
    { id: 'e-wallet', label: 'E-Wallet', icon: 'cellphone' },
];

const COLORS = [
    '#16A34A', // Green
    '#F59E0B', // Orange
    '#2563EB', // Blue
    '#7C3AED', // Purple
    '#DB2777', // Pink
    '#DC2626', // Red
    '#4B5563', // Gray
    '#0891B2', // Cyan
];

export function AddWalletScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const wallet = route.params?.wallet;
    const isEditing = !!wallet;

    const { addWallet, editWallet } = useWalletStore();

    const [name, setName] = useState(wallet?.name || '');
    const [type, setType] = useState(wallet?.type || 'general');
    const [color, setColor] = useState(wallet?.color || COLORS[0]);
    const [balance, setBalance] = useState(wallet ? formatInputRupiah(wallet.balance.toString()) : '0');
    const [isDefault, setIsDefault] = useState(wallet?.is_default || false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Perhatian', 'Nama dompet tidak boleh kosong');
            return;
        }

        try {
            setIsLoading(true);
            const balanceValue = parseRupiah(balance);

            if (isEditing) {
                await editWallet(wallet.id, {
                    name,
                    type,
                    color,
                    balance: balanceValue,
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
        } catch (e: any) {
            Alert.alert('Gagal', e.message || 'Gagal menyimpan dompet');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: Colors.background }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.backBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Edit Dompet' : 'Tambah Dompet'}</Text>
                    <TouchableOpacity 
                        onPress={handleSave} 
                        style={[styles.saveBtn, isLoading && { opacity: 0.5 }]} 
                        disabled={isLoading}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons name="check" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Preview Card */}
                    <View style={[styles.previewCard, { backgroundColor: color }, Shadow.md]}>
                        <View style={styles.previewHeader}>
                            <View style={styles.previewIconBadge}>
                                <MaterialCommunityIcons 
                                    name={WALLET_TYPES.find(t => t.id === type)?.icon as any || 'wallet'} 
                                    size={24} 
                                    color={color} 
                                />
                            </View>
                            {isDefault && (
                                <View style={styles.previewDefaultBadge}>
                                    <MaterialCommunityIcons name="star" size={12} color="#FFF" />
                                    <Text style={styles.previewDefaultText}>Utama</Text>
                                </View>
                            )}
                        </View>
                        <View>
                            <Text style={styles.previewName}>{name || 'Nama Dompet'}</Text>
                            <Text style={styles.previewBalance}>Rp {balance || '0'}</Text>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nama Dompet</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Contoh: Dompet Utama"
                                placeholderTextColor={Colors.textDisabled}
                                autoFocus={!isEditing}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Saldo Awal</Text>
                            <View style={styles.currencyInputContainer}>
                                <Text style={styles.currencyPrefix}>Rp</Text>
                                <TextInput
                                    style={styles.currencyInput}
                                    value={balance}
                                    onChangeText={(text) => setBalance(formatInputRupiah(text))}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Jenis Dompet</Text>
                            <View style={styles.typesRow}>
                                {WALLET_TYPES.map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[
                                            styles.typeBtn, 
                                            type === t.id && styles.typeBtnActive,
                                            type === t.id && { borderColor: Colors.primary, backgroundColor: Colors.primaryBg }
                                        ]}
                                        onPress={() => setType(t.id)}
                                    >
                                        <MaterialCommunityIcons 
                                            name={t.icon as any} 
                                            size={24} 
                                            color={type === t.id ? Colors.primary : Colors.textSecondary} 
                                        />
                                        <Text style={[styles.typeText, type === t.id && { color: Colors.primary, fontFamily: FontFamily.bodyBold }]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Warna Penanda</Text>
                            <View style={styles.colorsRow}>
                                {COLORS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorBtn, { backgroundColor: c }]}
                                        onPress={() => setColor(c)}
                                    >
                                        {color === c && (
                                            <View style={styles.checkIcon}>
                                                <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.switchContainer}>
                            <View style={styles.switchTextContainer}>
                                <Text style={styles.switchLabel}>Jadikan Dompet Utama</Text>
                                <Text style={styles.switchDescription}>
                                    Transaksi otomatis akan menggunakan dompet ini kecuali dipilih yang lain.
                                </Text>
                            </View>
                            <Switch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                trackColor={{ false: Colors.neutral300, true: Colors.primaryLight }}
                                thumbColor={isDefault ? Colors.primary : '#FFF'}
                            />
                        </View>

                        {/* Team / Shared Wallet Section */}
                        {isEditing && (
                            <View style={{ marginTop: 8 }}>
                                <WalletMemberList walletId={wallet.id} />
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    backBtn: { padding: 4 },
    saveBtn: { 
        padding: 4,
        backgroundColor: Colors.primaryBg,
        borderRadius: 8,
    },
    title: { 
        ...Typography.h3,
        color: Colors.textPrimary 
    },
    
    content: { padding: 20, paddingBottom: 40 },
    
    previewCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 32,
        minHeight: 140,
        justifyContent: 'space-between',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    previewIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewDefaultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
    },
    previewDefaultText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: 10,
        color: '#FFF',
    },
    previewName: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
    },
    previewBalance: {
        fontFamily: FontFamily.heading,
        fontSize: 28,
        color: '#FFF',
    },
    
    formSection: { gap: 24 },
    inputGroup: { gap: 8 },
    label: { 
        fontFamily: FontFamily.bodyBold, 
        fontSize: FontSize.body, 
        color: Colors.textSecondary 
    },
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
    
    currencyInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
    },
    currencyPrefix: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: Colors.textSecondary,
        marginRight: 8,
    },
    currencyInput: {
        flex: 1,
        paddingVertical: 16,
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: Colors.textPrimary,
    },
    
    typesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    typeBtn: {
        width: '48%',
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
    typeBtnActive: { borderWidth: 1.5 },
    typeText: { fontFamily: FontFamily.body, color: Colors.textSecondary },
    
    colorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    checkIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    switchTextContainer: { flex: 1, marginRight: 16 },
    switchLabel: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    switchDescription: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
});

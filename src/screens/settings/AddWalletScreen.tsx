import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWalletStore } from '../../store/useWalletStore';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { WalletMemberList } from '../../components/wallet/WalletMemberList';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { AppAccentPalette } from '../../constants/colors';
import { getReadableTextColor } from '../../utils/colorContrast';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SelectionChip } from '../../components/common/SelectionChip';
import { StatStrip } from '../../components/common/StatStrip';
import { useResponsiveMetrics } from '../../utils/responsive';
import { useProfileStore } from '../../store/useProfileStore';
import { getWalletCapabilities } from '../../utils/walletPermissions';

const WALLET_TYPES = [
    { id: 'general', label: 'Umum', icon: 'wallet-outline' },
    { id: 'cash', label: 'Tunai', icon: 'cash' },
    { id: 'bank', label: 'Bank', icon: 'bank-outline' },
    { id: 'e-wallet', label: 'E-Wallet', icon: 'cellphone' },
] as const;

const COLORS = [...AppAccentPalette];

export function AddWalletScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { wallets, walletRoles, addWallet, editWallet, loadWallets } = useWalletStore();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const routeWallet = route.params?.wallet;
    const currentWallet = routeWallet ? wallets.find((wallet: any) => wallet.id === routeWallet.id) || routeWallet : null;
    const isEditing = !!currentWallet;
    const walletCapabilities = getWalletCapabilities({
        wallet: currentWallet,
        activeProfileId,
        membershipRole: currentWallet ? walletRoles[currentWallet.id] ?? null : null,
    });
    const isReadOnly = isEditing && walletCapabilities.isReadOnly;
    const canEditWallet = !isEditing || walletCapabilities.canEditWallet;

    const [name, setName] = useState(currentWallet?.name || '');
    const [type, setType] = useState(currentWallet?.type || 'general');
    const [color, setColor] = useState(currentWallet?.color || COLORS[0]);
    const [balance, setBalance] = useState(currentWallet ? formatInputRupiah(currentWallet.balance.toString()) : '0');
    const [isDefault, setIsDefault] = useState(currentWallet?.is_default || false);
    const [isLoading, setIsLoading] = useState(false);

    const selectedType = WALLET_TYPES.find((item) => item.id === type);

    const handleSave = async () => {
        if (!canEditWallet) {
            Alert.alert('Akses terbatas', 'Dompet ini hanya bisa kamu lihat. Hubungi owner atau editor jika perlu perubahan.');
            return;
        }

        if (!name.trim()) {
            Alert.alert('Perhatian', 'Nama dompet tidak boleh kosong');
            return;
        }

        try {
            setIsLoading(true);
            const balanceValue = parseRupiah(balance);

            if (isEditing) {
                await editWallet(currentWallet.id, {
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

            await loadWallets();
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Gagal', error.message || 'Gagal menyimpan dompet');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader
                    title={isEditing ? 'Edit dompet' : 'Tambah dompet'}
                    subtitle={
                        isReadOnly
                            ? 'Kamu sedang melihat dompet bersama dalam mode read only.'
                            : 'Tentukan tipe, warna, dan perilaku dompet supaya konteks transaksi terasa lebih jelas.'
                    }
                    eyebrow="Wallet Setup"
                    showBack
                    onBackPress={() => navigation.goBack()}
                    variant="transparent"
                />

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: metrics.horizontalPadding,
                            paddingBottom: metrics.floatingActionClearance + 20,
                        },
                        metrics.widthClass !== 'compact' ? styles.contentWide : null,
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <HeroSummaryCard
                        eyebrow="Live Preview"
                        title={name || 'Dompet baru'}
                        value={`Rp ${balance || '0'}`}
                        description={
                            isReadOnly
                                ? 'Preview ini menampilkan kondisi dompet tanpa membuka jalur edit untuk role viewer.'
                                : 'Preview ini membantu memastikan nama, tipe, dan warna dompet sudah enak dibaca sebelum disimpan.'
                        }
                        icon={selectedType?.icon || 'wallet-outline'}
                        stats={[
                            { label: 'Tipe', value: selectedType?.label || 'Umum', icon: 'shape-outline' },
                            { label: 'Status', value: isDefault ? 'Utama' : 'Sekunder', icon: 'star-outline' },
                            { label: 'Mode', value: isEditing ? 'Edit' : 'Baru', icon: 'pencil-outline' },
                        ]}
                    />

                    <StatStrip
                        items={[
                            { label: 'Warna aktif', value: color.toUpperCase() },
                            { label: 'Saldo awal', value: `Rp ${balance || '0'}` },
                            { label: 'Default', value: isDefault ? 'Ya' : 'Tidak' },
                        ]}
                        vertical={metrics.widthClass === 'compact'}
                    />

                    <FormSection
                        eyebrow="Basics"
                        title="Informasi utama dompet"
                        subtitle="Nama dan saldo awal adalah dua hal pertama yang paling sering terlihat saat transaksi dibuat."
                        variant="highlight"
                    >
                        <Input
                            label="Nama dompet"
                            value={name}
                            onChangeText={setName}
                            leftIcon="wallet-outline"
                            placeholder="Contoh: Dompet Utama"
                            autoFocus={!isEditing}
                            editable={canEditWallet}
                        />
                        <Input
                            label="Saldo awal"
                            value={balance}
                            onChangeText={(value) => setBalance(formatInputRupiah(value))}
                            leftIcon="cash"
                            keyboardType="numeric"
                            placeholder="0"
                            hint="Nominal ini menjadi titik awal saldo dompet saat pertama dipakai."
                            editable={canEditWallet}
                        />
                    </FormSection>

                    <FormSection
                        eyebrow="Identity"
                        title="Tipe dan warna penanda"
                        subtitle="Gunakan kombinasi yang mudah dikenali supaya pemilihan dompet terasa cepat di flow transaksi."
                    >
                        <View style={styles.selectionWrap}>
                            {WALLET_TYPES.map((walletType) => (
                                <SelectionChip
                                    key={walletType.id}
                                    icon={walletType.icon}
                                    label={walletType.label}
                                    selected={type === walletType.id}
                                    onPress={() => {
                                        if (!canEditWallet) return;
                                        setType(walletType.id);
                                    }}
                                />
                            ))}
                        </View>

                        <Text style={styles.subLabel}>Warna penanda</Text>
                        <View style={styles.colorsRow}>
                            {COLORS.map((item) => {
                                const textColor = getReadableTextColor(item, {
                                    light: colors.textInverse,
                                    dark: colors.textPrimary,
                                });

                                return (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.colorBtn, { backgroundColor: item }, color === item ? styles.colorBtnActive : null]}
                                        onPress={() => {
                                            if (!canEditWallet) return;
                                            setColor(item);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Pilih warna ${item}`}
                                        accessibilityState={{ selected: color === item }}
                                    >
                                        {color === item ? <MaterialCommunityIcons name="check" size={18} color={textColor} /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <InlineNotice
                            icon="palette-outline"
                            description="Warna sebaiknya dipakai sebagai pembeda cepat, bukan dekorasi semata. Pilih warna yang kontras dan mudah dibedakan dari dompet lain."
                            tone="info"
                        />
                    </FormSection>

                    <FormSection
                        eyebrow="Behavior"
                        title="Peran dompet ini"
                        subtitle="Dompet utama akan dipilih otomatis di beberapa alur agar pencatatan terasa lebih cepat."
                        density="compact"
                    >
                        <View style={styles.switchContainer}>
                            <View style={styles.switchTextContainer}>
                                <Text style={styles.switchLabel}>Jadikan dompet utama</Text>
                                <Text style={styles.switchDescription}>
                                    Transaksi otomatis akan memakai dompet ini kecuali kamu memilih dompet lain secara manual.
                                </Text>
                            </View>
                            <Switch
                                value={isDefault}
                                onValueChange={(value) => {
                                    if (!canEditWallet) return;
                                    setIsDefault(value);
                                }}
                                trackColor={{ false: colors.neutral300, true: colors.primaryLight }}
                                thumbColor={isDefault ? colors.primary : colors.surfaceElevated}
                                disabled={!canEditWallet}
                            />
                        </View>
                    </FormSection>

                    {isEditing ? (
                        <FormSection
                            eyebrow="Members"
                            title="Anggota dompet"
                            subtitle="Kelola akses, undangan, dan konteks kolaborasi tanpa keluar dari layar pengaturan dompet."
                        >
                            <WalletMemberList
                                walletId={currentWallet.id}
                                currentUserRole={walletCapabilities.resolvedRole === 'owner' ? 'owner' : walletCapabilities.resolvedRole}
                                canInvite={walletCapabilities.canInviteMember}
                                canRemove={walletCapabilities.canRemoveMember}
                            />
                        </FormSection>
                    ) : null}
                </ScrollView>

                <PrimaryActionBar
                    primaryLabel={canEditWallet ? (isEditing ? 'Simpan perubahan' : 'Simpan dompet') : 'Mode read only'}
                    onPrimaryPress={handleSave}
                    primaryLoading={isLoading}
                    secondaryLabel="Batal"
                    onSecondaryPress={() => navigation.goBack()}
                    bottomInset={metrics.tabBarClearance}
                />
            </ScreenShell>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex1: { flex: 1 },
        content: { gap: 18 },
        contentWide: { width: '100%', maxWidth: 920, alignSelf: 'center' },
        selectionWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        subLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
        },
        colorsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        colorBtn: {
            width: 44,
            height: 44,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        colorBtnActive: {
            transform: [{ scale: 1.04 }],
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 4,
        },
        switchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surfaceElevated,
            padding: 16,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
        },
        switchTextContainer: { flex: 1, marginRight: 16 },
        switchLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginBottom: 2,
        },
        switchDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            lineHeight: 18,
        },
    });

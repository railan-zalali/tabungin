import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import type { TransactionNavigationProp, TransactionStackParamList } from '../../types/navigation';
import type { TransactionType } from '../../types/transaction';
import { formatInputRupiah, formatRupiah, parseRupiah } from '../../utils/currency';
import { formatDateLong } from '../../utils/date';
import { validateAmount } from '../../utils/validation';
import { resolveWalletContextMeta } from '../../utils/walletContext';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContentPanel } from '../../components/common/ContentPanel';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatePanel } from '../../components/common/StatePanel';
import { CategoryPicker } from '../../components/transaction/CategoryPicker';

type AddTransactionRouteProp = RouteProp<TransactionStackParamList, 'AddTransaction'>;

const TYPE_OPTIONS: Array<{
    id: TransactionType;
    label: string;
    icon: string;
}> = [
    { id: 'income', label: 'Pemasukan', icon: 'arrow-up-circle-outline' },
    { id: 'expense', label: 'Pengeluaran', icon: 'arrow-down-circle-outline' },
];

function InlineError({ message, color }: { message: string; color: string }) {
    return (
        <View style={stylesStatic.inlineErrorRow}>
            <MaterialCommunityIcons name="alert-circle" size={14} color={color} />
            <Text style={[stylesStatic.inlineErrorText, { color }]}>{message}</Text>
        </View>
    );
}

export function AddTransactionScreen() {
    const navigation = useNavigation<TransactionNavigationProp<'AddTransaction'>>();
    const route = useRoute<AddTransactionRouteProp>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { stickyFooterSpacing, contentBottomSpacing } = useScreenLayout();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const { addTransaction, editTransaction, getTransactionById, isLoading } = useTransactionStore();
    const { wallets, loadWallets } = useWalletStore();
    const loadCategories = useCategoryStore((state) => state.loadCategories);
    const categoryCount = useCategoryStore((state) => state.categories.length);
    const editId = route.params?.editId;
    const isEditMode = Boolean(editId);

    const [txType, setTxType] = useState<TransactionType>(route.params?.type ?? 'expense');
    const [amountInput, setAmountInput] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [isPrefilling, setIsPrefilling] = useState(false);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [walletError, setWalletError] = useState<string | null>(null);

    useEffect(() => {
        loadWallets().catch((error) => console.error('Failed to load wallets:', error));
    }, [loadWallets]);

    useEffect(() => {
        if (categoryCount === 0) {
            loadCategories().catch((error) => console.error('Failed to load categories:', error));
        }
    }, [categoryCount, loadCategories]);

    useEffect(() => {
        if (!selectedWalletId && wallets.length > 0) {
            const defaultWallet = wallets.find((wallet) => wallet.is_default);
            setSelectedWalletId(defaultWallet?.id || wallets[0].id);
        }
    }, [selectedWalletId, wallets]);

    useEffect(() => {
        let isMounted = true;

        async function loadTransactionForEdit() {
            if (!editId) return;

            setIsPrefilling(true);
            try {
                const transaction = await getTransactionById(editId);
                if (!transaction) {
                    Alert.alert('Transaksi tidak ditemukan', 'Data transaksi sudah tidak tersedia.');
                    navigation.goBack();
                    return;
                }

                if (!isMounted) return;

                setTxType(transaction.type);
                setAmountInput(formatInputRupiah(String(transaction.amount)));
                setCategory(transaction.category);
                setNote(transaction.note ?? '');
                setDate(new Date(transaction.date));
                setSelectedWalletId(transaction.wallet_id ?? '');
            } finally {
                if (isMounted) {
                    setIsPrefilling(false);
                }
            }
        }

        loadTransactionForEdit().catch((error) => {
            console.error('Failed to prefill transaction:', error);
            setIsPrefilling(false);
        });

        return () => {
            isMounted = false;
        };
    }, [editId, getTransactionById, navigation]);

    const amount = parseRupiah(amountInput);
    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);
    const walletContext = resolveWalletContextMeta(selectedWallet, activeProfileId);
    const accentColor = txType === 'income' ? colors.success : colors.danger;
    const accentBg = txType === 'income' ? colors.successBg : colors.dangerBg;
    const isFormReady = amount > 0 && Boolean(category) && Boolean(selectedWalletId);

    const handleDateChange = (_event: unknown, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSave = async () => {
        let valid = true;
        const nextAmountError = validateAmount(amount);

        if (nextAmountError) {
            setAmountError(nextAmountError);
            valid = false;
        }

        if (!selectedWalletId) {
            setWalletError('Pilih dompet dulu supaya transaksi masuk ke konteks yang benar.');
            valid = false;
        }

        if (!category) {
            setCategoryError('Pilih kategori dulu supaya ringkasan dan laporan tetap presisi.');
            valid = false;
        }

        if (!valid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const payload = {
            type: txType,
            amount,
            category,
            note: note.trim() || null,
            date: date.getTime(),
            wallet_id: selectedWalletId,
        };

        if (isEditMode && editId) {
            await editTransaction(editId, payload);
        } else {
            await addTransaction(payload);
        }

        loadWallets().catch(console.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
    };

    return (
        <ScreenShell topInset={false} bottomInset={false} surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <AppScreenHeader
                    title={isEditMode ? 'Edit transaksi' : 'Tambah transaksi'}
                    subtitle={
                        isEditMode
                            ? 'Rapikan nominal, kategori, dan konteks dompet tanpa keluar dari flow utama.'
                            : 'Catat arus uang harian dengan urutan yang cepat dan tetap jelas.'
                    }
                    showClose
                    onClosePress={() => navigation.goBack()}
                    variant="transparent"
                />

                {isPrefilling ? (
                    <View style={styles.centerState}>
                        <StatePanel
                            icon="progress-clock"
                            title="Menyiapkan data transaksi"
                            description="Detail transaksi sedang dimuat supaya kamu bisa langsung mengoreksi bagian yang perlu."
                            loading
                        />
                    </View>
                ) : wallets.length === 0 ? (
                    <View style={styles.centerState}>
                        <EmptyState
                            icon="wallet-outline"
                            title="Belum ada dompet aktif"
                            description="Tambahkan dompet dulu agar transaksi bisa dicatat ke konteks personal atau bersama yang tepat."
                            actionLabel="Atur dompet"
                            onAction={() => navigation.navigate('Wallet', { screen: 'AddWallet' })}
                        />
                    </View>
                ) : (
                    <>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={[styles.content, { paddingBottom: stickyFooterSpacing + contentBottomSpacing }]}
                        >
                            <ContentPanel style={styles.heroPanel}>
                                <View style={styles.heroTopRow}>
                                    <View style={styles.heroCopy}>
                                        <Text style={styles.eyebrow}>Flow cepat harian</Text>
                                        <Text style={styles.heroTitle}>
                                            {txType === 'income' ? 'Pemasukan masuk lebih rapi' : 'Pengeluaran tercatat tanpa ribet'}
                                        </Text>
                                    </View>
                                    <View style={[styles.heroIconWrap, { backgroundColor: accentBg }]}>
                                        <MaterialCommunityIcons
                                            name={txType === 'income' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                                            size={24}
                                            color={accentColor}
                                        />
                                    </View>
                                </View>

                                <View style={styles.typeToggleContainer}>
                                    {TYPE_OPTIONS.map((option) => {
                                        const active = option.id === txType;
                                        const optionAccent = option.id === 'income' ? colors.success : colors.danger;
                                        const optionBg = option.id === 'income' ? colors.successBg : colors.dangerBg;

                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                style={[
                                                    styles.typeBtn,
                                                    active
                                                        ? {
                                                              backgroundColor: optionAccent,
                                                              borderColor: optionAccent,
                                                          }
                                                        : null,
                                                ]}
                                                onPress={() => {
                                                    setTxType(option.id);
                                                    setCategory('');
                                                    setCategoryError(null);
                                                    setAmountError(null);
                                                }}
                                            >
                                                <View style={[styles.typeIconWrap, !active ? { backgroundColor: optionBg } : null]}>
                                                    <MaterialCommunityIcons
                                                        name={option.icon as any}
                                                        size={18}
                                                        color={active ? colors.textInverse : optionAccent}
                                                    />
                                                </View>
                                                <Text style={[styles.typeBtnText, active ? styles.typeBtnTextActive : null]}>
                                                    {option.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={styles.amountSection}>
                                    <Text style={styles.fieldLabel}>Nominal</Text>
                                    <View
                                        style={[
                                            styles.amountContainer,
                                            { borderColor: amountError ? colors.danger : colors.border },
                                        ]}
                                    >
                                        <Text style={styles.currencyPrefix}>Rp</Text>
                                        <TextInput
                                            style={[styles.amountInput, amountInput.length > 11 ? styles.amountInputCompact : null]}
                                            value={amountInput}
                                            onChangeText={(text) => {
                                                setAmountInput(formatInputRupiah(text));
                                                setAmountError(null);
                                            }}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={colors.textDisabled}
                                            autoFocus={!isEditMode}
                                        />
                                    </View>
                                    {amountError ? <InlineError message={amountError} color={colors.danger} /> : null}
                                </View>

                                <View style={styles.heroBadgeRow}>
                                    <ContextBadge icon="calendar-blank-outline" label={formatDateLong(date.getTime())} tone="neutral" />
                                    <ContextBadge icon={walletContext.icon} label={walletContext.label} tone={walletContext.tone} />
                                </View>
                            </ContentPanel>

                            <ContentPanel>
                                <SectionHeader
                                    title="Konteks transaksi"
                                    subtitle="Pastikan transaksi masuk ke dompet yang tepat sebelum memilih kategori."
                                />

                                <View style={styles.walletList}>
                                    {wallets.map((wallet) => {
                                        const active = wallet.id === selectedWalletId;
                                        const contextMeta = resolveWalletContextMeta(wallet, activeProfileId);
                                        return (
                                            <TouchableOpacity
                                                key={wallet.id}
                                                style={[
                                                    styles.walletBtn,
                                                    active
                                                        ? {
                                                              borderColor: wallet.color,
                                                              backgroundColor: colors.primaryBg,
                                                          }
                                                        : null,
                                                ]}
                                                onPress={() => {
                                                    setSelectedWalletId(wallet.id);
                                                    setWalletError(null);
                                                }}
                                            >
                                                <View
                                                    style={[
                                                        styles.walletIconBg,
                                                        { backgroundColor: active ? wallet.color : colors.surfaceAlt },
                                                    ]}
                                                >
                                                    <MaterialCommunityIcons
                                                        name={
                                                            wallet.type === 'bank'
                                                                ? 'bank-outline'
                                                                : wallet.type === 'e-wallet'
                                                                  ? 'cellphone'
                                                                  : wallet.type === 'cash'
                                                                    ? 'cash'
                                                                    : 'wallet-outline'
                                                        }
                                                        size={18}
                                                        color={active ? colors.textInverse : colors.textSecondary}
                                                    />
                                                </View>
                                                <View style={styles.walletCopy}>
                                                    <Text style={styles.walletName}>{wallet.name}</Text>
                                                    <Text style={styles.walletMeta}>
                                                        {contextMeta.label} · {formatRupiah(wallet.balance || 0)}
                                                    </Text>
                                                </View>
                                                {wallet.is_default ? (
                                                    <MaterialCommunityIcons name="star-outline" size={16} color={colors.warning} />
                                                ) : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {walletError ? <InlineError message={walletError} color={colors.danger} /> : null}
                                {selectedWallet ? (
                                    <ContextBadge
                                        icon={walletContext.icon}
                                        label={walletContext.description}
                                        tone={walletContext.tone}
                                    />
                                ) : null}
                            </ContentPanel>

                            <ContentPanel>
                                <SectionHeader
                                    title="Kategori dan waktu"
                                    subtitle="Tambahkan penanda yang membuat laporan dan evaluasi bulanan tetap presisi."
                                />

                                <View style={styles.dateRow}>
                                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                                        <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.primary} />
                                        <View style={styles.dateCopy}>
                                            <Text style={styles.dateLabel}>Tanggal transaksi</Text>
                                            <Text style={styles.dateText}>{formatDateLong(date.getTime())}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                                {showDatePicker ? (
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                    />
                                ) : null}

                                <View style={styles.labelRow}>
                                    <Text style={styles.fieldLabel}>Kategori</Text>
                                    {categoryError ? <Text style={styles.errorTextInline}>{categoryError}</Text> : null}
                                </View>
                                <CategoryPicker
                                    type={txType}
                                    selectedCategory={category}
                                    onSelect={(categoryId) => {
                                        setCategory(categoryId);
                                        setCategoryError(null);
                                    }}
                                />
                            </ContentPanel>

                            <ContentPanel>
                                <SectionHeader
                                    title="Catatan tambahan"
                                    subtitle="Opsional, tetapi berguna saat kamu meninjau transaksi ini lagi nanti."
                                />
                                <TextInput
                                    style={styles.noteInput}
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Contoh: makan siang tim, transfer klien, atau top up darurat."
                                    placeholderTextColor={colors.textDisabled}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </ContentPanel>
                        </ScrollView>

                        <PrimaryActionBar
                            primaryLabel={isEditMode ? 'Simpan perubahan' : 'Simpan transaksi'}
                            onPrimaryPress={handleSave}
                            primaryLoading={isLoading}
                            primaryDisabled={isLoading || !isFormReady}
                        />
                    </>
                )}
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const stylesStatic = StyleSheet.create({
    inlineErrorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    inlineErrorText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        flex: 1,
    },
});

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex: { flex: 1 },
        centerState: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingBottom: 80,
        },
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        heroPanel: {
            gap: 18,
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
        },
        heroCopy: { flex: 1 },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: colors.primary,
        },
        heroTitle: {
            ...Typography.h3,
            color: colors.textPrimary,
            marginTop: 6,
        },
        heroIconWrap: {
            width: 48,
            height: 48,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        typeToggleContainer: {
            flexDirection: 'row',
            gap: 10,
        },
        typeBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 54,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        typeIconWrap: {
            width: 28,
            height: 28,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
        },
        typeBtnText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        typeBtnTextActive: {
            color: colors.textInverse,
        },
        amountSection: {
            gap: 8,
        },
        fieldLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.45,
        },
        amountContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 84,
            backgroundColor: colors.surface,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            paddingHorizontal: 18,
            gap: 12,
        },
        currencyPrefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h2,
            color: colors.textSecondary,
        },
        amountInput: {
            flex: 1,
            fontFamily: FontFamily.heading,
            fontSize: 34,
            color: colors.textPrimary,
            paddingVertical: 0,
        },
        amountInputCompact: {
            fontSize: 28,
        },
        heroBadgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        walletList: {
            gap: 10,
        },
        walletBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 14,
        },
        walletIconBg: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        walletCopy: {
            flex: 1,
        },
        walletName: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        walletMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        dateRow: {
            gap: 10,
        },
        dateBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        dateCopy: {
            flex: 1,
        },
        dateLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        dateText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            marginTop: 2,
        },
        labelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        errorTextInline: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
            flex: 1,
            textAlign: 'right',
        },
        noteInput: {
            minHeight: 112,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 16,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
    });

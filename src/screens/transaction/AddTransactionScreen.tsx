import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatDateLong } from '../../utils/date';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { validateAmount } from '../../utils/validation';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import type { TransactionType } from '../../types/transaction';
import { CategoryPicker } from '../../components/transaction/CategoryPicker';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { StatePanel } from '../../components/common/StatePanel';

export function AddTransactionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { addTransaction, editTransaction, getTransactionById, isLoading } = useTransactionStore();
    const { wallets, loadWallets } = useWalletStore();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const editId = route.params?.editId as string | undefined;
    const isEditMode = Boolean(editId);

    const [txType, setTxType] = useState<TransactionType>(route.params?.type ?? 'expense');
    const [amountInput, setAmountInput] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState<string>('');
    const [isPrefilling, setIsPrefilling] = useState(false);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    useEffect(() => {
        loadWallets();
    }, [loadWallets]);

    useEffect(() => {
        if (!selectedWalletId && wallets.length > 0) {
            const defaultWallet = wallets.find((wallet) => wallet.is_default);
            setSelectedWalletId(defaultWallet?.id || wallets[0].id);
        }
    }, [selectedWalletId, wallets]);

    useEffect(() => {
        let isMounted = true;

        const loadTransactionForEdit = async () => {
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
        };

        loadTransactionForEdit();

        return () => {
            isMounted = false;
        };
    }, [editId, getTransactionById, navigation]);

    const amount = parseRupiah(amountInput);
    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);

    const handleDateChange = (_event: any, selectedDate?: Date) => {
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

        if (!category) {
            setCategoryError('Pilih kategori terlebih dahulu');
            valid = false;
        }

        if (!selectedWalletId) {
            Alert.alert('Error', 'Pilih dompet terlebih dahulu');
            valid = false;
        }

        if (!valid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (isEditMode && editId) {
            await editTransaction(editId, {
                type: txType,
                amount,
                category,
                note: note.trim() || null,
                date: date.getTime(),
                wallet_id: selectedWalletId,
            });
        } else {
            await addTransaction({
                type: txType,
                amount,
                category,
                note: note.trim() || null,
                date: date.getTime(),
                wallet_id: selectedWalletId,
            });
        }

        await loadWallets();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <AppScreenHeader
                    title={isEditMode ? 'Edit Transaksi' : 'Tambah Transaksi'}
                    subtitle={isEditMode ? 'Perbarui detail transaksi tanpa mengubah struktur input.' : 'Simpan transaksi baru dengan konteks dompet dan kategori yang jelas.'}
                    showClose
                    onClosePress={() => navigation.goBack()}
                />

                {isPrefilling ? (
                    <View style={[styles.loadingWrap, { paddingHorizontal: metrics.horizontalPadding }]}>
                        <StatePanel
                            loading
                            title="Memuat transaksi"
                            description="Data transaksi sedang disiapkan agar siap diedit."
                        />
                    </View>
                ) : (
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.content,
                            {
                                paddingHorizontal: metrics.horizontalPadding,
                                paddingBottom: metrics.bottomActionInset + 24,
                            },
                        ]}
                    >
                        <FormSection
                            title="Ringkasan transaksi"
                            subtitle="Pilih jenis transaksi lalu isi nominal utama sebelum melengkapi konteks lainnya."
                        >
                            <SegmentedControl<TransactionType>
                                value={txType}
                                onChange={(value) => {
                                    setTxType(value);
                                    setCategory('');
                                    setCategoryError(null);
                                }}
                                options={[
                                    { id: 'income', label: 'Pemasukan' },
                                    { id: 'expense', label: 'Pengeluaran' },
                                ]}
                            />

                            <View style={[styles.amountCard, amountError ? styles.amountCardError : null]}>
                                <Text style={styles.amountLabel}>Nominal</Text>
                                <View style={styles.amountRow}>
                                    <Text style={styles.amountPrefix}>Rp</Text>
                                    <TextInput
                                        style={[styles.amountInput, { fontSize: amountInput.length > 10 ? 24 : 32 }]}
                                        value={amountInput}
                                        onChangeText={(text) => {
                                            setAmountInput(formatInputRupiah(text));
                                            setAmountError(null);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textDisabled}
                                    />
                                </View>
                                <View style={styles.amountMetaRow}>
                                    <View style={styles.metaChip}>
                                        <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.textSecondary} />
                                        <Text style={styles.metaChipText}>{selectedWallet?.name ?? 'Pilih dompet'}</Text>
                                    </View>
                                    <View style={styles.metaChip}>
                                        <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSecondary} />
                                        <Text style={styles.metaChipText}>{formatDateLong(date.getTime())}</Text>
                                    </View>
                                </View>
                                {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
                            </View>
                        </FormSection>

                        <FormSection
                            title="Konteks transaksi"
                            subtitle="Pastikan tanggal dan dompet sudah sesuai sebelum transaksi disimpan."
                        >
                            <TouchableOpacity style={styles.selectionRow} onPress={() => setShowDatePicker(true)}>
                                <View style={styles.selectionIcon}>
                                    <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.primary} />
                                </View>
                                <View style={styles.selectionCopy}>
                                    <Text style={styles.selectionLabel}>Tanggal</Text>
                                    <Text style={styles.selectionValue}>{formatDateLong(date.getTime())}</Text>
                                </View>
                            </TouchableOpacity>

                            {showDatePicker ? (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                />
                            ) : null}

                            <View style={styles.walletWrap}>
                                {wallets.map((wallet) => {
                                    const active = selectedWalletId === wallet.id;
                                    return (
                                        <TouchableOpacity
                                            key={wallet.id}
                                            style={[
                                                styles.walletChip,
                                                active ? { borderColor: wallet.color, backgroundColor: `${wallet.color}16` } : null,
                                            ]}
                                            onPress={() => setSelectedWalletId(wallet.id)}
                                        >
                                            <View
                                                style={[
                                                    styles.walletChipIcon,
                                                    { backgroundColor: active ? wallet.color : colors.surfaceAlt },
                                                ]}
                                            >
                                                <MaterialCommunityIcons
                                                    name={wallet.type === 'bank' ? 'bank' : wallet.type === 'e-wallet' ? 'cellphone' : 'wallet-outline'}
                                                    size={16}
                                                    color={active ? colors.textInverse : colors.textSecondary}
                                                />
                                            </View>
                                            <Text style={[styles.walletChipText, active ? styles.walletChipTextActive : null]}>
                                                {wallet.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </FormSection>

                        <FormSection
                            title="Kategori"
                            subtitle="Kategori yang tepat akan membuat laporan dan ringkasan harian tetap akurat."
                        >
                            {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
                            <CategoryPicker
                                type={txType}
                                selectedCategory={category}
                                onSelect={(value) => {
                                    setCategory(value);
                                    setCategoryError(null);
                                }}
                            />
                        </FormSection>

                        <FormSection
                            title="Catatan"
                            subtitle="Opsional, tetapi berguna untuk menambahkan konteks di layar detail."
                        >
                            <Input
                                label="Catatan"
                                value={note}
                                onChangeText={setNote}
                                placeholder="Tulis catatan tambahan..."
                                multiline
                                numberOfLines={4}
                                leftIcon="note-text-outline"
                            />
                        </FormSection>
                    </ScrollView>
                )}

                {!isPrefilling ? (
                    <PrimaryActionBar
                        primaryLabel={isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                        onPrimaryPress={handleSave}
                        primaryLoading={isLoading}
                        offset={metrics.bottomActionInset - metrics.safeBottomSpacing}
                    />
                ) : null}
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex: {
            flex: 1,
        },
        content: {
            gap: 18,
            paddingTop: 20,
        },
        loadingWrap: {
            flex: 1,
            justifyContent: 'center',
        },
        amountCard: {
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            padding: 18,
            gap: 12,
        },
        amountCardError: {
            borderColor: colors.danger,
        },
        amountLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        amountRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        amountPrefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textSecondary,
        },
        amountInput: {
            flex: 1,
            fontFamily: FontFamily.heading,
            color: colors.textPrimary,
            paddingVertical: 0,
        },
        amountMetaRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        metaChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        metaChipText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        selectionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
        },
        selectionIcon: {
            width: 38,
            height: 38,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        selectionCopy: {
            flex: 1,
        },
        selectionLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        selectionValue: {
            ...Typography.h4,
            color: colors.textPrimary,
            marginTop: 2,
        },
        walletWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        walletChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
        },
        walletChipIcon: {
            width: 30,
            height: 30,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        walletChipText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        walletChipTextActive: {
            fontFamily: FontFamily.bodyBold,
            color: colors.textPrimary,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
    });

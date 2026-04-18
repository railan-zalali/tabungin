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
import DateTimePicker from '@react-native-community/datetimepicker';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { formatDateLong } from '../../utils/date';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { validateAmount } from '../../utils/validation';
import { useTheme } from '../../store/useThemeStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import type { TransactionType } from '../../types/transaction';
import { CategoryPicker } from '../../components/transaction/CategoryPicker';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SelectionChip } from '../../components/common/SelectionChip';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { StatePanel } from '../../components/common/StatePanel';
import { triggerHapticNotification } from '../../utils/haptics';
import { getReadableTextColor } from '../../utils/colorContrast';
import { getWalletCapabilities } from '../../utils/walletPermissions';

export function AddTransactionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const { addTransaction, editTransaction, getTransactionById, isLoading } = useTransactionStore();
    const { wallets, walletRoles, loadWallets } = useWalletStore();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const compactLayout = metrics.density === 'compact';
    const styles = useMemo(() => getStyles(colors, compactLayout), [colors, compactLayout]);
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
    const [showNoteField, setShowNoteField] = useState(Boolean(route.params?.editId));
    const [originalWalletId, setOriginalWalletId] = useState('');

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
                setOriginalWalletId(transaction.wallet_id ?? '');
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
    const selectedWalletCapabilities = getWalletCapabilities({
        wallet: selectedWallet,
        activeProfileId,
        membershipRole: selectedWallet ? walletRoles[selectedWallet.id] ?? null : null,
    });
    const originalWallet = originalWalletId ? wallets.find((wallet) => wallet.id === originalWalletId) : selectedWallet;
    const originalWalletCapabilities = getWalletCapabilities({
        wallet: originalWallet,
        activeProfileId,
        membershipRole: originalWallet ? walletRoles[originalWallet.id] ?? null : null,
    });
    const canManageSelectedWallet = !selectedWallet || selectedWalletCapabilities.canManageTransactions;
    const canManageEditedTransaction = !isEditMode || !originalWalletId || originalWalletCapabilities.canManageTransactions;
    const transactionReadOnly = !canManageSelectedWallet || !canManageEditedTransaction;

    const handleDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSave = async () => {
        if (transactionReadOnly) {
            Alert.alert('Akses terbatas', 'Transaksi pada dompet ini hanya bisa dilihat. Pilih dompet yang bisa kamu kelola atau hubungi owner.');
            return;
        }

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
            triggerHapticNotification();
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
        triggerHapticNotification();
        navigation.goBack();
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <AppScreenHeader
                    eyebrow={isEditMode ? 'Edit Flow' : 'New Transaction'}
                    title={isEditMode ? 'Edit Transaksi' : 'Tambah Transaksi'}
                    subtitle={
                        transactionReadOnly
                            ? 'Role saat ini hanya punya akses baca untuk dompet yang terhubung ke transaksi ini.'
                            : isEditMode
                                ? 'Perbarui detail penting transaksi.'
                                : 'Isi nominal, dompet, dan kategori lalu simpan.'
                    }
                    density={metrics.headerDensity}
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
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.content,
                            {
                                paddingHorizontal: metrics.horizontalPadding,
                                paddingBottom: metrics.compactBottomClearance + 24,
                            },
                        ]}
                    >
                        <FormSection
                            eyebrow="Core Input"
                            title="Ringkasan transaksi"
                            subtitle="Mulai dari tipe, nominal, tanggal, dan dompet supaya input terasa cepat di layar kecil."
                            density="compact"
                            variant="highlight"
                        >
                            {transactionReadOnly ? (
                                <StatePanel
                                    icon="shield-lock-outline"
                                    title="Akses transaksi read only"
                                    description="Viewer tidak bisa menambah atau mengubah transaksi pada shared wallet. Pilih dompet lain yang bisa kamu kelola untuk lanjut."
                                />
                            ) : null}

                            <SegmentedControl<TransactionType>
                                value={txType}
                                onChange={(value) => {
                                    if (transactionReadOnly) return;
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
                                            if (transactionReadOnly) return;
                                            setAmountInput(formatInputRupiah(text));
                                            setAmountError(null);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textDisabled}
                                        editable={!transactionReadOnly}
                                    />
                                </View>
                                {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
                            </View>

                            <View style={styles.metaBlock}>
                                <TouchableOpacity style={styles.selectionRow} onPress={() => !transactionReadOnly && setShowDatePicker(true)}>
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

                                <View style={styles.walletMeta}>
                                    <Text style={styles.groupLabel}>Dompet</Text>
                                    <View style={styles.walletWrap}>
                                    {wallets.map((wallet) => {
                                            const active = selectedWalletId === wallet.id;
                                            const walletIconColor = getReadableTextColor(wallet.color, {
                                                light: colors.textInverse,
                                                dark: colors.textPrimary,
                                            });
                                            return (
                                                <SelectionChip
                                                    key={wallet.id}
                                                    icon={wallet.type === 'bank' ? 'bank' : wallet.type === 'e-wallet' ? 'cellphone' : 'wallet-outline'}
                                                    label={wallet.name}
                                                    selected={active}
                                                    accentColor={wallet.color}
                                                    selectedIconColor={walletIconColor}
                                                    onPress={() => setSelectedWalletId(wallet.id)}
                                                />
                                            );
                                        })}
                                    </View>
                                    {!selectedWalletId && compactLayout ? <Text style={styles.errorText}>Pilih dompet terlebih dahulu</Text> : null}
                                    {selectedWallet ? <Text style={styles.helperText}>Dompet aktif: {selectedWallet.name}</Text> : null}
                                </View>
                            </View>
                        </FormSection>

                        <FormSection
                            eyebrow="Categorize"
                            title="Kategori"
                            subtitle="Kategori yang tepat akan membuat laporan dan ringkasan harian tetap akurat."
                            density="compact"
                        >
                            {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
                            <CategoryPicker
                                type={txType}
                                selectedCategory={category}
                                onSelect={(value) => {
                                    if (transactionReadOnly) return;
                                    setCategory(value);
                                    setCategoryError(null);
                                }}
                            />
                        </FormSection>

                        <FormSection
                            eyebrow="Optional Context"
                            title="Catatan"
                            subtitle="Opsional, berguna saat kamu butuh konteks tambahan."
                            density="compact"
                            variant="subtle"
                        >
                            <TouchableOpacity style={styles.noteToggle} onPress={() => !transactionReadOnly && setShowNoteField((value) => !value)}>
                                <View style={styles.noteToggleCopy}>
                                    <Text style={styles.noteToggleTitle}>{showNoteField ? 'Sembunyikan catatan' : 'Tambahkan catatan'}</Text>
                                    <Text style={styles.noteToggleSubtitle}>
                                        {showNoteField ? 'Field catatan tetap opsional.' : 'Buka field bila kamu perlu konteks tambahan.'}
                                    </Text>
                                </View>
                                <MaterialCommunityIcons
                                    name={showNoteField ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>

                            {showNoteField ? (
                                <Input
                                    label="Catatan"
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Tulis catatan tambahan..."
                                    multiline
                                    numberOfLines={4}
                                    leftIcon="note-text-outline"
                                    editable={!transactionReadOnly}
                                />
                            ) : null}
                        </FormSection>
                    </ScrollView>
                )}

                {!isPrefilling ? (
                    <PrimaryActionBar
                        primaryLabel={transactionReadOnly ? 'Mode read only' : isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                        onPrimaryPress={handleSave}
                        primaryLoading={isLoading}
                        bottomInset={metrics.compactBottomClearance}
                    />
                ) : null}
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isCompact: boolean) =>
    StyleSheet.create({
        flex: {
            flex: 1,
        },
        content: {
            gap: isCompact ? 14 : 18,
            paddingTop: isCompact ? 14 : 20,
        },
        loadingWrap: {
            flex: 1,
            justifyContent: 'center',
        },
        amountCard: {
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['3xl'],
            padding: isCompact ? 16 : 18,
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
            gap: 10,
        },
        metaBlock: {
            gap: 12,
        },
        selectionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['3xl'],
            padding: isCompact ? 14 : 16,
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
        walletMeta: {
            gap: 10,
        },
        groupLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        helperText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        noteToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        noteToggleCopy: {
            flex: 1,
        },
        noteToggleTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        noteToggleSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 3,
            lineHeight: 18,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
    });

// Modal "Catat Pembayaran" pada detail utang/piutang.
// Diekstrak dari DebtDetailScreen.
import React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { Button } from '../common/Button';

interface AddPaymentModalProps {
    visible: boolean;
    counterparty: string;
    /** Aksen warna debt sebagai border input nominal */
    accentColor: string;
    amount: string;
    onAmountChange: (value: string) => void;
    note: string;
    onNoteChange: (value: string) => void;
    /** Nama dompet sumber dana; null bila pembayaran tidak dicatat ke dompet */
    walletName?: string | null;
    /** Pesan validasi/gagal simpan di atas tombol */
    error?: string | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export function AddPaymentModal({
    visible,
    counterparty,
    accentColor,
    amount,
    onAmountChange,
    note,
    onNoteChange,
    walletName,
    error,
    isSubmitting,
    onClose,
    onSubmit,
}: AddPaymentModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.safe}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Catat Pembayaran</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Tutup"
                    >
                        <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.counterparty}>{counterparty}</Text>

                    <View style={[styles.rupiahInput, { borderColor: accentColor }]}>
                        <Text style={styles.prefix}>Rp</Text>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={onAmountChange}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            autoFocus
                            accessibilityLabel="Nominal pembayaran"
                        />
                    </View>

                    <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={onNoteChange}
                        placeholder="Catatan (opsional)"
                        placeholderTextColor={colors.textSecondary}
                        accessibilityLabel="Catatan pembayaran"
                    />

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons
                            name={walletName ? 'wallet-outline' : 'information-outline'}
                            size={18}
                            color={walletName ? colors.primary : colors.textSecondary}
                        />
                        <Text style={styles.infoText}>
                            {walletName
                                ? `Pembayaran ini juga dicatat sebagai transaksi dari dompet ${walletName}.`
                                : 'Pembayaran hanya dicatat pada riwayat utang, tanpa transaksi dompet.'}
                        </Text>
                    </View>

                    {error ? (
                        <Text style={styles.errorText} accessibilityRole="alert">
                            {error}
                        </Text>
                    ) : null}

                    <Button
                        label="Simpan Pembayaran"
                        onPress={onSubmit}
                        variant="primary"
                        size="lg"
                        loading={isSubmitting}
                        fullWidth
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.surface },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        title: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textPrimary,
        },
        content: { padding: 20, gap: 16 },
        counterparty: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        rupiahInput: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 18,
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderWidth: 1,
            gap: 8,
            minHeight: 54,
        },
        prefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textSecondary,
        },
        amountInput: {
            flex: 1,
            fontFamily: FontFamily.heading,
            fontSize: 32,
            color: colors.textPrimary,
            padding: 0,
            height: 40,
        },
        noteInput: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 18,
            padding: 16,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 52,
        },
        infoRow: {
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
            padding: 14,
            borderRadius: 18,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        infoText: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.textSecondary,
        },
        errorText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.danger,
            textAlign: 'center',
        },
    });

// Modal "Tambah Tabungan" pada detail target.
// Diekstrak dari SavingDetailScreen.
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
import { Typography, FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { Button } from '../common/Button';

interface AddSavingModalProps {
    visible: boolean;
    goalEmoji: string;
    goalName: string;
    /** Warna goal sebagai aksen border input nominal */
    accentColor: string;
    amount: string;
    onAmountChange: (value: string) => void;
    note: string;
    onNoteChange: (value: string) => void;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export function AddSavingModal({
    visible,
    goalEmoji,
    goalName,
    accentColor,
    amount,
    onAmountChange,
    note,
    onNoteChange,
    isSubmitting,
    onClose,
    onSubmit,
}: AddSavingModalProps) {
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
                    <Text style={styles.title}>Tambah Tabungan</Text>
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
                    <Text style={styles.goalName}>
                        {goalEmoji} {goalName}
                    </Text>

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
                            accessibilityLabel="Nominal tabungan"
                        />
                    </View>

                    <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={onNoteChange}
                        placeholder="Catatan (opsional)"
                        placeholderTextColor={colors.textSecondary}
                        accessibilityLabel="Catatan tabungan"
                    />

                    <Button
                        label="Simpan Tabungan"
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
        title: { ...Typography.h3, color: colors.textPrimary },
        content: { padding: 20, gap: 20 },
        goalName: {
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
    });

// Modal form untuk menambah transaksi berulang.
// Diekstrak dari RecurringTransactionScreen agar screen cukup berisi
// komposisi hero + list, sesuai pola AddTransactionScreen.
import React from 'react';
import {
    Modal,
    ScrollView,
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
import { ContentPanel } from '../common/ContentPanel';
import type { RecurringFrequency } from '../../database/recurringQueries';
import type { ResolvedCategory } from '../../utils/categoryResolver';

export const FREQUENCY_OPTIONS: { label: string; value: RecurringFrequency }[] = [
    { label: 'Harian', value: 'daily' },
    { label: 'Mingguan', value: 'weekly' },
    { label: 'Dua Mingguan', value: 'biweekly' },
    { label: 'Bulanan', value: 'monthly' },
    { label: 'Tahunan', value: 'yearly' },
];

interface RecurringTransactionFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: () => void;
    submitting: boolean;
    categories: ResolvedCategory[];
    form: {
        type: 'income' | 'expense';
        category: string;
        amount: string;
        note: string;
        frequency: RecurringFrequency;
        dayOfMonth: string;
    };
    onFormChange: (patch: Partial<RecurringTransactionFormModalProps['form']>) => void;
}

export function RecurringTransactionFormModal({
    visible,
    onClose,
    onSubmit,
    submitting,
    categories,
    form,
    onFormChange,
}: RecurringTransactionFormModalProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <ContentPanel style={styles.modalContent}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                        Tambah Transaksi Berulang
                    </Text>

                    {/* Type Toggle */}
                    <View style={[styles.typeToggle, { backgroundColor: colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.typeOption,
                                form.type === 'expense' && [
                                    styles.typeOptionActive,
                                    { backgroundColor: colors.danger },
                                ],
                            ]}
                            onPress={() => onFormChange({ type: 'expense' })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: form.type === 'expense' }}
                        >
                            <Text
                                style={[
                                    styles.typeText,
                                    form.type === 'expense' && { color: colors.textInverse },
                                ]}
                            >
                                Pengeluaran
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeOption,
                                form.type === 'income' && [
                                    styles.typeOptionActive,
                                    { backgroundColor: colors.success },
                                ],
                            ]}
                            onPress={() => onFormChange({ type: 'income' })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: form.type === 'income' }}
                        >
                            <Text
                                style={[
                                    styles.typeText,
                                    form.type === 'income' && { color: colors.textInverse },
                                ]}
                            >
                                Pemasukan
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Category */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryScroll}
                        >
                            {categories.map((category) => {
                                const selected = form.category === category.name;
                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryChip,
                                            selected && [
                                                styles.categoryChipActive,
                                                { backgroundColor: colors.primary },
                                            ],
                                        ]}
                                        onPress={() => onFormChange({ category: category.name })}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                    >
                                        <MaterialCommunityIcons
                                            name={category.icon as never}
                                            size={16}
                                            color={selected ? colors.textInverse : category.color}
                                        />
                                        <Text
                                            style={[
                                                styles.categoryChipText,
                                                selected && { color: colors.textInverse },
                                            ]}
                                        >
                                            {category.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Amount */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Jumlah</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.surfaceElevated,
                                    borderColor: colors.border,
                                    color: colors.textPrimary,
                                },
                            ]}
                            value={form.amount}
                            onChangeText={(value) => onFormChange({ amount: value })}
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="decimal-pad"
                            accessibilityLabel="Jumlah transaksi berulang"
                        />
                    </View>

                    {/* Frequency */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Frekuensi
                        </Text>
                        <View style={styles.frequencyGrid}>
                            {FREQUENCY_OPTIONS.map((option) => {
                                const selected = form.frequency === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.frequencyOption,
                                            selected && [
                                                styles.frequencyOptionActive,
                                                {
                                                    backgroundColor: colors.primary,
                                                    borderColor: colors.primary,
                                                },
                                            ],
                                        ]}
                                        onPress={() => onFormChange({ frequency: option.value })}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                    >
                                        <Text
                                            style={[
                                                styles.frequencyText,
                                                selected && { color: colors.textInverse },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Day of Month (monthly only) */}
                    {form.frequency === 'monthly' && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>
                                Tanggal (1-31)
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.surfaceElevated,
                                        borderColor: colors.border,
                                        color: colors.textPrimary,
                                    },
                                ]}
                                value={form.dayOfMonth}
                                onChangeText={(value) => onFormChange({ dayOfMonth: value })}
                                placeholder="1"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="number-pad"
                                maxLength={2}
                                accessibilityLabel="Tanggal jatuh tempo bulanan"
                            />
                        </View>
                    )}

                    {/* Note */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Catatan (opsional)
                        </Text>
                        <TextInput
                            style={[
                                styles.textArea,
                                {
                                    backgroundColor: colors.surfaceElevated,
                                    borderColor: colors.border,
                                    color: colors.textPrimary,
                                },
                            ]}
                            value={form.note}
                            onChangeText={(value) => onFormChange({ note: value })}
                            placeholder="Tambahkan catatan..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            numberOfLines={3}
                            accessibilityLabel="Catatan transaksi berulang"
                        />
                    </View>

                    {/* Actions — memakai design system Button, sama seperti modal lain */}
                    <View style={styles.modalActions}>
                        <Button
                            label="Batal"
                            onPress={onClose}
                            variant="outline"
                            style={styles.actionButton}
                        />
                        <Button
                            label="Simpan"
                            onPress={onSubmit}
                            loading={submitting}
                            disabled={submitting}
                            variant="primary"
                            style={styles.actionButton}
                        />
                    </View>
                </ContentPanel>
            </View>
        </Modal>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'center',
        },
        // Surface, radius, border, padding, dan shadow sekarang milik
        // ContentPanel — yang tersisa hanya pembatas ukuran modal.
        modalContent: {
            marginHorizontal: 16,
            maxHeight: '80%',
        },
        modalTitle: {
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textPrimary,
        },
        typeToggle: {
            flexDirection: 'row',
            borderRadius: 12,
            padding: 4,
        },
        typeOption: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        typeOptionActive: {},
        typeText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
        },
        inputGroup: {
            gap: 8,
        },
        label: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
        input: {
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
        },
        textArea: {
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            minHeight: 80,
            textAlignVertical: 'top',
        },
        categoryScroll: {
            marginBottom: 8,
        },
        categoryChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            marginRight: 8,
            backgroundColor: colors.surfaceElevated,
        },
        categoryChipActive: {
            borderColor: colors.primary,
        },
        categoryChipText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
        },
        frequencyGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        frequencyOption: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
        },
        frequencyOptionActive: {},
        frequencyText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
        },
        modalActions: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 4,
        },
        actionButton: {
            flex: 1,
        },
    });

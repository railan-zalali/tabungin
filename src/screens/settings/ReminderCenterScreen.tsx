import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { useSavingStore } from '../../store/useSavingStore';
import { useBudgetStore } from '../../store/useBudgetStore';
import { useRecurringStore } from '../../store/useRecurringStore';
import { useReminderStore } from '../../store/useReminderStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { AppReminder, AppReminderFrequency } from '../../database/reminderQueries';
import { useResponsiveMetrics } from '../../utils/responsive';

function toReadableFrequency(value: AppReminderFrequency) {
    switch (value) {
        case 'daily':
            return 'Harian';
        case 'weekly':
            return 'Mingguan';
        case 'monthly':
            return 'Bulanan';
        case 'once':
        default:
            return 'Sekali';
    }
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

function ToggleRow({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    trailing,
}: {
    icon: string;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (next: boolean) => void;
    trailing?: React.ReactNode;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View style={styles.toggleRow}>
            <View style={styles.toggleIcon}>
                <MaterialCommunityIcons name={icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>{title}</Text>
                <Text style={styles.toggleSubtitle}>{subtitle}</Text>
            </View>
            {trailing}
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.surfaceMuted, true: colors.primaryLight }}
                thumbColor={value ? colors.primary : colors.surfaceElevated}
            />
        </View>
    );
}

export function ReminderCenterScreen() {
    const navigation = useNavigation<SettingsChildNavigationProp<'ReminderCenter'>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const userId = useAuthStore((state) => state.user?.id);
    const { activeGoals, loadGoals, editGoal } = useSavingStore();
    const { budgets, loadBudgets, saveBudget } = useBudgetStore();
    const { recurringTransactions, loadRecurringTransactions, updateRecurringTransaction } = useRecurringStore();
    const { reminders, loadReminders, addReminder, editReminder, removeReminder } = useReminderStore();

    const [showModal, setShowModal] = useState(false);
    const [editingReminder, setEditingReminder] = useState<AppReminder | null>(null);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [frequency, setFrequency] = useState<AppReminderFrequency>('daily');
    const [timeOfDay, setTimeOfDay] = useState('08:00');
    const [targetScreen, setTargetScreen] = useState<'Dashboard' | 'Budget' | 'SavingList' | 'RecurringTransaction' | 'ReminderCenter'>('Dashboard');

    useEffect(() => {
        loadGoals();
        loadBudgets();
        loadRecurringTransactions();
        if (userId) {
            loadReminders();
        }
    }, [loadBudgets, loadGoals, loadRecurringTransactions, loadReminders, userId]);

    const manualReminders = useMemo(() => reminders.slice().sort((a, b) => a.trigger_at - b.trigger_at), [reminders]);

    const resetForm = () => {
        setEditingReminder(null);
        setTitle('');
        setNote('');
        setFrequency('daily');
        setTimeOfDay('08:00');
        setTargetScreen('Dashboard');
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (reminder: AppReminder) => {
        setEditingReminder(reminder);
        setTitle(reminder.title);
        setNote(reminder.note || '');
        setFrequency(reminder.frequency);
        setTimeOfDay(reminder.time_of_day || '08:00');
        setTargetScreen((reminder.target_screen as any) || 'Dashboard');
        setShowModal(true);
    };

    const buildTriggerAt = () => {
        const [hour, minute] = timeOfDay.split(':').map((value) => Number(value));
        const next = new Date();
        next.setSeconds(0, 0);
        next.setHours(Number.isFinite(hour) ? hour : 8, Number.isFinite(minute) ? minute : 0, 0, 0);
        if (next.getTime() <= Date.now()) {
            next.setDate(next.getDate() + 1);
        }
        return next.getTime();
    };

    const handleSubmitManualReminder = async () => {
        if (!userId) return;
        if (!title.trim()) {
            Alert.alert('Reminder belum lengkap', 'Isi judul reminder terlebih dahulu.');
            return;
        }

        const payload = {
            title: title.trim(),
            note: note.trim() || null,
            target_screen: targetScreen,
            target_params: null,
            frequency,
            trigger_at: buildTriggerAt(),
            time_of_day: timeOfDay,
            day_of_week: frequency === 'weekly' ? 1 : null,
            day_of_month: frequency === 'monthly' ? 1 : null,
            is_enabled: true,
        };

        try {
            if (editingReminder) {
                await editReminder(editingReminder.id, payload);
            } else {
                await addReminder(payload);
            }
            setShowModal(false);
            resetForm();
        } catch (error: any) {
            Alert.alert('Gagal', error?.message || 'Reminder belum berhasil disimpan.');
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Reminder Center"
                subtitle="Satukan reminder lintas target, budget, transaksi berulang, dan reminder manual."
                showBack
                onBackPress={() => navigation.goBack()}
                rightAction={{ icon: 'plus', label: 'Tambah reminder', onPress: openCreateModal }}
                variant="transparent"
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}>
                <SectionCard title="Ringkasan reminder" subtitle="Pastikan reminder yang benar-benar kamu butuhkan tetap aktif dan relevan.">
                    <View style={styles.summaryRow}>
                        <ContextBadge icon="piggy-bank-outline" label={`${activeGoals.filter((goal) => goal.reminder_enabled).length} goal aktif`} tone="success" />
                        <ContextBadge icon="chart-pie" label={`${budgets.filter((budget) => budget.reminder_enabled).length} budget aktif`} tone="info" />
                        <ContextBadge icon="autorenew" label={`${recurringTransactions.filter((item) => item.reminder_enabled).length} recurring aktif`} tone="warning" />
                        <ContextBadge icon="bell-cog-outline" label={`${manualReminders.filter((item) => item.is_enabled).length} manual aktif`} tone="primary" />
                    </View>
                </SectionCard>

                <SectionCard title="Reminder target tabungan" subtitle="Atur goal mana yang perlu dorongan rutin. Goal shared tetap mengikuti permission yang sudah berlaku.">
                    {activeGoals.length === 0 ? (
                        <EmptyState icon="piggy-bank-outline" title="Belum ada target aktif" description="Begitu ada goal aktif, reminder hariannya bisa diatur langsung dari sini." compact />
                    ) : (
                        activeGoals.map((goal) => (
                            <ToggleRow
                                key={goal.id}
                                icon="bullseye-arrow"
                                title={goal.name}
                                subtitle={goal.reminder_enabled ? `Aktif pukul ${goal.reminder_time || '08:00'}` : 'Reminder belum aktif'}
                                value={goal.reminder_enabled}
                                onValueChange={(next) =>
                                    editGoal(goal.id, { reminder_enabled: next, reminder_time: goal.reminder_time || '08:00' }).catch((error) =>
                                        Alert.alert('Gagal', error?.message || 'Reminder goal belum berhasil diubah.'),
                                    )
                                }
                            />
                        ))
                    )}
                </SectionCard>

                <SectionCard title="Reminder budget" subtitle="Pakai pengingat ringan di awal bulan agar batas kategori tidak terlewat.">
                    {budgets.length === 0 ? (
                        <EmptyState icon="chart-pie" title="Belum ada budget aktif" description="Atur budget dulu supaya reminder kategori bisa dihidupkan." actionLabel="Buka budget" onAction={() => navigation.navigate('Budget')} compact />
                    ) : (
                        budgets.map((budget) => (
                            <ToggleRow
                                key={budget.id}
                                icon="chart-pie"
                                title={budget.category}
                                subtitle={budget.reminder_enabled ? `Aktif pukul ${budget.reminder_time || '09:00'}` : 'Reminder budget belum aktif'}
                                value={budget.reminder_enabled}
                                onValueChange={(next) =>
                                    saveBudget(budget.category, budget.amount, budget.month, budget.year, {
                                        reminder_enabled: next,
                                        reminder_time: budget.reminder_time || '09:00',
                                    }).catch((error) => Alert.alert('Gagal', error?.message || 'Reminder budget belum berhasil diubah.'))
                                }
                                trailing={<ContextBadge icon="calendar-month-outline" label={`${budget.month}/${budget.year}`} tone="neutral" />}
                            />
                        ))
                    )}
                </SectionCard>

                <SectionCard title="Reminder transaksi berulang" subtitle="Aktifkan pengingat sebelum transaksi rutin dijalankan supaya perubahan masih sempat dikoreksi.">
                    {recurringTransactions.length === 0 ? (
                        <EmptyState icon="autorenew" title="Belum ada transaksi berulang" description="Begitu ada recurring transaction, reminder pra-eksekusi bisa diatur dari sini." actionLabel="Buka recurring" onAction={() => navigation.navigate('Transactions', { screen: 'RecurringTransaction' })} compact />
                    ) : (
                        recurringTransactions.map((item) => (
                            <ToggleRow
                                key={item.id}
                                icon="autorenew"
                                title={item.category}
                                subtitle={item.reminder_enabled ? `Aktif ${item.reminder_offset_minutes || 60} menit sebelum jadwal` : 'Reminder recurring belum aktif'}
                                value={item.reminder_enabled}
                                onValueChange={(next) =>
                                    updateRecurringTransaction(item.id, {
                                        reminder_enabled: next,
                                        reminder_offset_minutes: item.reminder_offset_minutes || 60,
                                    }).catch((error) => Alert.alert('Gagal', error?.message || 'Reminder recurring belum berhasil diubah.'))
                                }
                                trailing={<ContextBadge icon="calendar-refresh" label={item.frequency} tone="neutral" />}
                            />
                        ))
                    )}
                </SectionCard>

                <SectionCard title="Reminder manual" subtitle="Buat reminder bebas untuk follow-up penting yang tidak selalu melekat ke satu fitur.">
                    {manualReminders.length === 0 ? (
                        <EmptyState icon="bell-cog-outline" title="Belum ada reminder manual" description="Tambahkan reminder sendiri untuk hal-hal seperti review mingguan atau cek arus kas." actionLabel="Tambah reminder" onAction={openCreateModal} compact />
                    ) : (
                        <View style={styles.manualList}>
                            {manualReminders.map((reminder) => (
                                <TouchableOpacity key={reminder.id} style={styles.manualCard} onPress={() => openEditModal(reminder)}>
                                    <View style={styles.manualTop}>
                                        <View style={styles.manualIcon}>
                                            <MaterialCommunityIcons name="bell-outline" size={18} color={colors.primary} />
                                        </View>
                                        <View style={styles.manualCopy}>
                                            <Text style={styles.manualTitle}>{reminder.title}</Text>
                                            <Text style={styles.manualSubtitle}>{toReadableFrequency(reminder.frequency)} • {reminder.time_of_day || '08:00'}</Text>
                                        </View>
                                        <ContextBadge icon={reminder.is_enabled ? 'check-circle-outline' : 'pause-circle-outline'} label={reminder.is_enabled ? 'Aktif' : 'Nonaktif'} tone={reminder.is_enabled ? 'success' : 'neutral'} />
                                    </View>
                                    {reminder.note ? <Text style={styles.manualNote}>{reminder.note}</Text> : null}
                                    <View style={styles.manualActions}>
                                        <Button label="Edit" onPress={() => openEditModal(reminder)} variant="outline" size="sm" />
                                        <Button
                                            label="Hapus"
                                            onPress={() =>
                                                Alert.alert('Hapus reminder', 'Reminder manual ini akan dihapus dari perangkat dan antrean sync.', [
                                                    { text: 'Batal', style: 'cancel' },
                                                    { text: 'Hapus', style: 'destructive', onPress: () => removeReminder(reminder.id) },
                                                ])
                                            }
                                            variant="ghost"
                                            size="sm"
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </SectionCard>
            </ScrollView>

            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{editingReminder ? 'Edit reminder manual' : 'Tambah reminder manual'}</Text>
                        <TextInput style={styles.input} placeholder="Judul reminder" placeholderTextColor={colors.textDisabled} value={title} onChangeText={setTitle} />
                        <TextInput style={[styles.input, styles.noteInput]} placeholder="Catatan singkat (opsional)" placeholderTextColor={colors.textDisabled} multiline value={note} onChangeText={setNote} />
                        <TextInput style={styles.input} placeholder="08:00" placeholderTextColor={colors.textDisabled} value={timeOfDay} onChangeText={setTimeOfDay} />
                        <View style={styles.choiceRow}>
                            {(['once', 'daily', 'weekly', 'monthly'] as AppReminderFrequency[]).map((option) => (
                                <TouchableOpacity key={option} style={[styles.choiceChip, frequency === option ? styles.choiceChipActive : null]} onPress={() => setFrequency(option)}>
                                    <Text style={[styles.choiceChipText, frequency === option ? styles.choiceChipTextActive : null]}>{toReadableFrequency(option)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.choiceRow}>
                            {(['Dashboard', 'Budget', 'SavingList', 'RecurringTransaction', 'ReminderCenter'] as const).map((option) => (
                                <TouchableOpacity key={option} style={[styles.choiceChip, targetScreen === option ? styles.choiceChipActive : null]} onPress={() => setTargetScreen(option)}>
                                    <Text style={[styles.choiceChipText, targetScreen === option ? styles.choiceChipTextActive : null]}>{option}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalActions}>
                            <Button label="Batal" onPress={() => setShowModal(false)} variant="outline" style={{ flex: 1 }} />
                            <Button label="Simpan" onPress={handleSubmitManualReminder} variant="primary" style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: { paddingHorizontal: 20, paddingBottom: 108, gap: 18 },
        contentWide: { maxWidth: 920, width: '100%', alignSelf: 'center' },
        sectionCard: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
        },
        sectionTitle: { ...Typography.h4, color: colors.textPrimary },
        sectionSubtitle: { marginTop: 4, fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 18, color: colors.textSecondary },
        sectionBody: { marginTop: 16, gap: 12 },
        summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        toggleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
        },
        toggleIcon: { width: 40, height: 40, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBg },
        toggleCopy: { flex: 1, gap: 2 },
        toggleTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
        toggleSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 18, color: colors.textSecondary },
        manualList: { gap: 12 },
        manualCard: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
            gap: 12,
        },
        manualTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        manualIcon: { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
        manualCopy: { flex: 1 },
        manualTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
        manualSubtitle: { marginTop: 2, fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        manualNote: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 19, color: colors.textSecondary },
        manualActions: { flexDirection: 'row', gap: 10 },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 14, 26, 0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
        modalCard: {
            width: '100%',
            maxWidth: 520,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['4xl'],
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            gap: 12,
        },
        modalTitle: { ...Typography.h4, color: colors.textPrimary },
        input: {
            minHeight: 48,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        noteInput: { minHeight: 92, textAlignVertical: 'top' },
        choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        choiceChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
        choiceChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
        choiceChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: colors.textSecondary },
        choiceChipTextActive: { color: colors.primary, fontFamily: FontFamily.bodyBold },
        modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    });

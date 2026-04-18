import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { Input } from '../../components/common/Input';
import { MetricCard } from '../../components/common/MetricCard';
import { SelectionChip } from '../../components/common/SelectionChip';
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
    trailing?: string;
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
            {trailing ? <Text style={styles.trailingText}>{trailing}</Text> : null}
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.surfaceMuted, true: colors.primaryLight }}
                thumbColor={value ? colors.primary : colors.surfaceElevated}
            />
        </View>
    );
}

const FREQUENCY_OPTIONS: AppReminderFrequency[] = ['once', 'daily', 'weekly', 'monthly'];
const TARGET_OPTIONS = ['Dashboard', 'Budget', 'SavingList', 'RecurringTransaction', 'ReminderCenter'] as const;

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
    const [targetScreen, setTargetScreen] = useState<(typeof TARGET_OPTIONS)[number]>('Dashboard');

    useEffect(() => {
        loadGoals();
        loadBudgets();
        loadRecurringTransactions();
        if (userId) {
            loadReminders();
        }
    }, [loadBudgets, loadGoals, loadRecurringTransactions, loadReminders, userId]);

    const manualReminders = useMemo(() => reminders.slice().sort((a, b) => a.trigger_at - b.trigger_at), [reminders]);
    const activeGoalCount = activeGoals.filter((goal) => goal.reminder_enabled).length;
    const activeBudgetCount = budgets.filter((budget) => budget.reminder_enabled).length;
    const activeRecurringCount = recurringTransactions.filter((item) => item.reminder_enabled).length;
    const activeManualCount = manualReminders.filter((item) => item.is_enabled).length;

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
        setTargetScreen(((reminder.target_screen as (typeof TARGET_OPTIONS)[number]) || 'Dashboard'));
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
                eyebrow="Unified Alerts"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}
            >
                <HeroSummaryCard
                    eyebrow="Reminder Health"
                    title="Pusat reminder"
                    value={`${activeGoalCount + activeBudgetCount + activeRecurringCount + activeManualCount} aktif`}
                    description="Aktifkan hanya reminder yang benar-benar membantu keputusan harian, lalu rapikan sisanya dari satu tempat."
                    icon="bell-badge-outline"
                    stats={[
                        { label: 'Goal', value: String(activeGoalCount), icon: 'bullseye-arrow' },
                        { label: 'Budget', value: String(activeBudgetCount), icon: 'chart-pie' },
                        { label: 'Manual', value: String(activeManualCount), icon: 'bell-cog-outline' },
                    ]}
                    onPressCta={openCreateModal}
                    ctaLabel="Tambah reminder manual"
                />

                <InlineNotice
                    icon="tune-variant"
                    title="Reminder yang relevan lebih berguna"
                    description="Wave terakhir ini menyatukan reminder berdasarkan mental model pengguna: tujuan, batas anggaran, transaksi rutin, lalu follow-up manual."
                    tone="info"
                />

                <FormSection
                    eyebrow="Overview"
                    title="Ringkasan reminder"
                    subtitle="Empat area ini memberi gambaran cepat mana yang sudah aktif dan mana yang masih perlu perhatian."
                    variant="highlight"
                >
                    <View style={styles.metricGrid}>
                        <MetricCard label="Goal aktif" value={String(activeGoalCount)} icon="piggy-bank-outline" tone="success" />
                        <MetricCard label="Budget aktif" value={String(activeBudgetCount)} icon="chart-pie" tone="primary" />
                        <MetricCard label="Recurring aktif" value={String(activeRecurringCount)} icon="autorenew" tone="warning" />
                        <MetricCard label="Manual aktif" value={String(activeManualCount)} icon="bell-cog-outline" tone="neutral" />
                    </View>
                </FormSection>

                <FormSection
                    eyebrow="Savings"
                    title="Reminder target tabungan"
                    subtitle="Atur goal mana yang perlu dorongan rutin. Goal shared tetap mengikuti permission yang sudah berlaku."
                >
                    {activeGoals.length === 0 ? (
                        <EmptyState
                            icon="piggy-bank-outline"
                            title="Belum ada target aktif"
                            description="Begitu ada goal aktif, reminder hariannya bisa diatur langsung dari sini."
                            compact
                        />
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
                </FormSection>

                <FormSection
                    eyebrow="Budget"
                    title="Reminder budget"
                    subtitle="Pakai pengingat ringan di awal bulan agar batas kategori tidak terlewat."
                >
                    {budgets.length === 0 ? (
                        <EmptyState
                            icon="chart-pie"
                            title="Belum ada budget aktif"
                            description="Atur budget dulu supaya reminder kategori bisa dihidupkan."
                            actionLabel="Buka budget"
                            onAction={() => navigation.navigate('Budget')}
                            compact
                        />
                    ) : (
                        budgets.map((budget) => (
                            <ToggleRow
                                key={budget.id}
                                icon="chart-pie"
                                title={budget.category}
                                subtitle={budget.reminder_enabled ? `Aktif pukul ${budget.reminder_time || '09:00'}` : 'Reminder budget belum aktif'}
                                value={budget.reminder_enabled}
                                trailing={`${budget.month}/${budget.year}`}
                                onValueChange={(next) =>
                                    saveBudget(budget.category, budget.amount, budget.month, budget.year, {
                                        reminder_enabled: next,
                                        reminder_time: budget.reminder_time || '09:00',
                                    }).catch((error) => Alert.alert('Gagal', error?.message || 'Reminder budget belum berhasil diubah.'))
                                }
                            />
                        ))
                    )}
                </FormSection>

                <FormSection
                    eyebrow="Recurring"
                    title="Reminder transaksi berulang"
                    subtitle="Aktifkan pengingat sebelum transaksi rutin dijalankan supaya perubahan masih sempat dikoreksi."
                >
                    {recurringTransactions.length === 0 ? (
                        <EmptyState
                            icon="autorenew"
                            title="Belum ada transaksi berulang"
                            description="Begitu ada recurring transaction, reminder pra-eksekusi bisa diatur dari sini."
                            actionLabel="Buka recurring"
                            onAction={() => navigation.navigate('Transactions', { screen: 'RecurringTransaction' })}
                            compact
                        />
                    ) : (
                        recurringTransactions.map((item) => (
                            <ToggleRow
                                key={item.id}
                                icon="autorenew"
                                title={item.category}
                                subtitle={
                                    item.reminder_enabled
                                        ? `Aktif ${item.reminder_offset_minutes || 60} menit sebelum jadwal`
                                        : 'Reminder recurring belum aktif'
                                }
                                value={item.reminder_enabled}
                                trailing={item.frequency}
                                onValueChange={(next) =>
                                    updateRecurringTransaction(item.id, {
                                        reminder_enabled: next,
                                        reminder_offset_minutes: item.reminder_offset_minutes || 60,
                                    }).catch((error) => Alert.alert('Gagal', error?.message || 'Reminder recurring belum berhasil diubah.'))
                                }
                            />
                        ))
                    )}
                </FormSection>

                <FormSection
                    eyebrow="Manual"
                    title="Reminder manual"
                    subtitle="Buat reminder bebas untuk follow-up penting yang tidak selalu melekat ke satu fitur."
                >
                    {manualReminders.length === 0 ? (
                        <EmptyState
                            icon="bell-cog-outline"
                            title="Belum ada reminder manual"
                            description="Tambahkan reminder sendiri untuk hal-hal seperti review mingguan atau cek arus kas."
                            actionLabel="Tambah reminder"
                            onAction={openCreateModal}
                            compact
                        />
                    ) : (
                        <View style={styles.manualList}>
                            {manualReminders.map((reminder) => (
                                <TouchableOpacity
                                    key={reminder.id}
                                    style={styles.manualCard}
                                    onPress={() => openEditModal(reminder)}
                                    activeOpacity={0.92}
                                >
                                    <View style={styles.manualTop}>
                                        <View style={styles.manualIcon}>
                                            <MaterialCommunityIcons name="bell-outline" size={18} color={colors.primary} />
                                        </View>
                                        <View style={styles.manualCopy}>
                                            <Text style={styles.manualTitle}>{reminder.title}</Text>
                                            <Text style={styles.manualSubtitle}>
                                                {toReadableFrequency(reminder.frequency)} • {reminder.time_of_day || '08:00'}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.manualState,
                                                reminder.is_enabled ? styles.manualStateActive : styles.manualStateInactive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.manualStateText,
                                                    reminder.is_enabled ? styles.manualStateTextActive : styles.manualStateTextInactive,
                                                ]}
                                            >
                                                {reminder.is_enabled ? 'Aktif' : 'Nonaktif'}
                                            </Text>
                                        </View>
                                    </View>
                                    {reminder.note ? <Text style={styles.manualNote}>{reminder.note}</Text> : null}
                                    <View style={styles.manualActions}>
                                        <Button label="Edit" onPress={() => openEditModal(reminder)} variant="outline" size="sm" style={styles.inlineAction} />
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
                                            style={styles.inlineAction}
                                        />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </FormSection>
            </ScrollView>

            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <FormSection
                            eyebrow={editingReminder ? 'Edit Manual Reminder' : 'New Manual Reminder'}
                            title={editingReminder ? 'Edit reminder manual' : 'Tambah reminder manual'}
                            subtitle="Tentukan judul, waktu, frekuensi, dan layar tujuan agar reminder terasa lebih kontekstual."
                            density="compact"
                            variant="subtle"
                        >
                            <Input
                                label="Judul reminder"
                                value={title}
                                onChangeText={setTitle}
                                leftIcon="format-title"
                                placeholder="Contoh: Review cashflow mingguan"
                            />
                            <Input
                                label="Catatan singkat"
                                value={note}
                                onChangeText={setNote}
                                leftIcon="text-box-outline"
                                placeholder="Opsional"
                                multiline
                                numberOfLines={3}
                                containerStyle={styles.noteInputWrap}
                            />
                            <Input
                                label="Jam pengingat"
                                value={timeOfDay}
                                onChangeText={setTimeOfDay}
                                leftIcon="clock-outline"
                                placeholder="08:00"
                            />

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Frekuensi</Text>
                                <View style={styles.selectionWrap}>
                                    {FREQUENCY_OPTIONS.map((option) => (
                                        <SelectionChip
                                            key={option}
                                            label={toReadableFrequency(option)}
                                            selected={frequency === option}
                                            onPress={() => setFrequency(option)}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Buka ke layar</Text>
                                <View style={styles.selectionWrap}>
                                    {TARGET_OPTIONS.map((option) => (
                                        <SelectionChip
                                            key={option}
                                            label={option}
                                            selected={targetScreen === option}
                                            onPress={() => setTargetScreen(option)}
                                        />
                                    ))}
                                </View>
                            </View>

                            <InlineNotice
                                icon="information-outline"
                                description="Reminder manual tetap mengikuti jalur sync yang sama, jadi aman dipakai untuk follow-up personal maupun lintas perangkat."
                                tone="primary"
                            />
                        </FormSection>

                        <View style={styles.modalActions}>
                            <Button label="Batal" onPress={() => setShowModal(false)} variant="outline" style={styles.actionButton} />
                            <Button label="Simpan" onPress={handleSubmitManualReminder} variant="primary" style={styles.actionButton} />
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
        metricGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        toggleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surfaceElevated,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 14,
        },
        toggleIcon: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        toggleCopy: { flex: 1, gap: 2 },
        toggleTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
        toggleSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 18, color: colors.textSecondary },
        trailingText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.caption, color: colors.textSecondary },
        manualList: { gap: 12 },
        manualCard: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
            gap: 12,
        },
        manualTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        manualIcon: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.xl,
            backgroundColor: colors.primaryBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        manualCopy: { flex: 1 },
        manualTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
        manualSubtitle: { marginTop: 2, fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        manualState: {
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
        },
        manualStateActive: {
            backgroundColor: colors.successBg,
            borderColor: `${colors.success}22`,
        },
        manualStateInactive: {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.cardBorder,
        },
        manualStateText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
        manualStateTextActive: {
            color: colors.success,
        },
        manualStateTextInactive: {
            color: colors.textSecondary,
        },
        manualNote: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 19, color: colors.textSecondary },
        manualActions: { flexDirection: 'row', gap: 10 },
        inlineAction: { flex: 1 },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(10, 14, 26, 0.42)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        },
        modalCard: {
            width: '100%',
            maxWidth: 560,
            backgroundColor: colors.panelSurface,
            borderRadius: BorderRadius['4xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
            gap: 14,
        },
        noteInputWrap: {
            minHeight: 110,
        },
        fieldGroup: {
            gap: 10,
        },
        fieldLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
        },
        selectionWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        modalActions: { flexDirection: 'row', gap: 10 },
        actionButton: { flex: 1 },
    });

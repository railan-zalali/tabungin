import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import type { PeriodType } from '../../types/saving';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { validateGoalName, validateSavingPerPeriod, validateTargetAmount } from '../../utils/validation';
import { fetchSavingGoalById } from '../../database/savingQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { FormSection } from '../../components/common/FormSection';
import { Input } from '../../components/common/Input';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { StatePanel } from '../../components/common/StatePanel';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

export function AddSavingGoalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<RouteProp<any, 'AddSavingGoal'>>();
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { addGoal, editGoal, isLoading } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const currentUserEmail = useAuthStore((state) => state.user?.email);
    const editId = route.params?.editId as string | undefined;
    const isEditMode = Boolean(editId);

    const [isPrefilling, setIsPrefilling] = useState(false);
    const [name, setName] = useState('');
    const [targetInput, setTargetInput] = useState('');
    const [currentInput, setCurrentInput] = useState('');
    const [savingInput, setSavingInput] = useState('');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [emoji, setEmoji] = useState('🎯');
    const [color, setColor] = useState(colors.primary);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [startDate, setStartDate] = useState(Date.now());
    const [estimatedDateValue, setEstimatedDateValue] = useState(Date.now());
    const [reminderTime, setReminderTime] = useState<string | null>('08:00');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const targetAmount = parseRupiah(targetInput);
    const currentAmount = parseRupiah(currentInput);
    const savingPerPeriod = parseRupiah(savingInput);
    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);
    const isSharedWallet = Boolean(selectedWallet?.profile_id && selectedWallet.profile_id !== activeProfileId);
    const goalProfileId = selectedWallet?.profile_id || activeProfileId || undefined;

    useEffect(() => {
        loadWallets();
    }, [loadWallets]);

    useEffect(() => {
        let isMounted = true;

        const loadGoalForEdit = async () => {
            if (!editId) return;

            setIsPrefilling(true);
            try {
                const goal = await fetchSavingGoalById(editId);
                if (!goal) {
                    Alert.alert('Target tidak ditemukan');
                    navigation.goBack();
                    return;
                }

                if (!isMounted) return;

                setName(goal.name);
                setTargetInput(formatInputRupiah(String(goal.target_amount)));
                setCurrentInput(formatInputRupiah(String(goal.current_amount)));
                setSavingInput(formatInputRupiah(String(goal.saving_per_period)));
                setPeriodType(goal.period_type);
                setEmoji(goal.emoji);
                setColor(goal.color);
                setReminderEnabled(goal.reminder_enabled);
                setReminderTime(goal.reminder_time);
                setSelectedWalletId(goal.wallet_id || '');
                setStartDate(goal.start_date);
                setEstimatedDateValue(goal.estimated_date);
            } catch (error) {
                console.error('Failed to prefill saving goal:', error);
                if (isMounted) {
                    Alert.alert('Gagal', 'Gagal memuat data target untuk diedit.');
                    navigation.goBack();
                }
            } finally {
                if (isMounted) {
                    setIsPrefilling(false);
                }
            }
        };

        loadGoalForEdit();

        return () => {
            isMounted = false;
        };
    }, [editId, navigation]);

    useEffect(() => {
        if (selectedWalletId || wallets.length === 0 || (isEditMode && isPrefilling)) {
            return;
        }

        const defaultWallet = wallets.find((wallet) => wallet.is_default);
        setSelectedWalletId(defaultWallet?.id || wallets[0].id);
    }, [isEditMode, isPrefilling, selectedWalletId, wallets]);

    const simulation = useMemo(() => {
        if (targetAmount > 0 && savingPerPeriod > 0 && targetAmount > currentAmount) {
            return simulateSaving(targetAmount, currentAmount, savingPerPeriod, periodType);
        }
        return null;
    }, [currentAmount, periodType, savingPerPeriod, targetAmount]);

    const goalMetaPreview = getGoalComputedMeta(
        {
            id: editId || 'preview',
            name,
            target_amount: targetAmount,
            current_amount: currentAmount,
            emoji,
            photo_uri: null,
            saving_per_period: savingPerPeriod,
            period_type: periodType,
            color,
            start_date: startDate,
            estimated_date: estimatedDateValue,
            is_completed: false,
            reminder_enabled: reminderEnabled,
            reminder_time: reminderTime,
            created_at: startDate,
            wallet_id: selectedWalletId || undefined,
            profile_id: goalProfileId,
            owner_user_id: currentUserId ?? null,
        },
        selectedWallet,
        activeProfileId,
        [],
        currentUserId,
        null,
        currentUserEmail,
    );

    const clearFieldError = (field: string) => {
        setErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const handleSave = async () => {
        const nextErrors: Record<string, string> = {};
        const nameError = validateGoalName(name);
        const targetError = validateTargetAmount(targetAmount);
        const savingError = validateSavingPerPeriod(savingPerPeriod, targetAmount);

        if (nameError) nextErrors.name = nameError;
        if (targetError) nextErrors.target = targetError;
        if (savingError) nextErrors.saving = savingError;
        if (!selectedWalletId) nextErrors.wallet = 'Pilih dompet untuk menempatkan target ini';

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const estimatedDate = simulation?.estimatedDate.getTime() ?? estimatedDateValue ?? Date.now();
        const nextReminderTime = reminderEnabled ? reminderTime || '08:00' : null;
        const payload = {
            name: name.trim(),
            target_amount: targetAmount,
            current_amount: currentAmount,
            emoji,
            photo_uri: null,
            saving_per_period: savingPerPeriod,
            period_type: periodType,
            color,
            start_date: startDate,
            estimated_date: estimatedDate,
            is_completed: currentAmount >= targetAmount && targetAmount > 0,
            reminder_enabled: reminderEnabled,
            reminder_time: nextReminderTime,
            wallet_id: selectedWalletId,
            profile_id: goalProfileId,
        };

        try {
            if (isEditMode && editId) {
                await editGoal(editId, payload);
            } else {
                await addGoal(payload);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
        } catch (error) {
            console.error('Failed to save goal:', error);
            Alert.alert('Gagal', 'Perubahan target belum berhasil disimpan. Coba lagi.');
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <AppScreenHeader
                    title={isEditMode ? 'Edit Target' : 'Buat Target'}
                    subtitle={isEditMode ? 'Perbarui target tanpa mengubah struktur inti form.' : 'Buat target yang langsung selaras dengan dompet, ritme, dan reminder.'}
                    showClose
                    onClosePress={() => navigation.goBack()}
                />

                {isPrefilling ? (
                    <View style={[styles.loadingWrap, { paddingHorizontal: metrics.horizontalPadding }]}>
                        <StatePanel
                            loading
                            title="Memuat target"
                            description="Data target sedang disiapkan agar siap diedit."
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
                        <LinearGradient
                            colors={[color, colors.primaryDark, color]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.previewCard}
                        >
                            <View style={styles.previewBadgeRow}>
                                {selectedWallet ? (
                                    <ContextBadge
                                        icon={isSharedWallet ? 'account-group-outline' : 'wallet-outline'}
                                        label={selectedWallet.name}
                                        inverse
                                    />
                                ) : null}
                                <ContextBadge
                                    icon={goalMetaPreview.isSharedGoal ? 'account-group-outline' : 'account-outline'}
                                    label={goalMetaPreview.scopeLabel}
                                    inverse
                                />
                            </View>

                            <View style={styles.previewHeader}>
                                <View style={styles.previewEmojiWrap}>
                                    <Text style={styles.previewEmoji}>{emoji}</Text>
                                </View>
                                <View style={styles.previewCopy}>
                                    <Text style={styles.previewTitle} numberOfLines={1}>
                                        {name.trim() || 'Nama targetmu'}
                                    </Text>
                                    <Text style={styles.previewSubtitle} numberOfLines={2}>
                                        {goalMetaPreview.scopeDescription}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.previewMetrics}>
                                <View style={styles.previewMetric}>
                                    <Text style={styles.previewMetricLabel}>Target</Text>
                                    <Text style={styles.previewMetricValue}>{targetInput ? `Rp ${targetInput}` : 'Rp 0'}</Text>
                                </View>
                                <View style={styles.previewMetric}>
                                    <Text style={styles.previewMetricLabel}>Estimasi</Text>
                                    <Text style={styles.previewMetricValueSmall}>
                                        {simulation ? formatEstimatedDate(simulation.estimatedDate) : 'Menunggu simulasi'}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <FormSection
                            title="Konteks dompet"
                            subtitle="Target akan melekat ke dompet ini agar ownership dan konteks shared wallet tetap jelas."
                        >
                            <View style={styles.walletWrap}>
                                {wallets.map((wallet) => {
                                    const active = selectedWalletId === wallet.id;
                                    const shared = Boolean(wallet.profile_id && wallet.profile_id !== activeProfileId);
                                    return (
                                        <TouchableOpacity
                                            key={wallet.id}
                                            style={[
                                                styles.walletChip,
                                                active ? { borderColor: wallet.color, backgroundColor: `${wallet.color}16` } : null,
                                            ]}
                                            onPress={() => {
                                                setSelectedWalletId(wallet.id);
                                                clearFieldError('wallet');
                                            }}
                                        >
                                            <View style={[styles.walletIcon, { backgroundColor: active ? wallet.color : colors.surfaceAlt }]}>
                                                <MaterialCommunityIcons
                                                    name={shared ? 'account-group-outline' : 'wallet-outline'}
                                                    size={16}
                                                    color={active ? colors.textInverse : wallet.color}
                                                />
                                            </View>
                                            <View style={styles.walletCopy}>
                                                <Text style={[styles.walletTitle, active ? styles.walletTitleActive : null]} numberOfLines={1}>
                                                    {wallet.name}
                                                </Text>
                                                <Text style={styles.walletMeta}>{shared ? 'Shared wallet' : 'Personal wallet'}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {errors.wallet ? <Text style={styles.errorText}>{errors.wallet}</Text> : null}
                        </FormSection>

                        <FormSection
                            title="Identitas target"
                            subtitle="Nama dan ikon dipakai di daftar target, dashboard, dan ruang kolaborasi."
                        >
                            <Input
                                label="Nama Target"
                                value={name}
                                onChangeText={(value) => {
                                    setName(value);
                                    clearFieldError('name');
                                }}
                                error={errors.name}
                                leftIcon="tag-outline"
                                placeholder="Contoh: MacBook Air M3"
                                required
                            />

                            <View style={styles.emojiWrap}>
                                {EMOJIS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.emojiButton, emoji === item ? { borderColor: color, backgroundColor: `${color}14` } : null]}
                                        onPress={() => setEmoji(item)}
                                    >
                                        <Text style={styles.emojiButtonText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormSection>

                        <FormSection
                            title="Nominal dan ritme"
                            subtitle="Tentukan target akhir, modal awal, dan pola menabung yang paling masuk akal."
                        >
                            <View style={styles.rupiahInput}>
                                <Text style={styles.prefix}>Rp</Text>
                                <TextInput
                                    style={styles.numericInput}
                                    value={targetInput}
                                    onChangeText={(value) => {
                                        setTargetInput(formatInputRupiah(value));
                                        clearFieldError('target');
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.textDisabled}
                                />
                            </View>
                            {errors.target ? <Text style={styles.errorText}>{errors.target}</Text> : null}

                            <Input
                                label="Modal Awal"
                                value={currentInput}
                                onChangeText={(value) => setCurrentInput(formatInputRupiah(value))}
                                keyboardType="numeric"
                                placeholder="0"
                                leftIcon="cash-plus"
                                hint="Boleh dikosongkan bila baru memulai dari nol."
                            />

                            <View style={styles.rupiahInput}>
                                <Text style={styles.prefix}>Rp</Text>
                                <TextInput
                                    style={styles.numericInput}
                                    value={savingInput}
                                    onChangeText={(value) => {
                                        setSavingInput(formatInputRupiah(value));
                                        clearFieldError('saving');
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.textDisabled}
                                />
                            </View>
                            {errors.saving ? <Text style={styles.errorText}>{errors.saving}</Text> : null}

                            <SegmentedControl<PeriodType>
                                value={periodType}
                                onChange={setPeriodType}
                                options={[
                                    { id: 'daily', label: 'Harian' },
                                    { id: 'weekly', label: 'Mingguan' },
                                    { id: 'monthly', label: 'Bulanan' },
                                ]}
                            />

                            {simulation ? (
                                <View style={styles.simulationCard}>
                                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                                    <Text style={styles.simulationText}>
                                        Dengan ritme ini, target diperkirakan tercapai pada{' '}
                                        <Text style={styles.simulationHighlight}>{formatEstimatedDate(simulation.estimatedDate)}</Text>.
                                    </Text>
                                </View>
                            ) : null}
                        </FormSection>

                        <FormSection
                            title="Visual dan reminder"
                            subtitle="Atur warna utama target dan nyalakan reminder bila ingin ritme menabung lebih konsisten."
                        >
                            <View style={styles.colorWrap}>
                                {GOAL_COLORS.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[styles.colorButton, { backgroundColor: item }]}
                                        onPress={() => setColor(item as any)}
                                    >
                                        {color === item ? (
                                            <MaterialCommunityIcons name="check" size={18} color={colors.textInverse} />
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.switchCopy}>
                                    <Text style={styles.switchTitle}>Pengingat menabung</Text>
                                    <Text style={styles.switchDescription}>
                                        Notifikasi rutin sesuai periode menabung agar target tetap bergerak.
                                    </Text>
                                </View>
                                <Switch
                                    value={reminderEnabled}
                                    onValueChange={setReminderEnabled}
                                    trackColor={{ false: colors.surfaceMuted, true: colors.primaryLight }}
                                    thumbColor={reminderEnabled ? colors.primary : colors.surfaceElevated}
                                />
                            </View>
                        </FormSection>
                    </ScrollView>
                )}

                {!isPrefilling ? (
                    <PrimaryActionBar
                        primaryLabel={isEditMode ? 'Simpan Perubahan' : 'Buat Target'}
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
        loadingWrap: {
            flex: 1,
            justifyContent: 'center',
        },
        content: {
            gap: 18,
            paddingTop: 20,
        },
        previewCard: {
            borderRadius: BorderRadius['5xl'],
            padding: 22,
            gap: 16,
            overflow: 'hidden',
        },
        previewBadgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        previewHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        previewEmojiWrap: {
            width: 56,
            height: 56,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        previewEmoji: {
            fontSize: 28,
        },
        previewCopy: {
            flex: 1,
        },
        previewTitle: {
            ...Typography.h4,
            color: colors.textInverse,
        },
        previewSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.82)',
            marginTop: 4,
        },
        previewMetrics: {
            flexDirection: 'row',
            gap: 12,
        },
        previewMetric: {
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            borderRadius: BorderRadius['2xl'],
            padding: 14,
        },
        previewMetricLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.78)',
        },
        previewMetricValue: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
            color: colors.textInverse,
            marginTop: 4,
        },
        previewMetricValueSmall: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textInverse,
            marginTop: 4,
        },
        walletWrap: {
            gap: 10,
        },
        walletChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
        },
        walletIcon: {
            width: 38,
            height: 38,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        walletCopy: {
            flex: 1,
        },
        walletTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        walletTitleActive: {
            color: colors.textPrimary,
        },
        walletMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        emojiWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        emojiButton: {
            width: 54,
            height: 54,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        emojiButtonText: {
            fontSize: 28,
        },
        rupiahInput: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            minHeight: 56,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            paddingHorizontal: 16,
        },
        prefix: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
            color: colors.textSecondary,
        },
        numericInput: {
            flex: 1,
            fontFamily: FontFamily.heading,
            fontSize: FontSize.h3,
            color: colors.textPrimary,
            paddingVertical: 12,
        },
        simulationCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: `${colors.primaryLight}88`,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
            borderRadius: BorderRadius['2xl'],
            padding: 14,
        },
        simulationText: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textPrimary,
        },
        simulationHighlight: {
            fontFamily: FontFamily.bodyBold,
            color: colors.primary,
        },
        colorWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        colorButton: {
            width: 42,
            height: 42,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
        },
        switchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
        },
        switchCopy: {
            flex: 1,
        },
        switchTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        switchDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        errorText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.danger,
        },
    });

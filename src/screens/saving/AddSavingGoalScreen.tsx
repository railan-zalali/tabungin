// Layar Buat/Edit Target tabungan.
// Section form diekstrak ke components/saving/* agar screen cukup
// berisi state, validasi, dan komposisi.
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FontFamily, FontSize } from '../../constants/typography';
import { useSavingStore } from '../../store/useSavingStore';
import { Button } from '../../components/common/Button';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import {
    validateGoalName,
    validateTargetAmount,
    validateSavingPerPeriod,
} from '../../utils/validation';
import type { PeriodType } from '../../types/saving';
import type { SavingNavigationProp, SavingStackParamList } from '../../types/navigation';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import { getGoalComputedMeta } from '../../utils/goalSharing';
import { GoalPreviewCard } from '../../components/saving/GoalPreviewCard';
import { WalletSelector } from '../../components/saving/WalletSelector';
import { GoalAmountSection } from '../../components/saving/GoalAmountSection';
import { GoalBasicInfoSection } from '../../components/saving/GoalBasicInfoSection';
import { GoalVisualSection } from '../../components/saving/GoalVisualSection';

export function AddSavingGoalScreen() {
    const navigation = useNavigation<SavingNavigationProp<'AddSavingGoal'>>();
    const route = useRoute<RouteProp<SavingStackParamList, 'AddSavingGoal'>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { addGoal, editGoal, loadGoalById, isLoading } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const editId = route.params?.editId;
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
    const isSharedWallet = Boolean(
        selectedWallet?.profile_id && selectedWallet.profile_id !== activeProfileId,
    );
    const goalProfileId = selectedWallet?.profile_id || activeProfileId || undefined;
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
        },
        selectedWallet,
        activeProfileId,
    );

    useEffect(() => {
        loadWallets();
    }, [loadWallets]);

    useEffect(() => {
        let isMounted = true;

        const loadGoalForEdit = async () => {
            if (!editId) return;

            setIsPrefilling(true);
            try {
                // Data target diambil lewat store (bukan query langsung) supaya
                // screen tidak menyentuh layer DB — roadmap §4.1 P2-02.
                await loadGoalById(editId);
                const goal = useSavingStore.getState().currentGoal;
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
                if (isMounted) setIsPrefilling(false);
            }
        };

        loadGoalForEdit();

        return () => {
            isMounted = false;
        };
    }, [editId, loadGoalById, navigation]);

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
    }, [targetAmount, currentAmount, savingPerPeriod, periodType]);

    const clearFieldError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const selectWallet = (walletId: string) => {
        setSelectedWalletId(walletId);
        clearFieldError('wallet');
    };

    const handleSave = async () => {
        const nextErrors: Record<string, string> = {};
        const nameErr = validateGoalName(name);
        const targetErr = validateTargetAmount(targetAmount);
        const savingErr = validateSavingPerPeriod(savingPerPeriod, targetAmount);

        if (nameErr) nextErrors.name = nameErr;
        if (targetErr) nextErrors.target = targetErr;
        if (savingErr) nextErrors.saving = savingErr;
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
        <ScreenShell topInset={false} bottomInset={false} surfaceVariant="alt">
            <AppScreenHeader
                title={isEditMode ? 'Edit Target' : 'Buat Target'}
                subtitle={
                    isEditMode
                        ? 'Edit target ini untuk diperbarui'
                        : 'Lebih rapi, lebih jelas, dan siap terkait ke dompet'
                }
                showClose
                onClosePress={() => navigation.goBack()}
                variant="transparent"
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                {isPrefilling ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>
                            Memuat target...
                        </Text>
                        <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
                            Kami sedang menyiapkan data target agar siap diedit.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <GoalPreviewCard
                            color={color}
                            emoji={emoji}
                            name={name}
                            targetLabel={targetInput ? `Rp ${targetInput}` : 'Rp 0'}
                            estimatedLabel={
                                simulation ? formatEstimatedDate(simulation.estimatedDate) : 'Menunggu simulasi'
                            }
                            wallet={selectedWallet}
                            isSharedWallet={isSharedWallet}
                            isSharedGoal={goalMetaPreview.isSharedGoal}
                            scopeLabel={goalMetaPreview.scopeLabel}
                            scopeDescription={goalMetaPreview.scopeDescription}
                        />

                        <Animated.View
                            entering={FadeInDown.delay(120).springify()}
                            style={[styles.sectionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                        >
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                Konteks Dompet
                            </Text>
                            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                                Target akan melekat ke dompet ini sehingga lebih mudah dibaca,
                                dilacak, dan dipersiapkan untuk konteks shared wallet.
                            </Text>
                            <WalletSelector
                                wallets={wallets}
                                activeProfileId={activeProfileId}
                                selectedWalletId={selectedWalletId}
                                onSelect={selectWallet}
                                errorMessage={errors.wallet}
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(180).springify()}>
                            <GoalBasicInfoSection
                                name={name}
                                onNameChange={(value) => {
                                    setName(value);
                                    clearFieldError('name');
                                }}
                                emoji={emoji}
                                onEmojiChange={setEmoji}
                                accentColor={color}
                                nameError={errors.name}
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(240).springify()}>
                            <GoalAmountSection
                                targetInput={targetInput}
                                onTargetChange={(value) => {
                                    setTargetInput(formatInputRupiah(value));
                                    clearFieldError('target');
                                }}
                                currentInput={currentInput}
                                onCurrentChange={(value) => setCurrentInput(formatInputRupiah(value))}
                                savingInput={savingInput}
                                onSavingChange={(value) => {
                                    setSavingInput(formatInputRupiah(value));
                                    clearFieldError('saving');
                                }}
                                periodType={periodType}
                                onPeriodChange={setPeriodType}
                                errors={{ target: errors.target, saving: errors.saving }}
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(300).springify()}>
                            <GoalVisualSection
                                color={color}
                                onColorChange={setColor}
                                estimatedLabel={simulation ? formatEstimatedDate(simulation.estimatedDate) : null}
                                reminderEnabled={reminderEnabled}
                                onReminderChange={setReminderEnabled}
                            />
                        </Animated.View>
                    </ScrollView>
                )}

                <View style={[styles.footer, { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border }]}>
                    <Button
                        label={isEditMode ? 'Simpan Perubahan' : 'Buat Target'}
                        onPress={handleSave}
                        variant="primary"
                        size="lg"
                        loading={isLoading || isPrefilling}
                        disabled={isPrefilling}
                        fullWidth
                    />
                </View>
            </KeyboardAvoidingView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        flex: { flex: 1 },
        loadingState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 10,
        },
        loadingTitle: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h4,
        },
        loadingSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            textAlign: 'center',
        },
        content: { padding: 20, gap: 18, paddingBottom: 48 },
        sectionCard: {
            borderWidth: 1,
            borderRadius: 24,
            padding: 18,
            gap: 12,
            shadowColor: colors.shadowColor,
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 1,
        },
        sectionTitle: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.body,
        },
        sectionHint: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 20,
        },
        footer: {
            padding: 20,
            paddingBottom: 32,
            borderTopWidth: 1,
        },
    });

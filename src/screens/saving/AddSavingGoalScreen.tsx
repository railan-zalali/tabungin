import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Switch,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import { useSavingStore } from '../../store/useSavingStore';
import { fetchSavingGoalById } from '../../database/savingQueries';
import { Button } from '../../components/common/Button';
import { NavigationBar } from '../../components/common/NavigationBar';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import { validateGoalName, validateTargetAmount, validateSavingPerPeriod } from '../../utils/validation';
import type { PeriodType } from '../../types/saving';
import { BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';
import { ContextBadge } from '../../components/common/ContextBadge';
import { getGoalComputedMeta } from '../../utils/goalSharing';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

export function AddSavingGoalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<RouteProp<any, 'AddSavingGoal'>>();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { addGoal, editGoal, isLoading } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

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
        activeProfileId
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
                if (isMounted) setIsPrefilling(false);
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
    }, [targetAmount, currentAmount, savingPerPeriod, periodType]);

    const clearFieldError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
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

    const periodOptions: { id: PeriodType; label: string }[] = [
        { id: 'daily', label: 'Hari' },
        { id: 'weekly', label: 'Minggu' },
        { id: 'monthly', label: 'Bulan' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Target' : 'Buat Target'}</Text>
                        <Text style={styles.headerSubtitle}>{isEditMode ? 'Edit target ini untuk diperbarui' : 'Lebih rapi, lebih jelas, dan siap terkait ke dompet'}</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {isPrefilling ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingTitle}>Memuat target...</Text>
                        <Text style={styles.loadingSubtitle}>
                            Kami sedang menyiapkan data target agar siap diedit.
                        </Text>
                    </View>
                ) : (
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.delay(60).springify()}>
                        <LinearGradient
                            colors={[color, colors.primaryDark, color]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.previewCard}
                        >
                            <View style={styles.previewOrb} />
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
                                <View style={styles.previewInfo}>
                                    <Text style={styles.previewTitle} numberOfLines={1}>
                                        {name.trim() || 'Nama targetmu'}
                                    </Text>
                                    <Text style={styles.previewSubtitle} numberOfLines={1}>
                                        {goalMetaPreview.scopeDescription}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.previewMetrics}>
                                <View>
                                    <Text style={styles.previewMetricLabel}>Target</Text>
                                    <Text style={styles.previewMetricValue}>{targetInput ? `Rp ${targetInput}` : 'Rp 0'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.previewMetricLabel}>Estimasi</Text>
                                    <Text style={styles.previewMetricValueSmall}>
                                        {simulation ? formatEstimatedDate(simulation.estimatedDate) : 'Menunggu simulasi'}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Konteks Dompet</Text>
                        <Text style={styles.sectionHint}>
                            Target akan melekat ke dompet ini sehingga lebih mudah dibaca, dilacak, dan dipersiapkan untuk konteks shared wallet.
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletRow}>
                            {wallets.map((wallet) => {
                                const active = selectedWalletId === wallet.id;
                                const shared = Boolean(wallet.profile_id && wallet.profile_id !== activeProfileId);
                                return (
                                    <TouchableOpacity
                                        key={wallet.id}
                                        style={[
                                            styles.walletChip,
                                            active && { borderColor: wallet.color, backgroundColor: `${wallet.color}16` },
                                        ]}
                                        onPress={() => {
                                            setSelectedWalletId(wallet.id);
                                            clearFieldError('wallet');
                                        }}
                                    >
                                        <View style={[styles.walletIconWrap, { backgroundColor: active ? wallet.color : `${colors.surface}D4` }]}>
                                            <MaterialCommunityIcons
                                                name={shared ? 'account-group-outline' : 'wallet-outline'}
                                                size={16}
                                                color={active ? colors.textInverse : wallet.color}
                                            />
                                        </View>
                                        <View style={styles.walletChipTextWrap}>
                                            <Text style={[styles.walletChipTitle, active && { color: colors.textPrimary }]} numberOfLines={1}>
                                                {wallet.name}
                                            </Text>
                                            <Text style={styles.walletChipMeta} numberOfLines={1}>
                                                {shared ? 'Shared wallet' : 'Personal wallet'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {selectedWallet && (
                            <View style={styles.walletInsightCard}>
                                <MaterialCommunityIcons
                                    name={isSharedWallet ? 'account-group-outline' : 'shield-check-outline'}
                                    size={18}
                                    color={isSharedWallet ? colors.info : colors.primary}
                                />
                                <Text style={styles.walletInsightText}>
                                    {isSharedWallet
                                        ? 'Karena target ini ditempatkan di dompet bersama, konteks dan progresnya akan terlihat sebagai goal bersama.'
                                        : 'Target ini akan tetap berada di ruang personal aktif, tetapi tetap terkait ke dompet yang kamu pilih.'}
                                </Text>
                            </View>
                        )}
                        {errors.wallet && <Text style={styles.errorText}>{errors.wallet}</Text>}
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Identitas Target</Text>
                        <Text style={styles.fieldLabel}>Nama Target</Text>
                        <View style={[styles.glassInput, errors.name ? styles.inputError : null]}>
                            <MaterialCommunityIcons name="tag-outline" size={18} color={colors.textSecondary} />
                            <TextInput
                                style={styles.textInput}
                                value={name}
                                onChangeText={(value) => {
                                    setName(value);
                                    clearFieldError('name');
                                }}
                                placeholder="cth: MacBook Air M3"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                        <Text style={styles.fieldLabel}>Pilih Ikon</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                            {EMOJIS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.emojiBtn, emoji === item && { borderColor: color, backgroundColor: `${color}18` }]}
                                    onPress={() => setEmoji(item)}
                                >
                                    <Text style={styles.emojiText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Nominal dan Ritme</Text>

                        <Text style={styles.fieldLabel}>Harga Target (Rp)</Text>
                        <View style={[styles.rupiahInput, errors.target ? styles.inputError : null]}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput
                                style={styles.numInput}
                                value={targetInput}
                                onChangeText={(value) => {
                                    setTargetInput(formatInputRupiah(value));
                                    clearFieldError('target');
                                }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        {errors.target && <Text style={styles.errorText}>{errors.target}</Text>}

                        <Text style={styles.fieldLabel}>Modal Awal (opsional)</Text>
                        <View style={styles.rupiahInput}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput
                                style={styles.numInput}
                                value={currentInput}
                                onChangeText={(value) => setCurrentInput(formatInputRupiah(value))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <Text style={styles.fieldLabel}>Rencana Menabung</Text>
                        <View style={styles.savingRow}>
                            <View style={[styles.rupiahInput, styles.savingInput, errors.saving ? styles.inputError : null]}>
                                <Text style={styles.prefix}>Rp</Text>
                                <TextInput
                                    style={styles.numInput}
                                    value={savingInput}
                                    onChangeText={(value) => {
                                        setSavingInput(formatInputRupiah(value));
                                        clearFieldError('saving');
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>
                            <View style={styles.periodSelector}>
                                {periodOptions.map((period) => (
                                    <TouchableOpacity
                                        key={period.id}
                                        style={[
                                            styles.periodBtn,
                                            periodType === period.id && styles.periodBtnActive,
                                        ]}
                                        onPress={() => setPeriodType(period.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.periodBtnText,
                                                periodType === period.id && styles.periodBtnTextActive,
                                            ]}
                                        >
                                            /{period.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {errors.saving && <Text style={styles.errorText}>{errors.saving}</Text>}
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Visual dan Reminder</Text>

                        <Text style={styles.fieldLabel}>Warna Tema</Text>
                        <View style={styles.colorRow}>
                            {GOAL_COLORS.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.colorBtn, { backgroundColor: item }]}
                                    onPress={() => setColor(item as any)}
                                >
                                    {color === item && (
                                        <View style={styles.checkIcon}>
                                            <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {simulation && (
                            <View style={styles.simulationCard}>
                                <View style={styles.simHeader}>
                                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
                                    <Text style={styles.simTitle}>Estimasi tercapai</Text>
                                </View>
                                <Text style={styles.simText}>
                                    Dengan ritme ini, target diperkirakan tercapai pada{' '}
                                    <Text style={styles.simHighlight}>{formatEstimatedDate(simulation.estimatedDate)}</Text>.
                                </Text>
                            </View>
                        )}

                        <View style={styles.switchContainer}>
                            <View style={styles.switchTextContainer}>
                                <Text style={styles.switchLabel}>Pengingat Menabung</Text>
                                <Text style={styles.switchDescription}>
                                    Notifikasi rutin sesuai periode menabung agar target tetap bergerak.
                                </Text>
                            </View>
                            <Switch
                                value={reminderEnabled}
                                onValueChange={setReminderEnabled}
                                trackColor={{ false: colors.border, true: colors.primaryLight }}
                                thumbColor={reminderEnabled ? colors.primary : colors.surfaceElevated}
                            />
                        </View>
                    </Animated.View>
                </ScrollView>
                )}

                <View style={styles.footer}>
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
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
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
        color: colors.textPrimary,
    },
    loadingSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        lineHeight: 22,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    headerCenter: { flex: 1 },
    headerTitle: { ...Typography.h3, color: colors.textPrimary },
    headerSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    content: { padding: 20, gap: 18, paddingBottom: 48 },
    previewCard: {
        borderRadius: 28,
        padding: 20,
        overflow: 'hidden',
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
    },
    previewBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    previewOrb: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        top: -60,
        right: -24,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewEmojiWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    previewEmoji: { fontSize: 28 },
    previewInfo: { flex: 1 },
    previewTitle: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: '#FFFFFF',
    },
    previewSubtitle: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.82)',
        marginTop: 4,
    },
    previewMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 22,
    },
    previewMetricLabel: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: 'rgba(255,255,255,0.76)',
    },
    previewMetricValue: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h3,
        color: '#FFFFFF',
        marginTop: 6,
    },
    previewMetricValueSmall: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: '#FFFFFF',
        marginTop: 6,
    },
    sectionCard: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textPrimary,
    },
    sectionHint: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    walletRow: {
        flexDirection: 'row',
        gap: 10,
    },
    walletChip: {
        width: 180,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    walletIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletChipTextWrap: { flex: 1 },
    walletChipTitle: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    walletChipMeta: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.label,
        color: colors.textSecondary,
        marginTop: 2,
    },
    walletInsightCard: {
        flexDirection: 'row',
        gap: 10,
        padding: 14,
        borderRadius: 18,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'flex-start',
    },
    walletInsightText: {
        flex: 1,
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        lineHeight: 20,
        color: colors.textSecondary,
    },
    fieldLabel: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    glassInput: {
        minHeight: 54,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    textInput: {
        flex: 1,
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: colors.textPrimary,
    },
    rupiahInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
        minHeight: 54,
    },
    inputError: { borderColor: colors.danger },
    prefix: {
        fontFamily: FontFamily.headingMedium,
        fontSize: FontSize.h4,
        color: colors.textSecondary,
    },
    numInput: {
        flex: 1,
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h3,
        color: colors.textPrimary,
        padding: 0,
        height: 40,
    },
    errorText: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.danger,
    },
    emojiRow: { flexDirection: 'row', gap: 12 },
    emojiBtn: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emojiText: { fontSize: 28 },
    savingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    savingInput: { flex: 1 },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceElevated,
        borderRadius: 16,
        padding: 4,
        gap: 2,
        borderWidth: 1,
        borderColor: colors.border,
        height: 54,
        alignItems: 'center',
    },
    periodBtn: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        borderRadius: 12,
    },
    periodBtnActive: { backgroundColor: colors.primaryBg },
    periodBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: colors.textSecondary },
    periodBtnTextActive: { color: colors.primary, fontFamily: FontFamily.bodyBold },
    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    simulationCard: {
        backgroundColor: `${colors.primaryLight}88`,
        borderRadius: 18,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: `${colors.primary}24`,
    },
    simHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    simTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: colors.primary },
    simText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textPrimary, lineHeight: 22 },
    simHighlight: { fontFamily: FontFamily.bodyBold, color: colors.primary },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceElevated,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 1,
    },
    switchTextContainer: { flex: 1, marginRight: 16 },
    switchLabel: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    switchDescription: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: colors.textSecondary,
    },
    footer: {
        padding: 20,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
});

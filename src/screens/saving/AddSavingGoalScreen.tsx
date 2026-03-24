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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import { useSavingStore } from '../../store/useSavingStore';
import { Button } from '../../components/common/Button';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import { validateGoalName, validateTargetAmount, validateSavingPerPeriod } from '../../utils/validation';
import type { PeriodType } from '../../types/saving';
import { Shadow } from '../../constants/theme';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useProfileStore } from '../../store/useProfileStore';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

export function AddSavingGoalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const { addGoal, isLoading } = useSavingStore();
    const { wallets, loadWallets } = useWalletStore();
    const activeProfileId = useProfileStore((state) => state.activeProfileId);

    const [name, setName] = useState('');
    const [targetInput, setTargetInput] = useState('');
    const [currentInput, setCurrentInput] = useState('');
    const [savingInput, setSavingInput] = useState('');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [emoji, setEmoji] = useState('🎯');
    const [color, setColor] = useState(colors.primary);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const targetAmount = parseRupiah(targetInput);
    const currentAmount = parseRupiah(currentInput);
    const savingPerPeriod = parseRupiah(savingInput);
    const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);
    const isSharedWallet = Boolean(selectedWallet?.profile_id && selectedWallet.profile_id !== activeProfileId);

    useEffect(() => {
        loadWallets();
    }, []);

    useEffect(() => {
        if (!selectedWalletId && wallets.length > 0) {
            const defaultWallet = wallets.find((wallet) => wallet.is_default);
            setSelectedWalletId(defaultWallet?.id || wallets[0].id);
        }
    }, [wallets, selectedWalletId]);

    const simulation = useMemo(() => {
        if (targetAmount > 0 && savingPerPeriod > 0 && targetAmount > currentAmount) {
            return simulateSaving(targetAmount, currentAmount, savingPerPeriod, periodType);
        }
        return null;
    }, [targetAmount, currentAmount, savingPerPeriod, periodType]);

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

        const estimatedDate = simulation?.estimatedDate ?? new Date();
        await addGoal({
            name: name.trim(),
            target_amount: targetAmount,
            current_amount: currentAmount,
            emoji,
            photo_uri: null,
            saving_per_period: savingPerPeriod,
            period_type: periodType,
            color,
            start_date: Date.now(),
            estimated_date: estimatedDate.getTime(),
            is_completed: false,
            reminder_enabled: reminderEnabled,
            reminder_time: reminderEnabled ? '08:00' : null,
            wallet_id: selectedWalletId,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
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
                        <Text style={styles.headerTitle}>Buat Target</Text>
                        <Text style={styles.headerSubtitle}>Lebih rapi, lebih jelas, dan siap terkait ke dompet</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.delay(60).springify()}>
                        <LinearGradient
                            colors={[color, colors.primaryDark, color]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.previewCard, Shadow.md]}
                        >
                            <View style={styles.previewOrb} />
                            <View style={styles.previewHeader}>
                                <View style={styles.previewEmojiWrap}>
                                    <Text style={styles.previewEmoji}>{emoji}</Text>
                                </View>
                                <View style={styles.previewInfo}>
                                    <Text style={styles.previewTitle} numberOfLines={1}>
                                        {name.trim() || 'Nama targetmu'}
                                    </Text>
                                    <Text style={styles.previewSubtitle} numberOfLines={1}>
                                        {selectedWallet?.name || 'Pilih dompet terlebih dahulu'}
                                    </Text>
                                </View>
                                {isSharedWallet && (
                                    <View style={styles.previewSharedChip}>
                                        <MaterialCommunityIcons name="account-group-outline" size={12} color="#FFFFFF" />
                                        <Text style={styles.previewSharedText}>Shared</Text>
                                    </View>
                                )}
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
                                            setErrors((prev) => ({ ...prev, wallet: undefined as any }));
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
                                    setErrors((prev) => ({ ...prev, name: undefined as any }));
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
                                    setErrors((prev) => ({ ...prev, target: undefined as any }));
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
                                        setErrors((prev) => ({ ...prev, saving: undefined as any }));
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
                                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
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
                                thumbColor={reminderEnabled ? colors.primary : '#FFF'}
                            />
                        </View>
                    </Animated.View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        label="Buat Target"
                        onPress={handleSave}
                        variant="primary"
                        size="lg"
                        loading={isLoading}
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
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.surface}D8`,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
    previewSharedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    previewSharedText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.caption,
        color: '#FFFFFF',
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
        backgroundColor: `${colors.surface}D8`,
        borderWidth: 1,
        borderColor: `${colors.border}B0`,
        borderRadius: 24,
        padding: 18,
        gap: 12,
        ...Shadow.sm,
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
        borderColor: `${colors.border}B0`,
        backgroundColor: `${colors.background}90`,
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
        borderColor: `${colors.border}AA`,
        backgroundColor: `${colors.background}92`,
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
        backgroundColor: `${colors.background}92`,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
        backgroundColor: `${colors.background}94`,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
    },
    emojiText: { fontSize: 28 },
    savingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    savingInput: { flex: 1 },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: `${colors.background}92`,
        borderRadius: 16,
        padding: 4,
        gap: 2,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
        backgroundColor: `${colors.background}92`,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: `${colors.border}AA`,
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
        borderTopColor: `${colors.border}AA`,
        backgroundColor: `${colors.surface}F2`,
    },
});

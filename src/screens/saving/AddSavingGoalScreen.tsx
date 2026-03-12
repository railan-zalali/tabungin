import React, { useState, useMemo } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import { useSavingStore } from '../../store/useSavingStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import { validateGoalName, validateTargetAmount, validateSavingPerPeriod } from '../../utils/validation';
import type { PeriodType } from '../../types/saving';
import { Shadow } from '../../constants/theme';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

export function AddSavingGoalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const { addGoal, isLoading } = useSavingStore();

    const [name, setName] = useState('');
    const [targetInput, setTargetInput] = useState('');
    const [currentInput, setCurrentInput] = useState('');
    const [savingInput, setSavingInput] = useState('');
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [emoji, setEmoji] = useState('🎯');
    const [color, setColor] = useState(Colors.primary);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const targetAmount = parseRupiah(targetInput);
    const currentAmount = parseRupiah(currentInput);
    const savingPerPeriod = parseRupiah(savingInput);

    // Auto-kalkulasi real-time
    const simulation = useMemo(() => {
        if (targetAmount > 0 && savingPerPeriod > 0 && targetAmount > currentAmount) {
            return simulateSaving(targetAmount, currentAmount, savingPerPeriod, periodType);
        }
        return null;
    }, [targetAmount, currentAmount, savingPerPeriod, periodType]);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            alert('Izin akses galeri dibutuhkan untuk menambahkan foto');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        const errs: Record<string, string> = {};
        const nameErr = validateGoalName(name);
        const targetErr = validateTargetAmount(targetAmount);
        const savingErr = validateSavingPerPeriod(savingPerPeriod, targetAmount);
        if (nameErr) errs.name = nameErr;
        if (targetErr) errs.target = targetErr;
        if (savingErr) errs.saving = savingErr;
        setErrors(errs);
        if (Object.keys(errs).length > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const estimatedDate = simulation?.estimatedDate ?? new Date();
        await addGoal({
            name: name.trim(),
            target_amount: targetAmount,
            current_amount: currentAmount,
            emoji,
            photo_uri: photoUri,
            saving_per_period: savingPerPeriod,
            period_type: periodType,
            color,
            start_date: Date.now(),
            estimated_date: estimatedDate.getTime(),
            is_completed: false,
            reminder_enabled: reminderEnabled,
            reminder_time: reminderEnabled ? '08:00' : null,
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
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Buat Target</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Emoji Picker */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Pilih Ikon</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                            {EMOJIS.map((e) => (
                                <TouchableOpacity
                                    key={e}
                                    style={[styles.emojiBtn, emoji === e && styles.emojiBtnSelected]}
                                    onPress={() => setEmoji(e)}
                                >
                                    <Text style={styles.emojiText}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <Input
                        label="Nama Target"
                        value={name}
                        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined as any })); }}
                        placeholder="cth: MacBook Air M3"
                        leftIcon="tag-outline"
                        error={errors.name}
                        required
                    />

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Harga Target (Rp) *</Text>
                        <View style={[styles.rupiahInput, errors.target ? styles.inputError : null]}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput
                                style={styles.numInput}
                                value={targetInput}
                                onChangeText={(v) => { setTargetInput(formatInputRupiah(v)); setErrors((e) => ({ ...e, target: undefined as any })); }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textDisabled}
                            />
                        </View>
                        {errors.target && <Text style={styles.errorText}>{errors.target}</Text>}
                    </View>

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Modal Awal (opsional)</Text>
                        <View style={styles.rupiahInput}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput 
                                style={styles.numInput} 
                                value={currentInput} 
                                onChangeText={(v) => setCurrentInput(formatInputRupiah(v))} 
                                keyboardType="numeric" 
                                placeholder="0" 
                                placeholderTextColor={Colors.textDisabled} 
                            />
                        </View>
                    </View>

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Rencana Menabung *</Text>
                        <View style={styles.savingRow}>
                            <View style={[styles.rupiahInput, { flex: 1 }, errors.saving ? styles.inputError : null]}>
                                <Text style={styles.prefix}>Rp</Text>
                                <TextInput 
                                    style={styles.numInput} 
                                    value={savingInput} 
                                    onChangeText={(v) => { setSavingInput(formatInputRupiah(v)); setErrors((e) => ({ ...e, saving: undefined as any })); }} 
                                    keyboardType="numeric" 
                                    placeholder="0" 
                                    placeholderTextColor={Colors.textDisabled} 
                                />
                            </View>
                            <View style={styles.periodSelector}>
                                {periodOptions.map((p) => (
                                    <TouchableOpacity 
                                        key={p.id} 
                                        style={[styles.periodBtn, periodType === p.id && styles.periodBtnActive]} 
                                        onPress={() => setPeriodType(p.id)}
                                    >
                                        <Text style={[styles.periodBtnText, periodType === p.id && styles.periodBtnTextActive]}>
                                            /{p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {errors.saving && <Text style={styles.errorText}>{errors.saving}</Text>}
                    </View>

                    {/* Color Picker */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel}>Warna Tema</Text>
                        <View style={styles.colorRow}>
                            {GOAL_COLORS.map((c) => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[styles.colorBtn, { backgroundColor: c }]} 
                                    onPress={() => setColor(c as any)}
                                >
                                    {color === c && (
                                        <View style={styles.checkIcon}>
                                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Auto-kalkulasi */}
                    {simulation && (
                        <View style={styles.simulationCard}>
                            <View style={styles.simHeader}>
                                <MaterialCommunityIcons name="calculator" size={20} color={Colors.primary} />
                                <Text style={styles.simTitle}>Estimasi Tercapai</Text>
                            </View>
                            <Text style={styles.simText}>
                                Kamu akan mencapai target dalam <Text style={styles.simHighlight}>{simulation.days} hari</Text>
                                {'\n'}yaitu pada tanggal <Text style={styles.simHighlight}>{formatEstimatedDate(simulation.estimatedDate)}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Reminder Toggle */}
                    <View style={styles.switchContainer}>
                        <View style={styles.switchTextContainer}>
                            <Text style={styles.switchLabel}>Pengingat Menabung</Text>
                            <Text style={styles.switchDescription}>
                                Notifikasi rutin sesuai periode menabung
                            </Text>
                        </View>
                        <Switch
                            value={reminderEnabled}
                            onValueChange={setReminderEnabled}
                            trackColor={{ false: Colors.neutral300, true: Colors.primaryLight }}
                            thumbColor={reminderEnabled ? Colors.primary : '#FFF'}
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button 
                        label="Buat Target 🎯" 
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    flex: { flex: 1 },
    
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: Colors.divider 
    },
    closeBtn: { padding: 4 },
    headerTitle: { ...Typography.h3, color: Colors.textPrimary },
    
    content: { padding: 20, gap: 24, paddingBottom: 40 },
    
    fieldSection: { gap: 12 },
    fieldLabel: { 
        fontFamily: FontFamily.bodyBold, 
        fontSize: FontSize.caption, 
        color: Colors.textSecondary, 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },
    
    emojiRow: { flexDirection: 'row', gap: 12 },
    emojiBtn: { 
        width: 56, 
        height: 56, 
        borderRadius: 16, 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: Colors.surface, 
        borderWidth: 1, 
        borderColor: Colors.border 
    },
    emojiBtnSelected: { 
        borderColor: Colors.primary, 
        backgroundColor: Colors.primaryBg,
        borderWidth: 1.5
    },
    emojiText: { fontSize: 28 },
    
    rupiahInput: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Colors.surface, 
        borderRadius: 12, 
        paddingHorizontal: 16, 
        paddingVertical: 14, 
        borderWidth: 1, 
        borderColor: Colors.border, 
        gap: 8, 
        minHeight: 52 
    },
    inputError: { borderColor: Colors.danger },
    prefix: { 
        fontFamily: FontFamily.headingMedium, 
        fontSize: FontSize.h4, 
        color: Colors.textSecondary 
    },
    numInput: { 
        flex: 1, 
        fontFamily: FontFamily.heading, 
        fontSize: FontSize.h3, 
        color: Colors.textPrimary,
        padding: 0,
        height: 40,
    },
    errorText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.danger },
    
    savingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    periodSelector: { 
        flexDirection: 'row', 
        backgroundColor: Colors.surface, 
        borderRadius: 12, 
        padding: 4, 
        gap: 2,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 52,
        alignItems: 'center'
    },
    periodBtn: { 
        paddingHorizontal: 12, 
        height: '100%',
        justifyContent: 'center',
        borderRadius: 8,
    },
    periodBtnActive: { backgroundColor: Colors.primaryBg },
    periodBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.textSecondary },
    periodBtnTextActive: { color: Colors.primary, fontFamily: FontFamily.bodyBold },
    
    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        alignItems: 'center', 
        justifyContent: 'center' 
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
        backgroundColor: Colors.infoBg, 
        borderRadius: 16, 
        padding: 16, 
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.info,
    },
    simHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    simTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: Colors.info },
    simText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textPrimary, lineHeight: 22 },
    simHighlight: { fontFamily: FontFamily.bodyBold, color: Colors.info },
    
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    switchTextContainer: { flex: 1, marginRight: 16 },
    switchLabel: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.body,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    switchDescription: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.caption,
        color: Colors.textSecondary,
    },
    
    footer: { 
        padding: 20, 
        paddingBottom: 32, 
        borderTopWidth: 1, 
        borderTopColor: Colors.border, 
        backgroundColor: Colors.surface 
    },
});

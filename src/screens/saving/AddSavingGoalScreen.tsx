// Add Saving Goal Screen — form dengan real-time auto-calculation
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { GOAL_COLORS } from '../../constants/categories';
import { useSavingStore } from '../../store/useSavingStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatEstimatedDate } from '../../utils/date';
import { simulateSaving } from '../../utils/calculator';
import { validateGoalName, validateTargetAmount, validateSavingPerPeriod } from '../../utils/validation';
import type { PeriodType } from '../../types/saving';

const EMOJIS = ['💻', '🌴', '🎮', '🏠', '🚗', '📱', '✈️', '👜', '🎓', '💍', '🎯', '⭐'];

export function AddSavingGoalScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
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
    const simulation = React.useMemo(() => {
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
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} accessible={true} accessibilityRole="button" accessibilityLabel="Tutup form">
                        <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} allowFontScaling={true} accessibilityRole="header">Buat Target Tabungan</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {/* Emoji Picker */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Pilih Emoji</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.emojiRow}>
                                {EMOJIS.map((e) => (
                                    <TouchableOpacity
                                        key={e}
                                        style={[styles.emojiBtn, emoji === e && styles.emojiBtnSelected]}
                                        onPress={() => setEmoji(e)}
                                        accessible={true}
                                        accessibilityRole="radio"
                                        accessibilityLabel={e}
                                        accessibilityState={{ selected: emoji === e }}
                                    >
                                        <Text style={styles.emojiText}>{e}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Foto Impian (Opsional)</Text>
                        <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickImage}>
                            {photoUri ? (
                                <View style={styles.photoContainer}>
                                    <View style={styles.photoPreview} />
                                    <Text style={styles.photoText}>Foto Dipilih (Ketuk untuk ganti)</Text>
                                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} style={styles.checkIcon} />
                                </View>
                            ) : (
                                <View style={styles.photoContainerPlaceholder}>
                                    <MaterialCommunityIcons name="camera-plus" size={28} color={Colors.textDisabled} />
                                    <Text style={styles.photoTextPlaceholder}>Tambahkan Foto Barang Impian</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Input
                        label="Nama Barang / Tujuan"
                        value={name}
                        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined as any })); }}
                        placeholder="cth: MacBook Air M3"
                        leftIcon="tag"
                        error={errors.name}
                        required
                    />

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Harga Target (Rp) *</Text>
                        <View style={[styles.rupiahInput, errors.target ? styles.inputError : null]}>
                            <Text style={styles.prefix} allowFontScaling={true}>Rp</Text>
                            <TextInput
                                style={styles.numInput}
                                value={targetInput}
                                onChangeText={(v) => { setTargetInput(formatInputRupiah(v)); setErrors((e) => ({ ...e, target: undefined as any })); }}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textDisabled}
                                accessible={true}
                                accessibilityLabel="Harga target dalam Rupiah"
                                allowFontScaling={true}
                            />
                        </View>
                        {errors.target && <Text style={styles.errorText} allowFontScaling={true} accessibilityRole="alert">{errors.target}</Text>}
                    </View>

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Modal Awal (opsional)</Text>
                        <View style={styles.rupiahInput}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput style={styles.numInput} value={currentInput} onChangeText={(v) => setCurrentInput(formatInputRupiah(v))} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textDisabled} accessible={true} accessibilityLabel="Uang yang sudah kamu miliki" allowFontScaling={true} />
                        </View>
                    </View>

                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Nominal Tabungan per Periode *</Text>
                        <View style={styles.savingRow}>
                            <View style={[styles.rupiahInput, { flex: 1 }, errors.saving ? styles.inputError : null]}>
                                <Text style={styles.prefix}>Rp</Text>
                                <TextInput style={styles.numInput} value={savingInput} onChangeText={(v) => { setSavingInput(formatInputRupiah(v)); setErrors((e) => ({ ...e, saving: undefined as any })); }} keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textDisabled} accessible={true} accessibilityLabel="Nominal tabungan per periode" allowFontScaling={true} />
                            </View>
                            <View style={styles.periodSelector} accessibilityRole="tablist">
                                {periodOptions.map((p) => (
                                    <TouchableOpacity key={p.id} style={[styles.periodBtn, periodType === p.id && styles.periodBtnActive]} onPress={() => setPeriodType(p.id)} accessible={true} accessibilityRole="tab" accessibilityLabel={`Per ${p.label}`} accessibilityState={{ selected: periodType === p.id }}>
                                        <Text style={[styles.periodBtnText, periodType === p.id && styles.periodBtnTextActive]} allowFontScaling={true}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        {errors.saving && <Text style={styles.errorText} allowFontScaling={true} accessibilityRole="alert">{errors.saving}</Text>}
                    </View>

                    {/* Color Picker */}
                    <View style={styles.fieldSection}>
                        <Text style={styles.fieldLabel} allowFontScaling={true}>Warna Tema</Text>
                        <View style={styles.colorRow}>
                            {GOAL_COLORS.map((c) => (
                                <TouchableOpacity key={c} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnSelected]} onPress={() => setColor(c as any)} accessible={true} accessibilityRole="radio" accessibilityLabel={`Pilih warna ${c}`} accessibilityState={{ selected: color === c }}>
                                    {color === c && <MaterialCommunityIcons name="check" size={16} color={Colors.textInverse} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Auto-kalkulasi */}
                    {simulation && (
                        <View style={styles.simulationCard} accessible={true} accessibilityLiveRegion="polite" accessibilityLabel={`Dengan menabung ${formatRupiah(savingPerPeriod)} per ${periodType === 'daily' ? 'hari' : periodType === 'weekly' ? 'minggu' : 'bulan'}, kamu bisa membeli ${name || 'barang ini'} dalam ${simulation.days} hari yaitu sekitar tanggal ${formatEstimatedDate(simulation.estimatedDate)}`}>
                            <Text style={styles.simTitle} allowFontScaling={true}>🎯 Estimasi Tabungan</Text>
                            <Text style={styles.simText} allowFontScaling={true}>
                                Dengan menabung {formatRupiah(savingPerPeriod)} per {periodType === 'daily' ? 'hari' : periodType === 'weekly' ? 'minggu' : 'bulan'},{'\n'}
                                kamu bisa membeli <Text style={{ fontFamily: FontFamily.bodyBold, color: Colors.primaryDark }}>{name || 'barang ini'}</Text> dalam{' '}
                                <Text style={{ fontFamily: FontFamily.bodyBold, color: Colors.primaryDark }}>{simulation.days} hari</Text>
                                {'\n'}yaitu sekitar <Text style={{ fontFamily: FontFamily.bodyBold, color: Colors.primary }}>{formatEstimatedDate(simulation.estimatedDate)}</Text> 🎯
                            </Text>
                        </View>
                    )}

                    {/* Reminder Toggle */}
                    <TouchableOpacity style={styles.reminderRow} onPress={() => setReminderEnabled((v) => !v)} accessible={true} accessibilityRole="switch" accessibilityLabel="Aktifkan pengingat tabungan" accessibilityState={{ checked: reminderEnabled }}>
                        <View style={styles.reminderLeft}>
                            <MaterialCommunityIcons name="bell" size={20} color={Colors.secondary} accessibilityElementsHidden={true} />
                            <View>
                                <Text style={styles.reminderTitle} allowFontScaling={true}>Pengingat Tabungan</Text>
                                <Text style={styles.reminderSub} allowFontScaling={true}>Notifikasi rutin sesuai periode</Text>
                            </View>
                        </View>
                        <View style={[styles.toggle, reminderEnabled && styles.toggleActive]}>
                            <View style={[styles.toggleThumb, reminderEnabled && styles.toggleThumbActive]} />
                        </View>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.footer}>
                    <Button label="Buat Target 🎯" onPress={handleSave} variant="primary" size="lg" loading={isLoading} fullWidth accessibilityHint="Ketuk dua kali untuk membuat target tabungan" />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.surface },
    flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
    closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    content: { padding: 20, gap: 18, paddingBottom: 40 },
    fieldSection: { gap: 8 },
    fieldLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    emojiRow: { flexDirection: 'row', gap: 8 },
    emojiBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: 'transparent' },
    emojiBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    emojiText: { fontSize: 24 },
    photoUploadBtn: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', overflow: 'hidden' },
    photoContainerPlaceholder: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
    photoTextPlaceholder: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    photoContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.successLight, gap: 12 },
    photoPreview: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.success },
    photoText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: Colors.textPrimary, flex: 1 },
    checkIcon: { marginLeft: 'auto' },
    rupiahInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.border, gap: 8, minHeight: 52 },
    inputError: { borderColor: Colors.danger },
    prefix: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textSecondary },
    numInput: { flex: 1, fontFamily: FontFamily.bodyBold, fontSize: FontSize.h4, color: Colors.textPrimary },
    errorText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.danger },
    savingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    periodSelector: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: 10, padding: 3, gap: 2 },
    periodBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, minHeight: 36, justifyContent: 'center' },
    periodBtnActive: { backgroundColor: Colors.primary },
    periodBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: Colors.textSecondary },
    periodBtnTextActive: { color: Colors.textInverse, fontFamily: FontFamily.bodyBold },
    colorRow: { flexDirection: 'row', gap: 10 },
    colorBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorBtnSelected: { borderColor: Colors.textPrimary },
    simulationCard: { backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 16, gap: 8 },
    simTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.primaryDark },
    simText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textPrimary, lineHeight: 24 },
    reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceElevated, borderRadius: 14, padding: 16 },
    reminderLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
    reminderTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textPrimary },
    reminderSub: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3 },
    toggleActive: { backgroundColor: Colors.primary },
    toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.textInverse },
    toggleThumbActive: { alignSelf: 'flex-end' },
    footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
});

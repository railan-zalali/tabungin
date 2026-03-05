// Saving Detail Screen — detail goal + simulator + history log
import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { ProgressBar } from '../../components/saving/ProgressBar';
import { SavingSimulator } from '../../components/saving/SavingSimulator';
import { Button } from '../../components/common/Button';
import { formatRupiah, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';

export function SavingDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const goalId = route.params?.goalId as string;

    const { currentGoal, currentLogs, justCompletedGoalId, loadGoalById, loadLogs, addSavingLog, clearJustCompleted } = useSavingStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addNote, setAddNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        loadGoalById(goalId);
        loadLogs(goalId);
    }, [goalId]);

    useEffect(() => {
        if (justCompletedGoalId === goalId) {
            setShowConfetti(true);
            clearJustCompleted();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setShowConfetti(false), 5000);
        }
    }, [justCompletedGoalId]);

    const handleAddSaving = async () => {
        const amount = parseRupiah(addAmount);
        if (amount <= 0) {
            Alert.alert('Nominal tidak valid', 'Masukkan nominal yang lebih dari Rp 0');
            return;
        }
        setIsAdding(true);
        try {
            await addSavingLog({
                goal_id: goalId,
                amount,
                note: addNote.trim() || null,
                date: Date.now(),
            });
            setShowAddModal(false);
            setAddAmount('');
            setAddNote('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setIsAdding(false);
        }
    };

    if (!currentGoal) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text allowFontScaling={true} style={{ padding: 20, color: Colors.textSecondary }}>Memuat...</Text>
            </SafeAreaView>
        );
    }

    const progress = calculateProgress(currentGoal.current_amount, currentGoal.target_amount);
    const remaining = Math.max(currentGoal.target_amount - currentGoal.current_amount, 0);
    const isCompleted = currentGoal.is_completed || progress >= 100;

    return (
        <SafeAreaView style={styles.safe}>
            {/* Konfeti celebration */}
            {showConfetti && (
                <View style={styles.confettiOverlay} accessible={true} accessibilityLiveRegion="assertive" accessibilityLabel="Selamat! Target tabungan sudah tercapai!">
                    <Text style={styles.confettiText}>🎉</Text>
                    <Text style={styles.confettiTitle} allowFontScaling={true}>Selamat!</Text>
                    <Text style={styles.confettiSub} allowFontScaling={true}>
                        Target {currentGoal.name} sudah tercapai! 🎊
                    </Text>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessible={true} accessibilityRole="button" accessibilityLabel="Kembali">
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} allowFontScaling={true} accessibilityRole="header" numberOfLines={1}>{currentGoal.name}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Hero section */}
                <View style={[styles.heroSection, { backgroundColor: `${currentGoal.color}15` }]}>
                    <Text style={styles.heroEmoji} accessibilityElementsHidden={true}>{currentGoal.emoji}</Text>
                    <Text style={styles.heroName} allowFontScaling={true} accessibilityRole="header">{currentGoal.name}</Text>
                    <Text style={[styles.heroProgress, { color: currentGoal.color }]} allowFontScaling={true} accessibilityLiveRegion="polite" accessibilityLabel={`Progress ${progress.toFixed(0)} persen`}>
                        {progress.toFixed(1)}%
                    </Text>
                    <ProgressBar progress={progress} color={currentGoal.color} height={12} animationDelay={200} accessibilityLabel={`Progress tabungan ${currentGoal.name} ${progress.toFixed(0)} persen`} style={{ width: '80%' }} />
                    {isCompleted && (
                        <View style={styles.completedBanner} accessible={true} accessibilityLabel="Target sudah tercapai">
                            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} accessibilityElementsHidden={true} />
                            <Text style={styles.completedText} allowFontScaling={true}>Sudah tercapai! 🎉</Text>
                        </View>
                    )}
                </View>

                {/* Info Grid */}
                <View style={[styles.infoGrid, Shadow.sm]}>
                    {[
                        { label: 'Target', value: formatRupiah(currentGoal.target_amount), icon: 'flag' },
                        { label: 'Terkumpul', value: formatRupiah(currentGoal.current_amount), icon: 'piggy-bank' },
                        { label: 'Sisa', value: formatRupiah(remaining), icon: 'timer-sand' },
                        { label: 'Nabung/Periode', value: formatRupiah(currentGoal.saving_per_period), icon: 'calendar-refresh' },
                    ].map((item) => (
                        <View key={item.label} style={styles.infoItem} accessible={true} accessibilityLabel={`${item.label}: ${item.value}`}>
                            <MaterialCommunityIcons name={item.icon as any} size={20} color={currentGoal.color} accessibilityElementsHidden={true} />
                            <Text style={styles.infoLabel} allowFontScaling={true}>{item.label}</Text>
                            <Text style={styles.infoValue} allowFontScaling={true}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Simulator */}
                {!isCompleted && (
                    <SavingSimulator
                        targetAmount={currentGoal.target_amount}
                        currentAmount={currentGoal.current_amount}
                        periodType={currentGoal.period_type}
                        initialSavingAmount={currentGoal.saving_per_period}
                    />
                )}

                {/* Log Tabungan */}
                {currentLogs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle} allowFontScaling={true} accessibilityRole="header">Riwayat Tabungan</Text>
                        <View style={[styles.logList, Shadow.sm]}>
                            {currentLogs.map((log, idx) => (
                                <React.Fragment key={log.id}>
                                    <View style={styles.logItem} accessible={true} accessibilityLabel={`Tanggal ${formatDateShort(log.date)}, tambah ${formatRupiah(log.amount)}${log.note ? ', ' + log.note : ''}`}>
                                        <View style={styles.logIcon} accessibilityElementsHidden={true}>
                                            <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.primary} />
                                        </View>
                                        <View style={styles.logInfo}>
                                            <Text style={styles.logAmount} allowFontScaling={true}>+{formatRupiah(log.amount)}</Text>
                                            {log.note && <Text style={styles.logNote} allowFontScaling={true}>{log.note}</Text>}
                                        </View>
                                        <Text style={styles.logDate} allowFontScaling={true}>{formatDateShort(log.date)}</Text>
                                    </View>
                                    {idx < currentLogs.length - 1 && <View style={styles.logDivider} />}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Tombol Tambah Tabungan */}
            {!isCompleted && (
                <View style={styles.footer}>
                    <Button
                        label="+ Tambah Tabungan"
                        onPress={() => setShowAddModal(true)}
                        variant="primary"
                        size="lg"
                        fullWidth
                        accessibilityHint="Ketuk dua kali untuk menambah nominal tabungan"
                    />
                </View>
            )}

            {/* Modal Tambah Tabungan */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
                <SafeAreaView style={styles.modalSafe}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle} allowFontScaling={true} accessibilityRole="header">Tambah Tabungan</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)} accessible={true} accessibilityRole="button" accessibilityLabel="Tutup">
                            <MaterialCommunityIcons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalGoalName} allowFontScaling={true}>🎯 {currentGoal.name}</Text>
                        <View style={styles.rupiahInput}>
                            <Text style={styles.prefix} allowFontScaling={true}>Rp</Text>
                            <TextInput
                                style={styles.modalAmountInput}
                                value={addAmount}
                                onChangeText={(v) => setAddAmount(formatInputRupiah(v))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textDisabled}
                                autoFocus
                                accessible={true}
                                accessibilityLabel="Nominal tabungan yang ingin ditambahkan"
                                allowFontScaling={true}
                            />
                        </View>
                        <TextInput
                            style={styles.modalNoteInput}
                            value={addNote}
                            onChangeText={setAddNote}
                            placeholder="Catatan (opsional)"
                            placeholderTextColor={Colors.textDisabled}
                            accessible={true}
                            accessibilityLabel="Catatan tabungan"
                            allowFontScaling={true}
                        />
                        <Button label="Simpan Tabungan" onPress={handleAddSaving} variant="primary" size="lg" loading={isAdding} fullWidth />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
    content: { padding: 16, gap: 16, paddingBottom: 100 },
    heroSection: { borderRadius: 20, padding: 28, alignItems: 'center', gap: 12 },
    heroEmoji: { fontSize: 56 },
    heroName: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary, textAlign: 'center' },
    heroProgress: { fontFamily: FontFamily.heading, fontSize: 42 },
    completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.successLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    completedText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.success },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' },
    infoItem: { width: '50%', padding: 16, gap: 6, borderBottomWidth: 1, borderRightWidth: 1, borderColor: Colors.divider, alignItems: 'flex-start' },
    infoLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    infoValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.textPrimary },
    section: { gap: 10 },
    sectionTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    logList: { backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden' },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    logIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    logInfo: { flex: 1 },
    logAmount: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.primary },
    logNote: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    logDate: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    logDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 62 },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
    confettiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16, 185, 129, 0.9)', alignItems: 'center', justifyContent: 'center', zIndex: 100, gap: 12 },
    confettiText: { fontSize: 80 },
    confettiTitle: { fontFamily: FontFamily.heading, fontSize: 36, color: Colors.textInverse },
    confettiSub: { fontFamily: FontFamily.body, fontSize: FontSize.h4, color: Colors.textInverse, textAlign: 'center', paddingHorizontal: 40 },
    modalSafe: { flex: 1, backgroundColor: Colors.surface },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalTitle: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h4, color: Colors.textPrimary },
    modalContent: { padding: 20, gap: 16 },
    modalGoalName: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textSecondary },
    rupiahInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.primary, gap: 8, minHeight: 60 },
    prefix: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textSecondary },
    modalAmountInput: { flex: 1, fontFamily: FontFamily.heading, fontSize: 30, color: Colors.textPrimary },
    modalNoteInput: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 14, fontFamily: FontFamily.body, fontSize: FontSize.body, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, minHeight: 52 },
});

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Shadow } from '../../constants/theme';
import { useSavingStore } from '../../store/useSavingStore';
import { ProgressBar } from '../../components/saving/ProgressBar';
import { SavingSimulator } from '../../components/saving/SavingSimulator';
import { Button } from '../../components/common/Button';
import { formatRupiah, formatInputRupiah, parseRupiah, formatCurrency } from '../../utils/currency';
import { formatDateShort } from '../../utils/date';
import { calculateProgress } from '../../utils/calculator';

export function SavingDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
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
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Text style={{ padding: 20, color: Colors.textSecondary }}>Memuat...</Text>
            </View>
        );
    }

    const progress = calculateProgress(currentGoal.current_amount, currentGoal.target_amount);
    const remaining = Math.max(currentGoal.target_amount - currentGoal.current_amount, 0);
    const isCompleted = currentGoal.is_completed || progress >= 100;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            
            {/* Konfeti celebration */}
            {showConfetti && (
                <View style={styles.confettiOverlay}>
                    <Text style={styles.confettiText}>🎉</Text>
                    <Text style={styles.confettiTitle}>Selamat!</Text>
                    <Text style={styles.confettiSub}>
                        Target {currentGoal.name} sudah tercapai! 🎊
                    </Text>
                </View>
            )}

            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{currentGoal.name}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero section */}
                <View style={[styles.heroSection, { backgroundColor: `${currentGoal.color}15` }]}>
                    <Text style={styles.heroEmoji}>{currentGoal.emoji}</Text>
                    <Text style={styles.heroName}>{currentGoal.name}</Text>
                    <Text style={[styles.heroProgress, { color: currentGoal.color }]}>
                        {progress.toFixed(1)}%
                    </Text>
                    <ProgressBar 
                        progress={progress} 
                        color={currentGoal.color} 
                        height={12} 
                        animationDelay={200} 
                        style={{ width: '80%' }} 
                    />
                    {isCompleted && (
                        <View style={styles.completedBanner}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
                            <Text style={styles.completedText}>Sudah tercapai! 🎉</Text>
                        </View>
                    )}
                </View>

                {/* Info Grid */}
                <View style={[styles.infoGrid, Shadow.sm]}>
                    {[
                        { label: 'Target', value: formatCurrency(currentGoal.target_amount), icon: 'flag-variant' },
                        { label: 'Terkumpul', value: formatCurrency(currentGoal.current_amount), icon: 'piggy-bank' },
                        { label: 'Sisa', value: formatCurrency(remaining), icon: 'timer-sand' },
                        { label: 'Nabung/Periode', value: formatCurrency(currentGoal.saving_per_period), icon: 'calendar-refresh' },
                    ].map((item, idx) => (
                        <View key={item.label} style={[styles.infoItem, idx % 2 === 0 ? styles.borderRight : null, idx < 2 ? styles.borderBottom : null]}>
                            <View style={[styles.iconBox, { backgroundColor: `${currentGoal.color}20` }]}>
                                <MaterialCommunityIcons name={item.icon as any} size={20} color={currentGoal.color} />
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>{item.label}</Text>
                                <Text style={styles.infoValue}>{item.value}</Text>
                            </View>
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
                        <Text style={styles.sectionTitle}>Riwayat Tabungan</Text>
                        <View style={[styles.logList, Shadow.sm]}>
                            {currentLogs.map((log, idx) => (
                                <React.Fragment key={log.id}>
                                    <View style={styles.logItem}>
                                        <View style={styles.logIcon}>
                                            <MaterialCommunityIcons name="plus" size={20} color={Colors.primary} />
                                        </View>
                                        <View style={styles.logInfo}>
                                            <Text style={styles.logAmount}>+{formatCurrency(log.amount)}</Text>
                                            {log.note && <Text style={styles.logNote}>{log.note}</Text>}
                                        </View>
                                        <Text style={styles.logDate}>{formatDateShort(log.date)}</Text>
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
                    />
                </View>
            )}

            {/* Modal Tambah Tabungan */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalSafe}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Tambah Tabungan</Text>
                        <TouchableOpacity 
                            onPress={() => setShowAddModal(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalGoalName}>🎯 {currentGoal.name}</Text>
                        
                        <View style={styles.rupiahInput}>
                            <Text style={styles.prefix}>Rp</Text>
                            <TextInput
                                style={styles.modalAmountInput}
                                value={addAmount}
                                onChangeText={(v) => setAddAmount(formatInputRupiah(v))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={Colors.textDisabled}
                                autoFocus
                            />
                        </View>
                        
                        <TextInput
                            style={styles.modalNoteInput}
                            value={addNote}
                            onChangeText={setAddNote}
                            placeholder="Catatan (opsional)"
                            placeholderTextColor={Colors.textDisabled}
                        />
                        
                        <Button 
                            label="Simpan Tabungan" 
                            onPress={handleAddSaving} 
                            variant="primary" 
                            size="lg" 
                            loading={isAdding} 
                            fullWidth 
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        backgroundColor: Colors.background 
    },
    backBtn: { padding: 4 },
    headerTitle: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
    
    content: { padding: 20, gap: 24, paddingBottom: 100 },
    
    heroSection: { 
        borderRadius: 24, 
        padding: 32, 
        alignItems: 'center', 
        gap: 12 
    },
    heroEmoji: { fontSize: 64 },
    heroName: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: Colors.textPrimary, textAlign: 'center' },
    heroProgress: { fontFamily: FontFamily.heading, fontSize: 48 },
    
    completedBanner: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        backgroundColor: Colors.successBg, 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 20,
        marginTop: 8
    },
    completedText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.success },
    
    infoGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        backgroundColor: Colors.surface, 
        borderRadius: 20, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    infoItem: { 
        width: '50%', 
        padding: 20, 
        gap: 12, 
        alignItems: 'flex-start' 
    },
    borderRight: { borderRightWidth: 1, borderRightColor: Colors.divider },
    borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
    
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoLabel: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary, marginBottom: 2 },
    infoValue: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: Colors.textPrimary },
    
    section: { gap: 12 },
    sectionTitle: { ...Typography.h4, color: Colors.textPrimary },
    
    logList: { 
        backgroundColor: Colors.surface, 
        borderRadius: 20, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
    logIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: Colors.primaryBg, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    logInfo: { flex: 1 },
    logAmount: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.body, color: Colors.primary },
    logNote: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 2 },
    logDate: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary },
    logDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 72 },
    
    footer: { 
        padding: 20, 
        paddingBottom: 32, 
        backgroundColor: Colors.surface, 
        borderTopWidth: 1, 
        borderTopColor: Colors.border 
    },
    
    confettiOverlay: { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(16, 185, 129, 0.95)', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 100, 
        gap: 12 
    },
    confettiText: { fontSize: 80 },
    confettiTitle: { fontFamily: FontFamily.heading, fontSize: 36, color: '#FFF' },
    confettiSub: { fontFamily: FontFamily.body, fontSize: FontSize.h3, color: '#FFF', textAlign: 'center', paddingHorizontal: 40 },
    
    modalSafe: { flex: 1, backgroundColor: Colors.surface },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: Colors.border 
    },
    modalTitle: { ...Typography.h3, color: Colors.textPrimary },
    modalContent: { padding: 20, gap: 20 },
    modalGoalName: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.body, color: Colors.textSecondary },
    
    rupiahInput: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Colors.surface, 
        borderRadius: 16, 
        paddingHorizontal: 20, 
        paddingVertical: 16, 
        borderWidth: 1, 
        borderColor: Colors.primary, 
        gap: 8 
    },
    prefix: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: Colors.textSecondary },
    modalAmountInput: { flex: 1, fontFamily: FontFamily.heading, fontSize: 32, color: Colors.textPrimary, padding: 0, height: 40 },
    
    modalNoteInput: { 
        backgroundColor: Colors.surface, 
        borderRadius: 16, 
        padding: 16, 
        fontFamily: FontFamily.body, 
        fontSize: FontSize.body, 
        color: Colors.textPrimary, 
        borderWidth: 1, 
        borderColor: Colors.border, 
        minHeight: 52 
    },
});

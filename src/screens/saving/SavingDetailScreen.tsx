import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { calculateProgress } from '../../utils/calculator';
import { formatDateShort } from '../../utils/date';
import { formatCurrency, formatInputRupiah, parseRupiah } from '../../utils/currency';
import { getGoalComputedMeta, getSharingActivityDescription, getSharingActivityLabel } from '../../utils/goalSharing';
import { fetchWalletMemberRole } from '../../database/walletQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useSavingStore } from '../../store/useSavingStore';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useResponsiveMetrics } from '../../utils/responsive';
import { ProgressBar } from '../../components/saving/ProgressBar';
import { SavingSimulator } from '../../components/saving/SavingSimulator';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { ContextBadge } from '../../components/common/ContextBadge';
import { FormSection } from '../../components/common/FormSection';
import { PrimaryActionBar } from '../../components/common/PrimaryActionBar';
import { ScreenShell } from '../../components/common/ScreenShell';
import { StatePanel } from '../../components/common/StatePanel';

const permissionLabel = (value: string) => value === 'admin' ? 'Admin' : value === 'read_only' ? 'Read only' : 'Bisa edit';

export function SavingDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<any>();
    const goalId = route.params?.goalId as string;
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const wallets = useWalletStore((s) => s.wallets);
    const activeProfileId = useProfileStore((s) => s.activeProfileId);
    const currentUserId = useAuthStore((s) => s.user?.id);
    const currentUserEmail = useAuthStore((s) => s.user?.email?.toLowerCase() || null);
    const { currentGoal, currentLogs, sharingMembers, sharingActivity, justCompletedGoalId, loadGoalById, loadLogs, loadSharingDetails, addSavingLog, clearJustCompleted, setGoalPermission, revokeGoalSharing } = useSavingStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addNote, setAddNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [walletRole, setWalletRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
    const [isUpdatingPermission, setIsUpdatingPermission] = useState<string | null>(null);

    useEffect(() => { loadGoalById(goalId); loadLogs(goalId); loadSharingDetails(goalId); }, [goalId, loadGoalById, loadLogs, loadSharingDetails]);
    useEffect(() => {
        if (justCompletedGoalId !== goalId) return;
        setShowConfetti(true);
        clearJustCompleted();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const timeout = setTimeout(() => setShowConfetti(false), 5000);
        return () => clearTimeout(timeout);
    }, [clearJustCompleted, goalId, justCompletedGoalId]);
    useEffect(() => {
        let active = true;
        const run = async () => {
            if (!currentGoal?.wallet_id || !currentUserEmail) return setWalletRole(null);
            const role = await fetchWalletMemberRole(currentGoal.wallet_id, currentUserEmail);
            if (active) setWalletRole(role);
        };
        run().catch(() => active && setWalletRole(null));
        return () => { active = false; };
    }, [currentGoal?.wallet_id, currentUserEmail]);

    if (!currentGoal) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader title="Detail Target" subtitle="Memuat detail target dan aktivitas." showBack onBackPress={() => navigation.goBack()} />
                <View style={[styles.center, { paddingHorizontal: metrics.horizontalPadding }]}>
                    <StatePanel loading title="Memuat target" description="Data target sedang disiapkan." />
                </View>
            </ScreenShell>
        );
    }

    const progress = calculateProgress(currentGoal.current_amount, currentGoal.target_amount);
    const remaining = Math.max(currentGoal.target_amount - currentGoal.current_amount, 0);
    const isCompleted = currentGoal.is_completed || progress >= 100;
    const wallet = wallets.find((item) => item.id === currentGoal.wallet_id);
    const goalMeta = getGoalComputedMeta(currentGoal, wallet, activeProfileId, sharingMembers, currentUserId, walletRole, currentUserEmail);
    const ownSharingMember = currentUserEmail ? sharingMembers.find((m) => m.user_email.toLowerCase() === currentUserEmail) : null;

    const handleEdit = () => {
        if (!goalMeta.canEdit) return Alert.alert('Akses terbatas', 'Target ini hanya bisa kamu lihat. Minta akses edit jika perlu mengubah detail target.');
        navigation.navigate('AddSavingGoal', { editId: goalId });
    };
    const handleAddSaving = async () => {
        if (!goalMeta.canContribute) return Alert.alert('Akses terbatas', 'Target ini hanya bisa kamu lihat. Minta akses edit jika perlu menambah tabungan.');
        const amount = parseRupiah(addAmount);
        if (amount <= 0) return Alert.alert('Nominal tidak valid', 'Masukkan nominal yang lebih dari Rp 0');
        setIsAdding(true);
        try {
            await addSavingLog({ goal_id: goalId, amount, note: addNote.trim() || null, date: Date.now() });
            setShowAddModal(false); setAddAmount(''); setAddNote('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally { setIsAdding(false); }
    };
    const handleChangePermission = async (email: string, permissionLevel: 'read_only' | 'read_write') => {
        if (!goalMeta.canManageSharing) return;
        setIsUpdatingPermission(email);
        try { await setGoalPermission(goalId, email, permissionLevel); } catch (error: any) { Alert.alert('Gagal', error?.message || 'Izin anggota belum berhasil diubah.'); } finally { setIsUpdatingPermission(null); }
    };
    const handleRevokeMember = async (email: string) => {
        if (!goalMeta.canManageSharing) return;
        Alert.alert('Cabut akses', `Akses ${email} akan dicabut dari target ini.`, [
            { text: 'Batal', style: 'cancel' },
            { text: 'Cabut', style: 'destructive', onPress: async () => {
                setIsUpdatingPermission(email);
                try { await revokeGoalSharing(goalId, email); } catch (error: any) { Alert.alert('Gagal', error?.message || 'Akses anggota belum berhasil dicabut.'); } finally { setIsUpdatingPermission(null); }
            } },
        ]);
    };

    const infoItems = [
        { label: 'Target', value: formatCurrency(currentGoal.target_amount), icon: 'flag-variant' },
        { label: 'Terkumpul', value: formatCurrency(currentGoal.current_amount), icon: 'piggy-bank' },
        { label: 'Sisa', value: formatCurrency(remaining), icon: 'timer-sand' },
        { label: 'Nabung/Periode', value: `${formatCurrency(currentGoal.saving_per_period)}/${currentGoal.period_type}`, icon: 'calendar-refresh' },
    ];

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader title={currentGoal.name} subtitle="Detail target, ownership, dan aktivitas kontribusi." showBack onBackPress={() => navigation.goBack()} rightAction={{ icon: 'pencil-outline', label: 'Edit target', onPress: handleEdit }} />
            {showConfetti ? <View style={styles.confetti}><Text style={styles.confettiEmoji}>🎉</Text><Text style={styles.confettiTitle}>Selamat!</Text><Text style={styles.confettiText}>Target {currentGoal.name} sudah tercapai.</Text></View> : null}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingHorizontal: metrics.horizontalPadding, paddingBottom: isCompleted ? 40 : metrics.bottomActionInset + 24 }]}>
                <LinearGradient colors={[currentGoal.color, `${currentGoal.color}CC`, currentGoal.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                    <View style={styles.badges}>
                        {wallet ? <ContextBadge icon={goalMeta.isSharedWalletGoal ? 'account-group-outline' : 'wallet-outline'} label={wallet.name} inverse /> : null}
                        <ContextBadge icon={goalMeta.isSharedGoal ? 'account-group-outline' : 'account-outline'} label={goalMeta.scopeLabel} inverse />
                        {sharingMembers.length > 0 ? <ContextBadge icon="shield-account-outline" label={`${sharingMembers.length} member`} inverse /> : null}
                    </View>
                    <Text style={styles.heroEmoji}>{currentGoal.emoji}</Text>
                    <Text style={styles.heroName}>{currentGoal.name}</Text>
                    <Text style={styles.heroProgress}>{progress.toFixed(1)}%</Text>
                    <ProgressBar progress={progress} color={colors.textInverse} height={12} animationDelay={120} style={{ width: '84%' }} />
                    <Text style={styles.heroDescription}>{goalMeta.scopeDescription}</Text>
                    {isCompleted ? <View style={styles.completed}><MaterialCommunityIcons name="check-circle" size={18} color={colors.success} /><Text style={styles.completedText}>Sudah tercapai</Text></View> : null}
                </LinearGradient>

                <FormSection title="Ringkasan target" subtitle="Empat angka utama untuk membaca progres sebelum mengambil aksi berikutnya.">
                    <View style={styles.stack}>
                        {infoItems.map((item) => (
                            <View key={item.label} style={styles.infoItem}>
                                <View style={[styles.infoIcon, { backgroundColor: `${currentGoal.color}18` }]}><MaterialCommunityIcons name={item.icon as any} size={18} color={currentGoal.color} /></View>
                                <View style={styles.flex1}><Text style={styles.label}>{item.label}</Text><Text style={styles.value}>{item.value}</Text></View>
                            </View>
                        ))}
                    </View>
                </FormSection>

                <FormSection title="Konteks ownership" subtitle="Menjelaskan scope target, peranmu, dan level akses yang aktif saat ini.">
                    <View style={styles.row}><View style={styles.context}><Text style={styles.label}>Scope</Text><Text style={styles.value}>{goalMeta.scopeLabel}</Text></View><View style={styles.context}><Text style={styles.label}>Wallet</Text><Text style={styles.value}>{wallet?.name || 'Tanpa dompet khusus'}</Text></View></View>
                    <View style={styles.row}><View style={styles.context}><Text style={styles.label}>Peran kamu</Text><Text style={styles.value}>{permissionLabel(goalMeta.currentUserPermission)}</Text></View><View style={styles.context}><Text style={styles.label}>Akses langsung</Text><Text style={styles.value}>{ownSharingMember ? 'Ya' : 'Turunan wallet / owner'}</Text></View></View>
                    <View style={styles.badgesLight}>
                        <ContextBadge icon="pencil-outline" label={goalMeta.canEdit ? 'Bisa edit target' : 'Read only'} tone={goalMeta.canEdit ? 'success' : 'warning'} />
                        <ContextBadge icon="cash-plus" label={goalMeta.canContribute ? 'Bisa tambah tabungan' : 'Kontribusi terkunci'} tone={goalMeta.canContribute ? 'primary' : 'warning'} />
                        <ContextBadge icon="shield-account-outline" label={goalMeta.canManageSharing ? 'Bisa kelola sharing' : 'Sharing terkunci'} tone={goalMeta.canManageSharing ? 'info' : 'neutral'} />
                    </View>
                </FormSection>

                {!isCompleted ? <SavingSimulator targetAmount={currentGoal.target_amount} currentAmount={currentGoal.current_amount} periodType={currentGoal.period_type} initialSavingAmount={currentGoal.saving_per_period} /> : null}

                {goalMeta.isSharedGoal || sharingMembers.length > 0 || sharingActivity.length > 0 ? (
                    <FormSection title="Akses dan aktivitas shared" subtitle="Lihat siapa yang punya akses dan perubahan penting yang tercatat di target ini.">
                        {sharingMembers.length > 0 ? (
                            <View style={styles.stack}>
                                {sharingMembers.map((member) => (
                                    <View key={member.user_email} style={styles.member}>
                                        <View style={styles.memberIcon}><MaterialCommunityIcons name="account-outline" size={18} color={colors.info} /></View>
                                        <View style={styles.flex1}>
                                            <Text style={styles.memberTitle}>{member.user_email}</Text>
                                            <Text style={styles.memberMeta}>{permissionLabel(member.permission_level)} · dibagikan {formatDateShort(member.shared_at)}</Text>
                                        </View>
                                        {goalMeta.canManageSharing && member.user_email.toLowerCase() !== currentUserEmail ? (
                                            <View style={styles.memberActions}>
                                                <TouchableOpacity style={[styles.permission, member.permission_level === 'read_only' ? styles.permissionActive : null]} disabled={isUpdatingPermission === member.user_email} onPress={() => handleChangePermission(member.user_email, 'read_only')}><Text style={[styles.permissionText, member.permission_level === 'read_only' ? styles.permissionTextActive : null]}>Read</Text></TouchableOpacity>
                                                <TouchableOpacity style={[styles.permission, member.permission_level === 'read_write' ? styles.permissionActive : null]} disabled={isUpdatingPermission === member.user_email} onPress={() => handleChangePermission(member.user_email, 'read_write')}><Text style={[styles.permissionText, member.permission_level === 'read_write' ? styles.permissionTextActive : null]}>Edit</Text></TouchableOpacity>
                                                <TouchableOpacity style={styles.revoke} onPress={() => handleRevokeMember(member.user_email)}><MaterialCommunityIcons name="close" size={16} color={colors.danger} /></TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        ) : <StatePanel icon="account-off-outline" title="Belum ada anggota tambahan" description="Target ini belum memiliki anggota lain dengan akses langsung." />}
                        {sharingActivity.length > 0 ? (
                            <View style={styles.stack}>
                                {sharingActivity.map((activity, index) => (
                                    <View key={activity.id}>
                                        <View style={styles.activity}><View style={styles.dot} /><View style={styles.flex1}><Text style={styles.memberTitle}>{getSharingActivityLabel(activity)}</Text><Text style={styles.memberMeta}>{getSharingActivityDescription(activity)}</Text><Text style={styles.dateMeta}>{formatDateShort(activity.timestamp)}</Text></View></View>
                                        {index < sharingActivity.length - 1 ? <View style={styles.activityDivider} /> : null}
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </FormSection>
                ) : null}

                {currentLogs.length > 0 ? (
                    <FormSection title="Riwayat tabungan" subtitle={`${currentLogs.length} kontribusi tercatat di target ini.`}>
                        <View style={styles.stack}>
                            {currentLogs.map((log, index) => (
                                <View key={log.id}>
                                    <View style={styles.log}><View style={styles.infoIcon}><MaterialCommunityIcons name="plus" size={18} color={currentGoal.color} /></View><View style={styles.flex1}><Text style={[styles.value, { color: currentGoal.color }]}>+{formatCurrency(log.amount)}</Text>{log.note ? <Text style={styles.memberMeta}>{log.note}</Text> : null}</View><Text style={styles.dateMeta}>{formatDateShort(log.date)}</Text></View>
                                    {index < currentLogs.length - 1 ? <View style={styles.activityDivider} /> : null}
                                </View>
                            ))}
                        </View>
                    </FormSection>
                ) : null}
            </ScrollView>

            {!isCompleted ? <PrimaryActionBar primaryLabel={goalMeta.canContribute ? 'Tambah Tabungan' : 'Akses Read Only'} onPrimaryPress={() => goalMeta.canContribute ? setShowAddModal(true) : Alert.alert('Akses terbatas', 'Target ini hanya bisa kamu lihat. Hubungi admin atau editor wallet untuk menambah tabungan.')} offset={metrics.bottomActionInset - metrics.safeBottomSpacing} /> : null}

            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
                    <AppScreenHeader title="Tambah Tabungan" subtitle="Kontribusi baru akan langsung masuk ke progres target." showClose onClosePress={() => setShowAddModal(false)} />
                    <View style={styles.modalContent}>
                        <Text style={styles.memberMeta}>{currentGoal.emoji} {currentGoal.name}</Text>
                        <View style={[styles.amountWrap, { borderColor: currentGoal.color }]}><Text style={styles.amountPrefix}>Rp</Text><TextInput style={styles.amountInput} value={addAmount} onChangeText={(value) => setAddAmount(formatInputRupiah(value))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textDisabled} autoFocus /></View>
                        <TextInput style={styles.noteInput} value={addNote} onChangeText={setAddNote} placeholder="Catatan (opsional)" placeholderTextColor={colors.textSecondary} />
                        <Button label="Simpan Tabungan" onPress={handleAddSaving} loading={isAdding} fullWidth />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    center: { flex: 1, justifyContent: 'center' },
    flex1: { flex: 1 },
    content: { gap: 18, paddingTop: 20 },
    stack: { gap: 10 },
    row: { flexDirection: 'row', gap: 12 },
    badges: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badgesLight: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hero: { borderRadius: BorderRadius['5xl'], padding: 24, alignItems: 'center', gap: 12, overflow: 'hidden' },
    heroEmoji: { fontSize: 56 },
    heroName: { ...Typography.h3, color: colors.textInverse, textAlign: 'center' },
    heroProgress: { fontFamily: FontFamily.heading, fontSize: 40, color: colors.textInverse },
    heroDescription: { fontFamily: FontFamily.body, fontSize: FontSize.caption, lineHeight: 20, color: 'rgba(255,255,255,0.82)', textAlign: 'center', paddingHorizontal: 10 },
    completed: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
    completedText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.caption, color: colors.success },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius['2xl'], padding: 14 },
    infoIcon: { width: 38, height: 38, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBg },
    context: { flex: 1, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius['2xl'], padding: 14 },
    label: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
    value: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary, marginTop: 3 },
    member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius['2xl'], padding: 14 },
    memberIcon: { width: 38, height: 38, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoBg },
    memberTitle: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textPrimary },
    memberMeta: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary, marginTop: 2 },
    dateMeta: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textTertiary, marginTop: 4 },
    memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    permission: { minWidth: 52, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    permissionActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
    permissionText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: colors.textSecondary },
    permissionTextActive: { fontFamily: FontFamily.bodyBold, color: colors.primary },
    revoke: { width: 34, height: 34, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg },
    activity: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
    dot: { width: 12, height: 12, borderRadius: BorderRadius.full, backgroundColor: colors.primary, marginTop: 6 },
    activityDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 18 },
    log: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(16, 185, 129, 0.94)' },
    confettiEmoji: { fontSize: 72 },
    confettiTitle: { fontFamily: FontFamily.heading, fontSize: 34, color: colors.textInverse },
    confettiText: { fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textInverse, textAlign: 'center', paddingHorizontal: 32 },
    modalRoot: { flex: 1, backgroundColor: colors.surface },
    modalContent: { padding: 20, gap: 18 },
    amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: BorderRadius['3xl'], paddingHorizontal: 18, minHeight: 58, backgroundColor: colors.surfaceAlt },
    amountPrefix: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h3, color: colors.textSecondary },
    amountInput: { flex: 1, fontFamily: FontFamily.heading, fontSize: 30, color: colors.textPrimary, paddingVertical: 10 },
    noteInput: { minHeight: 56, borderRadius: BorderRadius['3xl'], borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 14, fontFamily: FontFamily.body, fontSize: FontSize.body, color: colors.textPrimary },
});

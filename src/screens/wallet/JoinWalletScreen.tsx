import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InfoRow } from '../../components/common/InfoRow';
import { InlineNotice } from '../../components/common/InlineNotice';
import { ScreenShell } from '../../components/common/ScreenShell';
import { StatStrip } from '../../components/common/StatStrip';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { supabase } from '../../lib/supabase';
import type { WalletStackParamList } from '../../types/navigation';
import {
    getAuthenticatedWalletEmail,
    isActiveWalletMemberForEmail,
    joinWalletByInvite,
} from '../../database/walletSharingService';
import { buildWalletInviteUrl, isValidWalletId } from '../../utils/walletInvite';
import { useResponsiveMetrics } from '../../utils/responsive';

type JoinWalletScreenRouteProp = RouteProp<WalletStackParamList, 'JoinWallet'>;

export function JoinWalletScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<JoinWalletScreenRouteProp>();
    const { walletId } = route.params;
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const { loadWallets } = useWalletStore();
    const canUseCloudCollaboration = useAuthStore((state) => state.canUseCloudCollaboration);
    const setPostAuthRedirect = useAuthStore((state) => state.setPostAuthRedirect);

    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [walletInfo, setWalletInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [alreadyMember, setAlreadyMember] = useState(false);

    useEffect(() => {
        if (!canUseCloudCollaboration) {
            setError('Shared wallet membutuhkan akun yang terhubung. Masuk dengan akun lalu buka ulang undangan ini.');
            setIsLoading(false);
            return;
        }

        if (!isValidWalletId(walletId)) {
            setError('ID dompet tidak valid.');
            setIsLoading(false);
            return;
        }

        fetchWalletInfo();
    }, [canUseCloudCollaboration, walletId]);

    const fetchWalletInfo = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const authEmail = await getAuthenticatedWalletEmail();

            if (authEmail) {
                const { data: members } = await supabase
                    .from('wallet_members')
                    .select('id, user_email, status')
                    .eq('wallet_id', walletId);

                if (isActiveWalletMemberForEmail(members ?? [], authEmail)) {
                    setAlreadyMember(true);
                }
            }

            const { data: walletPreview, error: rpcError } = await supabase.rpc('get_wallet_preview', {
                p_wallet_id: walletId,
            });

            if (!rpcError && walletPreview && walletPreview.length > 0) {
                setWalletInfo({
                    id: walletPreview[0].id,
                    name: walletPreview[0].name,
                    type: walletPreview[0].type,
                    color: walletPreview[0].color || colors.primary,
                    created_at: walletPreview[0].created_at,
                });
                return;
            }

            const { data: directWallet, error: directError } = await supabase
                .from('wallets')
                .select('id, name, type, color, created_at')
                .eq('id', walletId)
                .single();

            if (!directError && directWallet) {
                setWalletInfo({
                    id: directWallet.id,
                    name: directWallet.name,
                    type: directWallet.type,
                    color: directWallet.color || colors.primary,
                    created_at: directWallet.created_at,
                });
            } else {
                setWalletInfo({
                    name: 'Dompet bersama',
                    type: 'general',
                    color: colors.primary,
                    isLocked: true,
                });
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Gagal memuat informasi dompet.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenWallets = async () => {
        await loadWallets();
        navigation.replace('WalletList');
    };

    const handleJoin = async () => {
        if (!canUseCloudCollaboration) {
            Alert.alert('Perlu akun', 'Shared wallet hanya tersedia untuk akun yang terhubung ke cloud.');
            return;
        }

        const authEmail = await getAuthenticatedWalletEmail();

        if (!authEmail) {
            Alert.alert('Login diperlukan', 'Silakan login kembali.');
            return;
        }

        try {
            setIsJoining(true);
            const result = await joinWalletByInvite(walletId);
            await loadWallets();
            setAlreadyMember(true);

            Alert.alert(
                result.alreadyMember ? 'Sudah bergabung' : 'Sukses',
                result.alreadyMember ? 'Anda sudah menjadi anggota dompet ini.' : 'Berhasil bergabung ke dompet.',
                [{ text: 'OK', onPress: handleOpenWallets }],
            );
        } catch (e: any) {
            console.error(e);
            Alert.alert('Gagal', e.message || 'Terjadi kesalahan.');
        } finally {
            setIsJoining(false);
        }
    };

    if (isLoading) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader
                    title="Undangan dompet"
                    subtitle="Memeriksa detail undangan sebelum ditampilkan."
                    eyebrow="Wallet Invite"
                    showBack
                    onBackPress={() => navigation.goBack()}
                    variant="transparent"
                />
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Memeriksa undangan...</Text>
                </View>
            </ScreenShell>
        );
    }

    if (error) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <AppScreenHeader
                    title="Undangan dompet"
                    subtitle="Ada kendala saat membuka tautan undangan."
                    eyebrow="Wallet Invite"
                    showBack
                    onBackPress={() => navigation.goBack()}
                    variant="transparent"
                />
                <View style={styles.errorWrap}>
                    <EmptyState
                        icon="alert-circle-outline"
                        title="Undangan tidak bisa dibuka"
                        description={error}
                        actionLabel="Coba lagi"
                        onAction={fetchWalletInfo}
                    />
                    {!canUseCloudCollaboration ? (
                        <View style={styles.errorActions}>
                            <Button
                                label="Masuk dengan akun"
                                onPress={() => {
                                    setPostAuthRedirect({ screen: 'Wallet', params: { screen: 'JoinWallet', params: { walletId } } });
                                    navigation.navigate('Login');
                                }}
                                fullWidth
                            />
                            <Button
                                label="Buat akun"
                                onPress={() => {
                                    setPostAuthRedirect({ screen: 'Wallet', params: { screen: 'JoinWallet', params: { walletId } } });
                                    navigation.navigate('Register');
                                }}
                                variant="secondary"
                                fullWidth
                            />
                        </View>
                    ) : null}
                    <Button label="Kembali" onPress={() => navigation.goBack()} variant="outline" fullWidth />
                </View>
            </ScreenShell>
        );
    }

    const walletName = walletInfo?.name || 'Dompet bersama';
    const walletTypeLabel = walletInfo?.type ? String(walletInfo.type).replace('-', ' ') : 'General';

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Undangan dompet"
                subtitle="Tinjau konteks dompet bersama sebelum memutuskan untuk bergabung."
                eyebrow="Wallet Invite"
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingBottom: metrics.contentBottomInset,
                        gap: metrics.verticalGap,
                    },
                    metrics.widthClass !== 'compact' ? styles.contentWide : null,
                ]}
            >
                <HeroSummaryCard
                    eyebrow="Invite Preview"
                    title={walletName}
                    value={walletTypeLabel}
                    description="Bergabung ke dompet ini akan menyinkronkan saldo, transaksi, dan akses anggota sesuai izin yang berlaku."
                    icon="wallet-outline"
                    stats={[
                        { label: 'Keamanan', value: 'Terverifikasi', icon: 'shield-check-outline' },
                        { label: 'Tujuan', value: 'Kolaborasi', icon: 'account-group-outline' },
                        { label: 'Status', value: alreadyMember ? 'Sudah masuk' : 'Siap bergabung', icon: 'door' },
                    ]}
                />

                <InlineNotice
                    icon="account-group-outline"
                    title="Sebelum bergabung"
                    description="Dompet bersama cocok untuk keluarga, tim kecil, atau kebutuhan kolaboratif lain yang butuh saldo dan transaksi tetap sinkron."
                    tone="info"
                />

                <StatStrip
                    items={[
                        { label: 'Akses', value: 'Dompet bersama' },
                        { label: 'Tipe', value: walletTypeLabel },
                        { label: 'Status', value: alreadyMember ? 'Aktif' : 'Menunggu aksi' },
                    ]}
                    vertical={metrics.widthClass === 'compact'}
                />

                <FormSection
                    eyebrow="Sharing Context"
                    title="Apa yang akan ikut terlihat"
                    subtitle="Informasi ini membantu kamu memahami dampak bergabung ke dompet bersama sebelum menekan CTA utama."
                    variant="highlight"
                >
                    <InfoRow icon="cash-multiple" label="Saldo & transaksi" value="Tersinkron lintas anggota sesuai izin." tone="primary" />
                    <InfoRow icon="account-key-outline" label="Akses anggota" value="Hak akses mengikuti peran yang ditetapkan owner." />
                    <InfoRow icon="link-variant" label="Tautan undangan" value="Bisa dibuka ulang atau dibagikan kembali bila perlu." />
                </FormSection>

                <FormSection
                    eyebrow="Invite Link"
                    title="Tautan undangan"
                    subtitle="Simpan atau bagikan tautan ini bila kamu perlu membuka ulang invite dari perangkat lain."
                    density="compact"
                >
                    <View style={styles.inviteBox}>
                        <Text style={styles.inviteText}>{buildWalletInviteUrl(walletId)}</Text>
                    </View>
                </FormSection>

                {alreadyMember ? (
                    <FormSection
                        eyebrow="Ready"
                        title="Kamu sudah tergabung"
                        subtitle="Dompet ini sudah aktif di akunmu. Tinggal buka daftar dompet untuk mulai mengelolanya."
                    >
                        <Button label="Buka dompet" onPress={handleOpenWallets} fullWidth />
                    </FormSection>
                ) : (
                    <FormSection
                        eyebrow="Decision"
                        title="Lanjut bergabung?"
                        subtitle="Kalau konteks dan tautannya sudah sesuai, kamu bisa langsung masuk ke dompet bersama ini sekarang."
                    >
                        <Button label="Gabung sekarang" onPress={handleJoin} loading={isJoining} fullWidth />
                        <Button label="Batal" onPress={() => navigation.goBack()} variant="outline" fullWidth />
                    </FormSection>
                )}
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        loadingWrap: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 24,
        },
        loadingText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        errorWrap: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingBottom: 40,
            gap: 16,
        },
        errorActions: {
            gap: 12,
        },
        content: {
            gap: 18,
        },
        contentWide: {
            width: '100%',
            maxWidth: 920,
            alignSelf: 'center',
        },
        inviteBox: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['2xl'],
            padding: 16,
        },
        inviteText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.textPrimary,
        },
    });

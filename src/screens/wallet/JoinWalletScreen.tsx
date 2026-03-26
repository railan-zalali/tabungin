import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../store/useThemeStore';
import { useWalletStore } from '../../store/useWalletStore';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { supabase } from '../../lib/supabase';
import type { WalletStackParamList } from '../../types/navigation';
import {
  getAuthenticatedWalletEmail,
  joinWalletByInvite,
  normalizeWalletMemberEmail,
} from '../../database/walletSharingService';
import { buildWalletInviteUrl, isValidWalletId } from '../../utils/walletInvite';

type JoinWalletScreenRouteProp = RouteProp<WalletStackParamList, 'JoinWallet'>;

export function JoinWalletScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<JoinWalletScreenRouteProp>();
  const { walletId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { loadWallets } = useWalletStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!isValidWalletId(walletId)) {
      setError('ID dompet tidak valid');
      setIsLoading(false);
      return;
    }
    fetchWalletInfo();
  }, [walletId]);

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

        if ((members ?? []).some((member) => normalizeWalletMemberEmail(member.user_email) === authEmail)) {
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
          name: 'Dompet Bersama',
          type: 'general',
          color: colors.primary,
          isLocked: true,
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal memuat informasi dompet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWallets = async () => {
    await loadWallets();
    navigation.replace('WalletList');
  };

  const handleJoin = async () => {
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
        result.alreadyMember ? 'Anda sudah menjadi anggota dompet ini.' : 'Berhasil bergabung ke dompet!',
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
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memeriksa undangan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { padding: 20 }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <EmptyState
          icon="alert-circle-outline"
          title="Undangan tidak bisa dibuka"
          description={error}
          actionLabel="Coba Lagi"
          onAction={fetchWalletInfo}
          style={styles.errorState}
        />
        <Button
          label="Kembali"
          onPress={() => navigation.goBack()}
          variant="secondary"
          fullWidth
          style={styles.backAction}
        />
      </View>
    );
  }

  const walletColor = walletInfo?.color || colors.primary;
  const walletTypeLabel = walletInfo?.type?.toUpperCase?.() || 'GENERAL';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={styles.bgAuraTop} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Undangan Dompet</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={[walletColor, colors.primaryDark, walletColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="wallet-outline" size={38} color={walletColor} />
          </View>
          <Text style={styles.walletName}>{walletInfo?.name}</Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={colors.textInverse} />
              <Text style={styles.heroChipText}>Aman untuk bergabung</Text>
            </View>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="shape-outline" size={14} color={colors.textInverse} />
              <Text style={styles.heroChipText}>{walletTypeLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Siapa saja yang bisa melihat?</Text>
          <Text style={styles.infoSubtitle}>
            Bergabung ke dompet ini akan menyinkronkan saldo, transaksi, dan akses anggota sesuai izin yang berlaku.
          </Text>

          <View style={styles.inviteBox}>
            <MaterialCommunityIcons name="link-variant" size={18} color={colors.primary} />
            <Text style={styles.inviteText} numberOfLines={2}>
              {buildWalletInviteUrl(walletId)}
            </Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color={colors.primary} />
            <Text style={styles.metaText}>Setelah bergabung, dompet ini muncul di daftar utama kamu.</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.metaText}>Cocok untuk keluarga, tim kecil, atau dompet kolaboratif.</Text>
          </View>
        </View>

        {alreadyMember ? (
          <View style={styles.actionSection}>
            <View style={styles.alreadyMemberBadge}>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} />
              <Text style={styles.alreadyMemberText}>Anda sudah bergabung</Text>
            </View>
            <Button label="Buka Dompet" onPress={handleOpenWallets} variant="primary" fullWidth />
          </View>
        ) : (
          <View style={styles.actionSection}>
            <Button
              label="Gabung Sekarang"
              onPress={handleJoin}
              variant="primary"
              loading={isJoining}
              fullWidth
            />
            <Button
              label="Batal"
              onPress={() => navigation.goBack()}
              variant="secondary"
              fullWidth
            />
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bgAuraTop: {
    position: 'absolute',
    top: -120,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: { ...Typography.h3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
  },
  errorState: {
    width: '100%',
  },
  backAction: {
    marginTop: 12,
    width: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    top: -54,
    right: -28,
    width: 150,
    height: 150,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  walletName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h2,
    color: colors.textInverse,
    textAlign: 'center',
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textInverse,
  },
  infoCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  infoTitle: {
    ...Typography.h4,
    color: colors.textPrimary,
  },
  infoSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  inviteText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  metaCard: {
    gap: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  metaText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actionSection: {
    marginTop: 'auto',
    gap: 12,
  },
  alreadyMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.successBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${colors.success}22`,
  },
  alreadyMemberText: {
    fontFamily: FontFamily.bodyBold,
    color: colors.success,
    fontSize: FontSize.body,
  },
});

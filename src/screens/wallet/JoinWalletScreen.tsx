import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { supabase } from "../../lib/supabase";
import { useWalletStore } from "../../store/useWalletStore";
import type { WalletStackParamList } from "../../types/navigation";
import {
  getAuthenticatedWalletEmail,
  joinWalletByInvite,
  normalizeWalletMemberEmail,
} from "../../database/walletSharingService";
import { buildWalletInviteUrl, isValidWalletId } from "../../utils/walletInvite";

type JoinWalletScreenRouteProp = RouteProp<WalletStackParamList, "JoinWallet">;

export function JoinWalletScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<JoinWalletScreenRouteProp>();
  const { walletId } = route.params;
  const insets = useSafeAreaInsets();
  const { loadWallets } = useWalletStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!isValidWalletId(walletId)) {
      setError("ID Dompet tidak valid");
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
          .from("wallet_members")
          .select("id, user_email, status")
          .eq("wallet_id", walletId);
        if ((members ?? []).some((member) => normalizeWalletMemberEmail(member.user_email) === authEmail)) {
          setAlreadyMember(true);
        }
      }

      // Fetch wallet preview via RPC
      const { data: walletPreview, error: rpcError } = await supabase.rpc("get_wallet_preview", {
        p_wallet_id: walletId,
      });

      if (!rpcError && walletPreview && walletPreview.length > 0) {
        setWalletInfo(walletPreview[0]);
      } else {
        // Fallback generic info if RPC fails or RLS blocks
        setWalletInfo({
          name: "Dompet Bersama",
          type: "general",
          color: Colors.primary,
          isLocked: true,
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Gagal memuat informasi dompet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWallets = async () => {
    await loadWallets();
    navigation.replace("WalletList");
  };

  const handleJoin = async () => {
    const authEmail = await getAuthenticatedWalletEmail();

    if (!authEmail) {
      Alert.alert("Login Diperlukan", "Silakan login kembali.");
      return;
    }

    try {
      setIsJoining(true);
      const result = await joinWalletByInvite(walletId);
      await loadWallets();
      setAlreadyMember(true);

      Alert.alert(result.alreadyMember ? "Sudah Bergabung" : "Sukses", result.alreadyMember ? "Anda sudah menjadi anggota dompet ini." : "Berhasil bergabung ke dompet!", [
        { text: "OK", onPress: handleOpenWallets },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Gagal", e.message || "Terjadi kesalahan.");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: Colors.textSecondary }}>Memeriksa undangan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.danger} />
        <Text style={styles.title}>{error}</Text>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonGhostText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Undangan Dompet</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: walletInfo?.color || Colors.primary }]}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="wallet" size={40} color={walletInfo?.color || Colors.primary} />
          </View>
          <Text style={styles.walletName}>{walletInfo?.name}</Text>
          <Text style={styles.walletType}>{walletInfo?.type?.toUpperCase()}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Anda diundang bergabung!</Text>
          <Text style={styles.infoSubtitle}>{buildWalletInviteUrl(walletId)}</Text>
        </View>

        {alreadyMember ? (
          <View style={styles.actionSection}>
            <View style={styles.alreadyMemberBadge}>
              <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />
              <Text style={styles.alreadyMemberText}>Anda sudah bergabung</Text>
            </View>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleOpenWallets}>
              <Text style={styles.buttonText}>Buka Dompet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleJoin} disabled={isJoining}>
              {isJoining ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Gabung Sekarang</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonGhost} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonGhostText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 16 },
  backBtn: { padding: 8, borderRadius: 50, backgroundColor: Colors.neutral100 },
  title: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: Colors.textPrimary },
  content: { flex: 1, padding: 24, alignItems: "center" },
  card: { width: "100%", paddingVertical: 40, paddingHorizontal: 24, borderRadius: 32, alignItems: "center", gap: 12, marginBottom: 32 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  walletName: { fontFamily: FontFamily.heading, fontSize: FontSize.h2, color: "#FFF", textAlign: "center" },
  walletType: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: "rgba(255,255,255,0.9)" },
  infoSection: { marginBottom: 40, alignItems: "center" },
  infoTitle: { fontFamily: FontFamily.heading, fontSize: FontSize.h3, color: Colors.textPrimary },
  infoSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.textSecondary, marginTop: 8, textAlign: "center" },
  actionSection: { width: "100%", gap: 16, marginTop: "auto", marginBottom: 20 },
  buttonPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  buttonText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: "#FFF" },
  buttonGhost: { paddingVertical: 16, alignItems: "center" },
  buttonGhostText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: Colors.textSecondary },
  alreadyMemberBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: Colors.successBg, borderRadius: 16 },
  alreadyMemberText: { fontFamily: FontFamily.bodyBold, color: Colors.success }
});

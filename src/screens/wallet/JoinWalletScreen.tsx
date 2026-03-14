import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { syncDatabase } from "../../database/sync";
import { getDatabase } from "../../database/schema";
import type { WalletStackParamList } from "../../types/navigation";
import { v4 as uuidv4 } from "uuid";

type JoinWalletScreenRouteProp = RouteProp<WalletStackParamList, "JoinWallet">;

export function JoinWalletScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<JoinWalletScreenRouteProp>();
  const { walletId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!walletId) {
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

      // 1. Cek apakah user sudah member
      if (user?.email) {
        const { data: member } = await supabase
          .from("wallet_members")
          .select("id")
          .eq("wallet_id", walletId)
          .eq("user_email", user.email)
          .single();

        if (member) {
          setAlreadyMember(true);
        }
      }

      // 2. Ambil info wallet menggunakan RPC (Bypass RLS)
      // Kita menggunakan RPC 'get_wallet_preview' agar user bisa melihat nama dompet
      // meskipun belum menjadi member (RLS table 'wallets' biasanya memblokir SELECT)
      const { data: walletPreview, error: rpcError } = await supabase.rpc("get_wallet_preview", {
        p_wallet_id: walletId,
      });

      if (!rpcError && walletPreview && walletPreview.length > 0) {
        setWalletInfo(walletPreview[0]);
      } else {
        // Fallback: Jika RPC belum dibuat, coba SELECT biasa (mungkin gagal karena RLS)
        console.log("RPC get_wallet_preview gagal/tidak ada, mencoba SELECT biasa...", rpcError);

        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("id, name, type, color") // Select limited fields
          .eq("id", walletId)
          .single();

        if (walletError) {
          console.warn("Gagal fetch wallet info (RLS Block):", walletError);
          // Jika gagal, tampilkan info generik tapi JANGAN block user untuk join
          // Error PGRST116 = 0 rows (karena RLS filter row-nya)
          setWalletInfo({
            name: "Dompet Pribadi",
            type: "general",
            color: Colors.neutral300,
            isLocked: true,
          });
        } else {
          setWalletInfo(wallet);
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Gagal memuat informasi dompet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user?.email) {
      Alert.alert("Login Diperlukan", "Anda harus login terlebih dahulu untuk bergabung.");
      return;
    }

    try {
      setIsJoining(true);

      const newMemberId = uuidv4();
      const memberPayload = {
        id: newMemberId,
        wallet_id: walletId,
        user_email: user.email,
        role: "editor",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      console.log("[JoinWallet] Payload:", JSON.stringify(memberPayload));

      // 1. Insert ke Supabase
      const { error: joinError } = await supabase
        .from("wallet_members")
        .insert(memberPayload)
        .select("id")
        .single();

      if (joinError) {
        // Handle unique violation (sudah member)
        if (joinError.code === "23505") {
          Alert.alert("Info", "Anda sudah menjadi anggota dompet ini");
          navigation.replace("WalletList");
          return;
        }
        // Handle RLS error
        if (joinError.code === "42501") {
          throw new Error(
            "Gagal bergabung: Izin ditolak (RLS). Pastikan Anda menggunakan email yang benar.",
          );
        }
        throw joinError;
      }

      // 2. Fetch Info Lengkap (Sekarang sudah boleh karena sudah member)
      const { data: fullWallet, error: fetchErr } = await supabase
        .from("wallets")
        .select("*")
        .eq("id", walletId)
        .single();

      // 3. Simpan ke Lokal (Upsert)
      if (fullWallet) {
        try {
          const db = await getDatabase();
          await db.runAsync(
            `INSERT OR REPLACE INTO wallets (id, name, type, color, balance, is_default, created_at, updated_at, profile_id, sync_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            [
              fullWallet.id,
              fullWallet.name || "Shared Wallet",
              fullWallet.type || "general",
              fullWallet.color || Colors.primary,
              fullWallet.balance || 0,
              fullWallet.is_default ? 1 : 0,
              fullWallet.created_at || Date.now(),
              Date.now(),
              fullWallet.profile_id || null,
            ],
          );

          // Trigger sync agar transaksi/member lain juga masuk
          syncDatabase().catch(console.error);
        } catch (dbErr) {
          console.error("Gagal menyimpan wallet referensi ke lokal:", dbErr);
        }
      }

      Alert.alert("Sukses", "Berhasil bergabung ke dompet!", [
        { text: "OK", onPress: () => navigation.replace("WalletList") },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Gagal", e.message || "Terjadi kesalahan saat bergabung.");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Memeriksa undangan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <MaterialCommunityIcons name='alert-circle-outline' size={64} color={Colors.danger} />
        <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.buttonOutline} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonOutlineText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name='close' size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Undangan Dompet</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: walletInfo?.color || Colors.primary }]}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={
                walletInfo?.type === "bank"
                  ? "bank-outline"
                  : walletInfo?.type === "e-wallet"
                    ? "cellphone"
                    : "wallet-outline"
              }
              size={40}
              color={walletInfo?.color || Colors.primary}
            />
          </View>

          <Text style={styles.walletName}>{walletInfo?.name || "Dompet Bersama"}</Text>
          <Text style={styles.walletType}>
            {walletInfo?.type ? walletInfo.type.toUpperCase() : "GENERAL"}
          </Text>

          {walletInfo?.isLocked && (
            <View style={styles.lockedBadge}>
              <MaterialCommunityIcons name='lock' size={14} color='#FFF' />
              <Text style={styles.lockedText}>Info Terbatas</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Anda diundang bergabung!</Text>
          <Text style={styles.infoDesc}>
            {walletInfo?.isLocked
              ? "Dompet ini bersifat privat. Gabung untuk melihat saldo dan riwayat transaksi."
              : "Bergabunglah untuk mulai mengelola keuangan bersama, melihat riwayat transaksi, dan memantau anggaran."}
          </Text>
        </View>

        {alreadyMember ? (
          <View style={styles.actionSection}>
            <View style={styles.alreadyMemberBadge}>
              <MaterialCommunityIcons name='check-circle' size={24} color={Colors.success} />
              <Text style={styles.alreadyMemberText}>Anda sudah menjadi anggota</Text>
            </View>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => navigation.replace("WalletList")}
            >
              <Text style={styles.buttonText}>Buka Dompet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color='#FFF' />
              ) : (
                <Text style={styles.buttonText}>Gabung Sekarang</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonGhost}
              onPress={() => navigation.goBack()}
              disabled={isJoining}
            >
              <Text style={styles.buttonGhostText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: Colors.neutral100,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  card: {
    width: "100%",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 32,
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  walletName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h2,
    color: "#FFF",
    textAlign: "center",
  },
  walletType: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  lockedText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: "#FFF",
  },
  infoSection: {
    marginBottom: 40,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  infoTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  infoDesc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  actionSection: {
    width: "100%",
    gap: 16,
    marginTop: "auto",
    marginBottom: 20,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: "#FFF",
  },
  buttonGhost: {
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonGhostText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: FontFamily.body,
    color: Colors.textSecondary,
  },
  errorTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 24,
    fontFamily: FontFamily.body,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  buttonOutline: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  buttonOutlineText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
  },
  alreadyMemberBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: Colors.successBg,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  alreadyMemberText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.success,
    fontSize: FontSize.body,
  },
});

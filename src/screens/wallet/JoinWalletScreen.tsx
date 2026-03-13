import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { syncDatabase } from "../../database/sync";
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
          // Jika sudah member, kita tetap fetch info wallet untuk ditampilkan
        }
      }

      // 2. Ambil info wallet
      // Catatan: Ini mungkin gagal jika RLS membatasi akses SELECT ke non-member
      // Solusi: Mengandalkan function RPC 'get_wallet_preview' jika ada, atau asumsi RLS mengizinkan read by ID
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("name, color, type, owner_id:profile_id") // owner_id is guess, usually profile_id
        .eq("id", walletId)
        .single();

      if (walletError) {
        // Jika error permission denied, kita mungkin hanya bisa menampilkan ID
        console.warn("Gagal fetch wallet info (mungkin RLS):", walletError);
        // Fallback UI
        setWalletInfo({ name: "Dompet Terkunci", type: "unknown", color: Colors.neutral300 });
      } else {
        setWalletInfo(wallet);
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
      Alert.alert("Error", "Anda harus login terlebih dahulu");
      return;
    }

    try {
      setIsJoining(true);

      // Payload bersih tanpa sync_status
      const newMemberId = uuidv4(); // Deklarasi ulang
      const memberPayload = {
        id: newMemberId,
        wallet_id: walletId,
        user_email: user.email,
        role: "viewer",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      console.log("[JoinWallet] Payload:", JSON.stringify(memberPayload));

      const { error: joinError } = await supabase
        .from("wallet_members")
        .insert(memberPayload)
        .select("id")
        .single();

      if (joinError) {
        // Handle duplicate key error gracefully
        if (joinError.code === "23505") {
          // Unique violation
          Alert.alert("Info", "Anda sudah menjadi anggota dompet ini");
          navigation.replace("WalletList");
          return;
        }
        throw joinError;
      }

      // Trigger sync agar data turun ke local DB
      Alert.alert("Sukses", "Berhasil bergabung ke dompet!");
      syncDatabase().catch(console.error);

      // Navigate back to wallet list
      navigation.replace("WalletList");
    } catch (e: any) {
      Alert.alert("Gagal", e.message || "Gagal bergabung ke dompet");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Memuat info dompet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { padding: 20 }]}>
        <MaterialCommunityIcons name='alert-circle-outline' size={48} color={Colors.danger} />
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
          <MaterialCommunityIcons
            name={
              walletInfo?.type === "bank"
                ? "bank-outline"
                : walletInfo?.type === "e-wallet"
                  ? "cellphone"
                  : "wallet-outline"
            }
            size={48}
            color='#FFF'
          />
          <Text style={styles.walletName}>{walletInfo?.name || "Dompet Bersama"}</Text>
          <Text style={styles.walletId}>ID: {walletId.substring(0, 8)}...</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Anda diundang bergabung!</Text>
          <Text style={styles.infoDesc}>
            Bergabunglah dengan dompet ini untuk mulai mengelola keuangan bersama. Sebagai anggota,
            Anda dapat melihat riwayat transaksi dan saldo.
          </Text>
        </View>

        {alreadyMember ? (
          <View style={styles.actionSection}>
            <View style={styles.alreadyMemberBadge}>
              <MaterialCommunityIcons name='check-circle' size={20} color={Colors.success} />
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
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  walletName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h2,
    color: "#FFF",
    textAlign: "center",
  },
  walletId: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: "rgba(255,255,255,0.8)",
  },
  infoSection: {
    marginBottom: 40,
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
  },
  infoDesc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  actionSection: {
    width: "100%",
    gap: 16,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
  errorText: {
    marginVertical: 16,
    fontFamily: FontFamily.body,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  buttonOutline: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
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
    gap: 8,
    backgroundColor: Colors.successBg,
    padding: 12,
    borderRadius: 12,
  },
  alreadyMemberText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.success,
  },
});

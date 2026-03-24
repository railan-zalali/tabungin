// QR Code Component untuk Undangan Dompet
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import type { WalletMember } from "../../database/walletQueries";
import {
  fetchWalletMembersForDisplay,
  inviteWalletMember,
  removeWalletMemberWithSync,
  fetchSharedGoalsForMember,
} from "../../database/walletSharingService";
import {
  buildWalletInviteMessage,
  buildWalletInviteUrl,
} from "../../utils/walletInvite";

interface WalletMemberListProps {
  walletId: string;
}

export function WalletMemberList({ walletId }: WalletMemberListProps) {
  const [members, setMembers] = useState<WalletMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [sharedGoalsCount, setSharedGoalsCount] = useState<Record<string, number>>({});

  const inviteUrl = buildWalletInviteUrl(walletId);
  const inviteMessage = buildWalletInviteMessage(walletId);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWalletMembersForDisplay(walletId);
      setMembers(data);

      // Load shared goals count for each member
      const goalsCount: Record<string, number> = {};
      await Promise.all(
        data.map(async (member) => {
          try {
            const sharedGoalIds = await fetchSharedGoalsForMember(walletId, member.user_email);
            goalsCount[member.id] = sharedGoalIds.length;
          } catch (error) {
            console.error(`Failed to load shared goals for ${member.user_email}:`, error);
            goalsCount[member.id] = 0;
          }
        })
      );
      setSharedGoalsCount(goalsCount);
    } catch (error) {
      console.error(error);
      Alert.alert("Gagal", "Gagal memuat anggota dompet.");
    } finally {
      setIsLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: inviteMessage,
        url: inviteUrl,
      });
    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Gagal membagikan undangan.");
    }
  };

  const handleShareQR = async () => {
    try {
      await Share.share({
        message: inviteMessage,
        url: inviteUrl,
      });
    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Gagal membagikan QR code.");
    }
  };

  const handleInvite = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Masukkan email yang valid");
      return;
    }

    setInviteLoading(true);
    try {
      await inviteWalletMember(walletId, email, "editor");
      setEmail("");
      setIsInviting(false);
      await loadMembers();
      Alert.alert("Sukses", "Undangan terkirim.");
    } catch (error: any) {
      Alert.alert("Gagal", error.message || "Gagal mengundang anggota");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    Alert.alert("Hapus Anggota", "Apakah Anda yakin ingin menghapus anggota ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await removeWalletMemberWithSync(id);
            await loadMembers();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Gagal menghapus anggota");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Anggota Tim</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleShareLink}>
            <MaterialCommunityIcons name='share-variant' size={16} color={Colors.primary} />
            <Text style={styles.inviteBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowQR(true)}>
            <MaterialCommunityIcons name='qrcode' size={16} color={Colors.primary} />
            <Text style={styles.inviteBtnText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setIsInviting(true)}>
            <MaterialCommunityIcons name='plus' size={16} color={Colors.primary} />
            <Text style={styles.inviteBtnText}>Undang</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : members.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada anggota lain di dompet ini.</Text>
      ) : (
        <View style={styles.list}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{member.user_email[0].toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberEmail}>{member.user_email}</Text>
                  {sharedGoalsCount[member.id] > 0 && (
                    <View style={styles.goalsBadge}>
                      <MaterialCommunityIcons name='target' size={12} color={Colors.primary} />
                      <Text style={styles.goalsBadgeText}>{sharedGoalsCount[member.id]}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberRole}>
                  {member.role} - {member.status === "pending" ? "Menunggu" : "Aktif"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(member.id)} style={styles.removeBtn}>
                <MaterialCommunityIcons name='trash-can-outline' size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={isInviting}
        transparent
        animationType='fade'
        onRequestClose={() => setIsInviting(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Undang Anggota</Text>
            <Text style={styles.modalSubtitle}>
              Masukkan email pengguna yang ingin Anda undang ke dompet ini.
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder='email@contoh.com'
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize='none'
              keyboardType='email-address'
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsInviting(false)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator color='#FFF' size='small' />
                ) : (
                  <Text style={styles.confirmBtnText}>Kirim Undangan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQR}
        transparent
        animationType='fade'
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalContent, { alignItems: "center" }]}>
              <Text style={styles.modalTitle}>QR Code Undangan</Text>
              <Text style={[styles.modalSubtitle, { textAlign: "center", marginBottom: 24 }]}>
                Minta teman Anda scan QR ini menggunakan aplikasi Tabungin untuk bergabung.
              </Text>

              <View style={styles.qrContainer}>
                <View style={styles.qrPreview}>
                  <QRCode
                    value={inviteUrl}
                    size={280}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <View style={styles.qrActions}>
                  <TouchableOpacity style={styles.qrActionButton} onPress={handleShareQR}>
                    <MaterialCommunityIcons name='share-variant' size={20} color={Colors.primary} />
                    <Text style={styles.qrActionText}>Bagikan</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoText}>
                  Tips: QR code ini selalu mengarah ke tautan undangan yang sama. Anda bisa scan,
                  screenshot, atau bagikan langsung ke teman Anda.
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
                <Text style={styles.closeButtonText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  inviteBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
  list: {
    gap: 8,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FontFamily.headingMedium,
    color: Colors.primary,
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberEmail: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  goalsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  goalsBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.primary,
  },
  memberRole: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: Colors.primary,
    textTransform: "capitalize",
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  confirmBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: "#FFF",
  },
  qrContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 20,
  },
  qrPreview: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  qrActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  qrActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  qrActionText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: Colors.primary,
  },
  infoSection: {
    width: "100%",
    backgroundColor: Colors.primaryLight + "20",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  closeButton: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: "#FFFFFF",
  },
});

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
import { FontFamily, FontSize } from "../../constants/typography";
import { BorderRadius, Shadow } from "../../constants/theme";
import { useTheme } from "../../store/useThemeStore";
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
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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
            <MaterialCommunityIcons name='share-variant' size={16} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowQR(true)}>
            <MaterialCommunityIcons name='qrcode' size={16} color={colors.primary} />
            <Text style={styles.inviteBtnText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setIsInviting(true)}>
            <MaterialCommunityIcons name='plus' size={16} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Undang</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
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
                      <MaterialCommunityIcons name='target' size={12} color={colors.primary} />
                      <Text style={styles.goalsBadgeText}>{sharedGoalsCount[member.id]}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberRole}>
                  {member.role} - {member.status === "pending" ? "Menunggu" : "Aktif"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(member.id)} style={styles.removeBtn}>
                <MaterialCommunityIcons name='trash-can-outline' size={20} color={colors.danger} />
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
              placeholderTextColor={colors.textTertiary}
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
                    <MaterialCommunityIcons name='share-variant' size={20} color={colors.primary} />
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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  title: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h4,
    color: colors.textPrimary,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  inviteBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: colors.primary,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textTertiary,
    fontStyle: "italic",
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  list: {
    gap: 10,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceGlass,
    padding: 16,
    borderRadius: BorderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.glassStroke,
    gap: 12,
    ...Shadow.sm,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FontFamily.headingMedium,
    color: colors.primary,
    fontSize: FontSize.body,
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
    color: colors.textPrimary,
    flex: 1,
  },
  goalsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
  },
  goalsBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: colors.primary,
  },
  memberRole: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginTop: 4,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.danger}12`,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContent: {
    backgroundColor: colors.surfaceCard,
    borderRadius: BorderRadius['4xl'],
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.glassStroke,
    ...Shadow.lg,
  },
  modalTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.xl,
    padding: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
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
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  cancelBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    minWidth: 100,
    alignItems: "center",
    ...Shadow.sm,
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
    borderRadius: BorderRadius['3xl'],
    ...Shadow.md,
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassStroke,
  },
  qrActionText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: colors.primary,
  },
  infoSection: {
    width: "100%",
    backgroundColor: colors.primaryBg,
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}1F`,
  },
  infoText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  closeButton: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    ...Shadow.sm,
  },
  closeButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: "#FFFFFF",
  },
});

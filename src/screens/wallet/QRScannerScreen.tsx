import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { CameraView, Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { parseWalletInvite } from "../../utils/walletInvite";

export function QRScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; fileName: string } | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleInvitePayload = (rawValue: string) => {
    setScanned(true);

    const walletId = parseWalletInvite(rawValue);
    if (walletId) {
      navigation.replace("JoinWallet", { walletId });
      return;
    }

    Alert.alert("QR Tidak Valid", "Kode QR ini bukan undangan dompet Tabungin yang valid.", [
      { text: "Coba Lagi", onPress: () => setScanned(false) },
    ]);
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned || isPickingImage) return;
    handleInvitePayload(data);
  };

  const handlePickFromGallery = async () => {
    if (isPickingImage) return;

    try {
      setIsPickingImage(true);
      setScanned(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Akses Galeri Diperlukan", "Izinkan akses galeri untuk memilih gambar QR undangan.", [
          {
            text: "OK",
            onPress: () => setScanned(false),
          },
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        setScanned(false);
        return;
      }

      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName || "qr-gallery-image.jpg",
      });

      const barcodes = await Camera.scanFromURLAsync(asset.uri, ["qr"]);
      const qrResult = barcodes.find((barcode) => barcode.data);

      if (!qrResult?.data) {
        Alert.alert("QR Tidak Ditemukan", "Gambar yang dipilih tidak berisi QR undangan yang bisa dibaca.", [
          {
            text: "Pilih Lagi",
            onPress: () => setScanned(false),
          },
        ]);
        return;
      }

      handleInvitePayload(qrResult.data);
    } catch (error) {
      console.error("[QRScanner] Failed to scan image from gallery:", error);
      Alert.alert("Gagal Membaca Gambar", "Terjadi kendala saat memproses gambar dari galeri.", [
        {
          text: "Coba Lagi",
          onPress: () => setScanned(false),
        },
      ]);
    } finally {
      setIsPickingImage(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.text}>Akses kamera diperlukan untuk memindai QR code.</Text>
        <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} disabled={isPickingImage}>
          {isPickingImage ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#FFF" />
              <Text style={styles.galleryBtnText}>Pilih QR dari Galeri</Text>
            </>
          )}
        </TouchableOpacity>
        {selectedImage ? (
          <View style={styles.selectedImageCardFallback}>
            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImageThumbFallback} />
            <View style={styles.selectedImageMeta}>
              <Text style={styles.selectedImageLabel}>Gambar terakhir dipilih</Text>
              <Text style={styles.selectedImageName} numberOfLines={1}>
                {selectedImage.fileName}
              </Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Undangan</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.scannerBoxContainer}>
          <View style={styles.scannerBox} />
          <Text style={styles.instruction}>Arahkan kamera ke QR code undangan</Text>
          <TouchableOpacity
            style={[styles.galleryCta, isPickingImage && styles.galleryCtaDisabled]}
            onPress={handlePickFromGallery}
            disabled={isPickingImage}
          >
            {isPickingImage ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="image-search-outline" size={22} color={Colors.textPrimary} />
                <Text style={styles.galleryCtaText}>Pilih dari Galeri</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.galleryHint}>Cocok untuk scan screenshot atau foto QR yang sudah tersimpan</Text>
          {selectedImage ? (
            <View style={styles.selectedImageCard}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImageThumb} />
              <View style={styles.selectedImageMeta}>
                <View style={styles.selectedImageBadge}>
                  <MaterialCommunityIcons name="image-check-outline" size={14} color={Colors.primary} />
                  <Text style={styles.selectedImageBadgeText}>Siap Diproses</Text>
                </View>
                <Text style={styles.selectedImageLabel}>Gambar QR terpilih</Text>
                <Text style={styles.selectedImageName} numberOfLines={1}>
                  {selectedImage.fileName}
                </Text>
                <TouchableOpacity
                  onPress={handlePickFromGallery}
                  disabled={isPickingImage}
                  style={styles.changeImageBtn}
                >
                  <Text style={styles.changeImageBtnText}>Ganti Gambar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
  text: { color: "#FFF", textAlign: "center", marginBottom: 24, fontFamily: FontFamily.body },
  backBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12 },
  backBtnText: { color: "#FFF", fontFamily: FontFamily.bodyBold },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    minWidth: 220,
    justifyContent: "center",
  },
  galleryBtnText: { color: "#FFF", fontFamily: FontFamily.bodyBold },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "space-between" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: { padding: 8 },
  title: { color: "#FFF", fontFamily: FontFamily.heading, fontSize: FontSize.h3 },
  scannerBoxContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  instruction: { color: "#FFF", marginTop: 24, fontFamily: FontFamily.body, fontSize: FontSize.body },
  galleryCta: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F4F0E8",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  galleryCtaDisabled: {
    opacity: 0.75,
  },
  galleryCtaText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  galleryHint: {
    marginTop: 12,
    color: "rgba(255,255,255,0.82)",
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  selectedImageCard: {
    marginTop: 18,
    width: 300,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  selectedImageCardFallback: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  selectedImageThumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
  },
  selectedImageThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
  },
  selectedImageMeta: {
    flex: 1,
    gap: 4,
  },
  selectedImageBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  selectedImageBadgeText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
  },
  selectedImageLabel: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
  },
  selectedImageName: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.body,
  },
  changeImageBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
  },
  changeImageBtnText: {
    color: Colors.textPrimary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
  },
});

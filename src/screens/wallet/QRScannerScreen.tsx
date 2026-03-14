import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import * as Linking from "expo-linking";

export function QRScannerScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    console.log("Scanned data:", data);

    // Coba ekstrak walletId dari URL
    // Format bisa: tabungin://invite/UUID atau exp://.../--/invite/UUID
    let walletId: string | null = null;

    try {
      if (data.includes("/invite/")) {
        const parts = data.split("/invite/");
        if (parts.length > 1) {
          // Ambil bagian setelah /invite/
          const afterInvite = parts[1];
          // Hapus query params jika ada (misal ?foo=bar)
          walletId = afterInvite.split("?")[0].split("/")[0];
        }
      }
    } catch (e) {
      console.error("Error parsing QR:", e);
    }

    if (walletId && walletId.length > 10) {
      // Validasi sederhana panjang UUID
      // Navigasi langsung di dalam app
      // Gunakan replace agar user tidak balik ke scanner saat tekan back di JoinWallet
      navigation.replace("JoinWallet", { walletId });
    } else {
      Alert.alert(
        "QR Code Tidak Valid",
        "QR Code ini bukan undangan dompet Tabungin yang valid.\nData: " + data,
        [{ text: "OK", onPress: () => setScanned(false) }],
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Meminta izin kamera...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>Tidak ada akses ke kamera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name='close' size={24} color='#FFF' />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Undangan</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        <Text style={styles.instruction}>Arahkan kamera ke QR Code undangan dompet teman Anda</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
    color: "#FFF",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    position: "relative",
  },
  instruction: {
    fontFamily: FontFamily.body,
    color: "#FFF",
    textAlign: "center",
    paddingHorizontal: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
  },
  // Corners
  cornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
  },
  cornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
  },
  cornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary,
  },
  cornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary,
  },
});

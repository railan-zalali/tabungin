import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, Camera } from "expo-camera";
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

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const walletId = parseWalletInvite(data);
    if (walletId) {
      navigation.replace("JoinWallet", { walletId });
      return;
    }

    Alert.alert("QR Tidak Valid", "Kode QR ini bukan undangan dompet Tabungin yang valid.", [
      { text: "Coba Lagi", onPress: () => setScanned(false) },
    ]);
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.text}>Akses kamera diperlukan untuk memindai QR code.</Text>
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
});

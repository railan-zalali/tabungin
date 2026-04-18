import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, StatusBar } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { ScreenShell } from '../../components/common/ScreenShell';
import { StatStrip } from '../../components/common/StatStrip';
import { parseWalletInvite } from '../../utils/walletInvite';
import { useResponsiveMetrics } from '../../utils/responsive';

export function QRScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const metrics = useResponsiveMetrics();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const canUseCloudCollaboration = useAuthStore((state) => state.canUseCloudCollaboration);
  const setPostAuthRedirect = useAuthStore((state) => state.setPostAuthRedirect);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; fileName: string } | null>(null);

  useEffect(() => {
    if (!canUseCloudCollaboration) {
      setHasPermission(false);
      return;
    }

    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, [canUseCloudCollaboration]);

  if (!canUseCloudCollaboration) {
    return (
      <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
        <AppScreenHeader
          title="Scan QR undangan"
          subtitle="Mode scan penuh tersedia setelah akun terhubung ke cloud."
          eyebrow="Wallet Scan"
          showBack
          onBackPress={() => navigation.goBack()}
          variant="transparent"
        />
        <ScrollView
          contentContainerStyle={[
            styles.fallbackContent,
            {
              paddingHorizontal: metrics.horizontalPadding,
              paddingBottom: metrics.contentBottomInset,
              gap: metrics.verticalGap,
            },
            metrics.widthClass !== 'compact' ? styles.fallbackContentWide : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HeroSummaryCard
            eyebrow="Cloud Access"
            title="Mode guest belum bisa scan"
            value="Akun diperlukan"
            description="Scan QR undangan dompet membutuhkan akun yang terhubung ke cloud. Setelah masuk, kamu akan kembali ke layar ini."
            icon="account-lock-outline"
            stats={[
              { label: 'Fitur', value: 'QR Wallet', icon: 'qrcode-scan' },
              { label: 'Status', value: 'Terkunci', icon: 'lock-outline' },
              { label: 'Aksi', value: 'Login', icon: 'login' },
            ]}
          />
          <InlineNotice
            icon="shield-account-outline"
            description="Pembatasan ini sengaja dipakai agar undangan shared wallet hanya diproses di akun yang benar-benar punya identitas cloud."
            tone="info"
          />
          <StatStrip
            items={[
              { label: 'Mode', value: 'Guest' },
              { label: 'Akses', value: 'Terbatas' },
              { label: 'Tindak lanjut', value: 'Masuk akun' },
            ]}
            vertical={metrics.widthClass === 'compact'}
          />
          <View style={styles.fallbackActions}>
            <Button
              label="Masuk dengan akun"
              onPress={() => {
                setPostAuthRedirect({ screen: 'Wallet', params: { screen: 'QRScanner' } });
                navigation.navigate('Login');
              }}
              fullWidth
            />
            <Button
              label="Buat akun"
              onPress={() => {
                setPostAuthRedirect({ screen: 'Wallet', params: { screen: 'QRScanner' } });
                navigation.navigate('Register');
              }}
              variant="secondary"
              fullWidth
            />
            <Button label="Kembali" onPress={() => navigation.goBack()} variant="outline" fullWidth />
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  const handleInvitePayload = (rawValue: string) => {
    setScanned(true);

    const walletId = parseWalletInvite(rawValue);
    if (walletId) {
      navigation.replace('JoinWallet', { walletId });
      return;
    }

    Alert.alert('QR tidak valid', 'Kode QR ini bukan undangan dompet Tabungin yang valid.', [
      { text: 'Coba Lagi', onPress: () => setScanned(false) },
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
        Alert.alert('Akses galeri diperlukan', 'Izinkan akses galeri untuk memilih gambar QR undangan.', [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        fileName: asset.fileName || 'qr-gallery-image.jpg',
      });

      const barcodes = await Camera.scanFromURLAsync(asset.uri, ['qr']);
      const qrResult = barcodes.find((barcode) => barcode.data);

      if (!qrResult?.data) {
        Alert.alert('QR tidak ditemukan', 'Gambar yang dipilih tidak berisi QR undangan yang bisa dibaca.', [
          {
            text: 'Pilih Lagi',
            onPress: () => setScanned(false),
          },
        ]);
        return;
      }

      handleInvitePayload(qrResult.data);
    } catch (error) {
      console.error('[QRScanner] Failed to scan image from gallery:', error);
      Alert.alert('Gagal membaca gambar', 'Terjadi kendala saat memproses gambar dari galeri.', [
        {
          text: 'Coba Lagi',
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
      <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
        <AppScreenHeader
          title="Scan QR undangan"
          subtitle="Akses kamera membantu proses scan real-time, tapi galeri tetap tersedia sebagai fallback."
          eyebrow="Wallet Scan"
          showBack
          onBackPress={() => navigation.goBack()}
          variant="transparent"
        />
        <ScrollView
          contentContainerStyle={[
            styles.fallbackContent,
            {
              paddingHorizontal: metrics.horizontalPadding,
              paddingBottom: metrics.contentBottomInset,
              gap: metrics.verticalGap,
            },
            metrics.widthClass !== 'compact' ? styles.fallbackContentWide : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <HeroSummaryCard
            eyebrow="Camera Access"
            title="Akses kamera diperlukan"
            value="Belum diizinkan"
            description="Izinkan kamera agar kamu bisa memindai QR undangan secara langsung. Kalau belum siap, pilih gambar QR dari galeri."
            icon="camera-outline"
            stats={[
              { label: 'Scan live', value: 'Nonaktif', icon: 'camera-off-outline' },
              { label: 'Fallback', value: 'Galeri', icon: 'image-outline' },
              { label: 'Format', value: 'QR invite', icon: 'qrcode-scan' },
            ]}
          />
          <InlineNotice
            icon="image-outline"
            description="Memilih QR dari galeri cocok untuk screenshot atau foto undangan yang sudah pernah dibagikan sebelumnya."
            tone="primary"
          />
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
          <View style={styles.fallbackActions}>
            <Button
              label="Pilih QR dari galeri"
              onPress={handlePickFromGallery}
              variant="secondary"
              fullWidth
            />
            <Button label="Kembali" onPress={() => navigation.goBack()} variant="outline" fullWidth />
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      <View style={[styles.overlay, { paddingTop: insets.top }]} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Undangan</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.scannerStage}>
          <View style={styles.scannerFrameWrap}>
            <View style={styles.frameGlow} />
            <View style={styles.scannerBox} />
          </View>

          <LinearGradient
            colors={['rgba(6, 12, 20, 0.10)', 'rgba(6, 12, 20, 0.68)', 'rgba(6, 12, 20, 0.92)']}
            style={styles.bottomSheet}
          >
            <Text style={styles.instruction}>Arahkan kamera ke QR code undangan</Text>
            <Text style={styles.galleryHint}>Cocok untuk scan screenshot atau foto QR yang sudah tersimpan.</Text>

            <Button
              label={isPickingImage ? 'Memproses gambar...' : 'Pilih dari Galeri'}
              onPress={handlePickFromGallery}
              variant="secondary"
              loading={isPickingImage}
              fullWidth
            />

            {selectedImage ? (
              <View style={styles.selectedImageCard}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImageThumb} />
                <View style={styles.selectedImageMeta}>
                  <View style={styles.selectedImageBadge}>
                    <MaterialCommunityIcons name="image-check-outline" size={14} color={colors.primary} />
                    <Text style={styles.selectedImageBadgeText}>Siap diproses</Text>
                  </View>
                  <Text style={styles.selectedImageLabel}>Gambar QR terpilih</Text>
                  <Text style={styles.selectedImageName} numberOfLines={1}>
                    {selectedImage.fileName}
                  </Text>
                </View>
              </View>
            ) : null}
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  fallbackContent: {
    gap: 18,
  },
  fallbackContentWide: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  fallbackActions: {
    gap: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(3, 8, 14, 0.26)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textInverse,
    fontFamily: FontFamily.heading,
    fontSize: FontSize.h3,
  },
  scannerStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  scannerFrameWrap: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  frameGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bottomSheet: {
    width: '100%',
    borderRadius: 28,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  instruction: {
    color: colors.textInverse,
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.body,
  },
  galleryHint: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
  selectedImageCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  selectedImageCardFallback: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  selectedImageThumb: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
  },
  selectedImageThumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
  },
  selectedImageMeta: {
    flex: 1,
    gap: 4,
  },
  selectedImageBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  selectedImageBadgeText: {
    color: colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
  },
  selectedImageLabel: {
    color: colors.textSecondary,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
  },
  selectedImageName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.body,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalletStore } from '../../store/useWalletStore';
import { formatInputRupiah, parseRupiah } from '../../utils/currency';
import { WalletMemberList } from '../../components/wallet/WalletMemberList';
import { useTheme } from '../../store/useThemeStore';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { AppAccentPalette } from '../../constants/colors';
import { getReadableTextColor } from '../../utils/colorContrast';

const WALLET_TYPES = [
  { id: 'general', label: 'Umum', icon: 'wallet-outline' },
  { id: 'cash', label: 'Tunai', icon: 'cash' },
  { id: 'bank', label: 'Bank', icon: 'bank-outline' },
  { id: 'e-wallet', label: 'E-Wallet', icon: 'cellphone' },
];

const COLORS = [...AppAccentPalette];

export function AddWalletScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { wallets, addWallet, editWallet, loadWallets } = useWalletStore();
  const { colors, gradients, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const routeWallet = route.params?.wallet;
  const currentWallet = routeWallet ? (wallets.find((w: any) => w.id === routeWallet.id) || routeWallet) : null;
  const isEditing = !!currentWallet;

  const [name, setName] = useState(currentWallet?.name || '');
  const [type, setType] = useState(currentWallet?.type || 'general');
  const [color, setColor] = useState(currentWallet?.color || COLORS[0]);
  const [balance, setBalance] = useState(
    currentWallet ? formatInputRupiah(currentWallet.balance.toString()) : '0',
  );
  const [isDefault, setIsDefault] = useState(currentWallet?.is_default || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Perhatian', 'Nama dompet tidak boleh kosong');
      return;
    }

    try {
      setIsLoading(true);
      const balanceValue = parseRupiah(balance);

      if (isEditing) {
        await editWallet(currentWallet.id, {
          name,
          type,
          color,
          balance: balanceValue,
          is_default: isDefault,
        });
      } else {
        await addWallet({
          name,
          type,
          color,
          balance: balanceValue,
          is_default: isDefault,
        });
      }
      loadWallets();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal menyimpan dompet');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = WALLET_TYPES.find((item) => item.id === type);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bgAuraTop} pointerEvents="none" />
      <View style={styles.bgAuraBottom} pointerEvents="none" />
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{isEditing ? 'Edit Dompet' : 'Tambah Dompet'}</Text>
          <Text style={styles.subtitle}>Tentukan tipe, warna, dan konteks dompet dengan jelas.</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.headerBtn, styles.saveBtn, isLoading && { opacity: 0.5 }]}
          disabled={isLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[color, colors.primaryDark, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewCard}
        >
          <View style={styles.previewHeader}>
            <View style={styles.previewIconBadge}>
              <MaterialCommunityIcons
                name={(selectedType?.icon || 'wallet-outline') as any}
                size={24}
                color={color}
              />
            </View>
            {isDefault && (
              <View style={styles.previewDefaultBadge}>
                <MaterialCommunityIcons name="star" size={12} color={colors.textInverse} />
                <Text style={styles.previewDefaultText}>Utama</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.previewName}>{name || 'Nama Dompet'}</Text>
            <Text style={styles.previewBalance}>Rp {balance || '0'}</Text>
            <Text style={styles.previewMeta}>{selectedType?.label || 'Umum'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Dompet</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Dompet Utama"
              placeholderTextColor={colors.textDisabled}
              autoFocus={!isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Saldo Awal</Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.currencyInput}
                value={balance}
                onChangeText={(text) => setBalance(formatInputRupiah(text))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Jenis Dompet</Text>
            <View style={styles.typesRow}>
              {WALLET_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeBtn,
                    type === t.id && styles.typeBtnActive,
                    type === t.id && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
                  ]}
                  onPress={() => setType(t.id)}
                >
                  <MaterialCommunityIcons
                    name={t.icon as any}
                    size={22}
                    color={type === t.id ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      type === t.id && { color: colors.primary, fontFamily: FontFamily.bodyBold },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Warna Penanda</Text>
            <View style={styles.colorsRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c }]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <View style={styles.checkIcon}>
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={getReadableTextColor(c, {
                  light: colors.textInverse,
                  dark: colors.textPrimary,
                })}
              />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Jadikan Dompet Utama</Text>
              <Text style={styles.switchDescription}>
                Transaksi otomatis akan menggunakan dompet ini kecuali dipilih yang lain.
              </Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: colors.neutral300, true: colors.primaryLight }}
              thumbColor={isDefault ? colors.primary : colors.surfaceElevated}
            />
          </View>

          {isEditing && (
            <View style={styles.memberSection}>
              <Text style={styles.memberTitle}>Anggota Dompet</Text>
              <Text style={styles.memberHint}>Kelola akses, undangan, dan goal bersama yang terhubung.</Text>
              <WalletMemberList walletId={currentWallet.id} />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgAuraTop: {
      position: 'absolute',
      top: -100,
      right: -30,
      width: 240,
      height: 240,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primaryLight,
      opacity: 0.55,
    },
    bgAuraBottom: {
      position: 'absolute',
      bottom: 120,
      left: -60,
      width: 200,
      height: 200,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.infoBg,
      opacity: 0.26,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveBtn: {
      backgroundColor: colors.primaryBg,
      borderColor: `${colors.primary}24`,
    },
    headerCenter: { flex: 1 },
    title: { ...Typography.h3, color: colors.textPrimary },
    subtitle: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    content: { padding: 20, paddingBottom: 40, gap: 18 },
    previewCard: {
      borderRadius: BorderRadius['5xl'],
      padding: 24,
      minHeight: 160,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      shadowColor: colors.shadowColor,
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    previewIconBadge: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.xl,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewDefaultBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.18)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    previewDefaultText: {
      fontFamily: FontFamily.bodyBold,
      fontSize: 10,
      color: colors.textInverse,
    },
    previewName: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.body,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 4,
    },
    previewBalance: {
      fontFamily: FontFamily.heading,
      fontSize: 28,
      color: colors.textInverse,
    },
    previewMeta: {
      fontFamily: FontFamily.bodyMedium,
      fontSize: FontSize.caption,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    formSection: { gap: 24 },
    inputGroup: { gap: 8 },
    label: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.textSecondary },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.xl,
      padding: 16,
      fontFamily: FontFamily.body,
      fontSize: FontSize.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencyInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    currencyPrefix: {
      fontFamily: FontFamily.headingMedium,
      fontSize: FontSize.h4,
      color: colors.textSecondary,
      marginRight: 8,
    },
    currencyInput: {
      flex: 1,
      paddingVertical: 16,
      fontFamily: FontFamily.headingMedium,
      fontSize: FontSize.h4,
      color: colors.textPrimary,
    },
    typesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    typeBtn: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: colors.surfaceElevated,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeBtnActive: { borderWidth: 1.5 },
    typeText: { fontFamily: FontFamily.body, color: colors.textSecondary },
    colorsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      padding: 16,
      borderRadius: BorderRadius['3xl'],
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 1,
    },
    switchTextContainer: { flex: 1, marginRight: 16 },
    switchLabel: {
      fontFamily: FontFamily.bodyBold,
      fontSize: FontSize.body,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    switchDescription: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    memberSection: {
      gap: 8,
      padding: 16,
      borderRadius: BorderRadius['4xl'],
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 1,
    },
    memberTitle: {
      fontFamily: FontFamily.headingMedium,
      fontSize: FontSize.body,
      color: colors.textPrimary,
    },
    memberHint: {
      fontFamily: FontFamily.body,
      fontSize: FontSize.caption,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });

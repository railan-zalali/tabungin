import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../store/useThemeStore";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { useScreenLayout } from "../../hooks/useScreenLayout";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useWalletStore } from "../../store/useWalletStore";
import { CategoryPicker } from "../../components/transaction/CategoryPicker";
import { PrimaryActionBar } from "../../components/common/PrimaryActionBar";
import { formatInputRupiah, parseRupiah } from "../../utils/currency";
import { validateAmount } from "../../utils/validation";
import type { TransactionType } from "../../types/transaction";
import { BorderRadius } from "../../constants/theme";
import type { TransactionNavigationProp, TransactionStackParamList } from "../../types/navigation";

import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDateLong } from "../../utils/date";

type AddTransactionRouteProp = RouteProp<TransactionStackParamList, "AddTransaction">;

export function AddTransactionScreen() {
    const navigation = useNavigation<TransactionNavigationProp<"AddTransaction">>();
  const route = useRoute<AddTransactionRouteProp>();
  const insets = useSafeAreaInsets();
  const { stickyFooterSpacing } = useScreenLayout();
  const { addTransaction, editTransaction, getTransactionById, isLoading } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const editId = route.params?.editId as string | undefined;
  const isEditMode = Boolean(editId);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [txType, setTxType] = useState<TransactionType>(route.params?.type ?? "expense");
  const [amountInput, setAmountInput] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [isPrefilling, setIsPrefilling] = useState(false);

  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Load wallets and set default
  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (!selectedWalletId && wallets.length > 0) {
      const defaultWallet = wallets.find((w) => w.is_default);
      setSelectedWalletId(defaultWallet?.id || wallets[0].id);
    }
  }, [wallets]);

  useEffect(() => {
    let isMounted = true;

    const loadTransactionForEdit = async () => {
      if (!editId) return;

      setIsPrefilling(true);
      try {
        const transaction = await getTransactionById(editId);
        if (!transaction) {
          Alert.alert("Transaksi tidak ditemukan", "Data transaksi sudah tidak tersedia.");
          navigation.goBack();
          return;
        }

        if (!isMounted) return;

        setTxType(transaction.type);
        setAmountInput(formatInputRupiah(String(transaction.amount)));
        setCategory(transaction.category);
        setNote(transaction.note ?? "");
        setDate(new Date(transaction.date));
        setSelectedWalletId(transaction.wallet_id ?? "");
      } finally {
        if (isMounted) {
          setIsPrefilling(false);
        }
      }
    };

    loadTransactionForEdit();

    return () => {
      isMounted = false;
    };
  }, [editId, getTransactionById, navigation]);

  const amount = parseRupiah(amountInput);
  const selectedWallet = wallets.find((wallet) => wallet.id === selectedWalletId);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    let valid = true;
    const amtErr = validateAmount(amount);
    if (amtErr) {
      setAmountError(amtErr);
      valid = false;
    }
    if (!category) {
      setCategoryError("Pilih kategori terlebih dahulu");
      valid = false;
    }
    if (!selectedWalletId) {
      Alert.alert("Error", "Pilih dompet terlebih dahulu");
      valid = false;
    }

    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (isEditMode && editId) {
      await editTransaction(editId, {
        type: txType,
        amount,
        category,
        note: note.trim() || null,
        date: date.getTime(),
        wallet_id: selectedWalletId,
      });
    } else {
      await addTransaction({
        type: txType,
        amount,
        category,
        note: note.trim() || null,
        date: date.getTime(),
        wallet_id: selectedWalletId,
      });
    }

    loadWallets(); // Refresh balance

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleAmountChange = (text: string) => {
    setAmountInput(formatInputRupiah(text));
    setAmountError(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor='transparent' translucent />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name='close' size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? "Edit Transaksi" : "Tambah Transaksi"}</Text>
          <View style={{ width: 44 }} />
        </View>

        {isPrefilling ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size='large' color={colors.primary} />
            <Text style={styles.loadingText}>Memuat transaksi...</Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: stickyFooterSpacing + 8 }]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[
              colors.surface,
              `${colors.primaryLight}`,
              colors.surface,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroShine} />
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Ringkasan Transaksi</Text>
                <Text style={styles.heroTitle}>
                  {txType === "income" ? "Catat pemasukan baru" : "Catat pengeluaran baru"}
                </Text>
              </View>
              <View
                style={[
                  styles.heroIconWrap,
                  { backgroundColor: txType === "income" ? colors.success : colors.danger },
                ]}
              >
                <MaterialCommunityIcons
                  name={txType === "income" ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
                  size={26}
                  color={colors.textInverse}
                />
              </View>
            </View>

            <View style={styles.typeToggleContainer}>
              {(["income", "expense"] as TransactionType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    txType === t && (t === "income" ? styles.typeBtnIncome : styles.typeBtnExpense),
                  ]}
                  onPress={() => {
                    setTxType(t);
                    setCategory("");
                    setAmountError(null);
                  }}
                >
                  <MaterialCommunityIcons
                    name={t === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                    size={20}
                    color={txType === t ? colors.textInverse : colors.textSecondary}
                  />
                  <Text style={[styles.typeBtnText, txType === t && { color: colors.textInverse }]}>
                    {t === "income" ? "Pemasukan" : "Pengeluaran"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.fieldLabel}>Nominal</Text>
              <View style={[styles.amountContainer, amountError ? styles.amountError : null]}>
                <Text style={styles.currencyPrefix}>Rp</Text>
                <TextInput
                  style={[styles.amountInput, { fontSize: amountInput.length > 10 ? 24 : 32 }]}
                  value={amountInput}
                  onChangeText={handleAmountChange}
                  keyboardType='numeric'
                  placeholder='0'
                  placeholderTextColor={colors.textDisabled}
                  autoFocus={true}
                />
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaChip}>
                  <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.heroMetaText}>{selectedWallet?.name ?? "Pilih dompet"}</Text>
                </View>
                <View style={styles.heroMetaChip}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.heroMetaText}>{formatDateLong(date.getTime())}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {amountError && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name='alert-circle' size={14} color={colors.danger} />
              <Text style={styles.errorText}>{amountError}</Text>
            </View>
          )}

          {/* Date Picker */}
          <View style={styles.glassSection}>
            <Text style={styles.fieldLabel}>Tanggal</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <MaterialCommunityIcons name='calendar' size={20} color={colors.textPrimary} />
              <Text style={styles.dateText}>{formatDateLong(date.getTime())}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode='date'
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()} // Prevent future dates? Usually good for transactions.
              />
            )}
          </View>

          {/* Wallet Picker */}
          <View style={styles.glassSection}>
            <Text style={styles.fieldLabel}>Dompet</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.walletList}
            >
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                    style={[
                      styles.walletBtn,
                      selectedWalletId === w.id && styles.walletBtnActive,
                      { borderColor: selectedWalletId === w.id ? w.color : colors.border },
                    ]}
                  onPress={() => setSelectedWalletId(w.id)}
                >
                  <View
                    style={[
                      styles.walletIconBg,
                      { backgroundColor: selectedWalletId === w.id ? w.color : colors.surfaceAlt },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        w.type === "bank" ? "bank" : w.type === "e-wallet" ? "cellphone" : "wallet"
                      }
                      size={16}
                      color={selectedWalletId === w.id ? colors.textInverse : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.walletBtnText,
                      selectedWalletId === w.id && {
                        color: colors.textPrimary,
                        fontFamily: FontFamily.bodyBold,
                      },
                    ]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Category Picker */}
          <View style={styles.glassSection}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Kategori</Text>
              {categoryError && <Text style={styles.errorTextInline}>{categoryError}</Text>}
            </View>
            <CategoryPicker
              type={txType}
              selectedCategory={category}
              onSelect={(c) => {
                setCategory(c);
                setCategoryError(null);
              }}
            />
          </View>

          {/* Catatan */}
          <View style={styles.glassSection}>
            <Text style={styles.fieldLabel}>Catatan (opsional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder='Tulis catatan...'
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
        )}

        {/* Footer Button */}
        <PrimaryActionBar
          primaryLabel={isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
          onPrimaryPress={handleSave}
          primaryLoading={isLoading}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  bgOrbTop: {
    position: "absolute",
    top: -80,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: BorderRadius.full,
    backgroundColor: `${colors.primary}1A`,
  },
  bgOrbBottom: {
    position: "absolute",
    bottom: 140,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: BorderRadius.full,
    backgroundColor: `${colors.info}14`,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeBtn: { padding: 4 },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },

  content: { padding: 20, gap: 18, paddingBottom: 40 },
    heroCard: {
    borderRadius: BorderRadius['4xl'],
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 5,
  },
    heroShine: {
    position: "absolute",
    top: -36,
    right: -18,
    width: 130,
    height: 130,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  heroLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
    color: colors.textPrimary,
    marginTop: 6,
  },
    heroIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },

  typeToggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius['3xl'],
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  typeBtnIncome: { backgroundColor: colors.success },
  typeBtnExpense: { backgroundColor: colors.danger },
  typeBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },

  amountSection: { gap: 8 },
  fieldSection: { gap: 12 },
  glassSection: {
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  fieldLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroMetaText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },
  amountError: { borderColor: colors.danger, borderWidth: 1 },
  currencyPrefix: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.heading,
    fontSize: 32,
    color: colors.textPrimary,
    padding: 0,
    height: 40,
  },

  walletList: { flexDirection: "row", gap: 12 },
  walletBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 16,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  walletBtnActive: { backgroundColor: colors.primaryBg, borderWidth: 1.5 },
  walletIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.textSecondary,
  },

  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorTextInline: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: colors.danger,
  },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  errorText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.danger },

  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: BorderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  dateText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    color: colors.textPrimary,
  },

  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius['3xl'],
    padding: 16,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: colors.textSecondary,
  },
});

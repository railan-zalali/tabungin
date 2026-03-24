import React, { useState, useEffect } from "react";
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize, Typography } from "../../constants/typography";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useWalletStore } from "../../store/useWalletStore";
import { CategoryPicker } from "../../components/transaction/CategoryPicker";
import { Button } from "../../components/common/Button";
import { formatInputRupiah, parseRupiah } from "../../utils/currency";
import { validateAmount } from "../../utils/validation";
import type { TransactionType } from "../../types/transaction";
import { Shadow } from "../../constants/theme";

import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDateLong } from "../../utils/date";

export function AddTransactionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { addTransaction, editTransaction, getTransactionById, isLoading } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();
  const editId = route.params?.editId as string | undefined;
  const isEditMode = Boolean(editId);

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
  }, []);

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
      <StatusBar barStyle='dark-content' backgroundColor='transparent' translucent />
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
            <MaterialCommunityIcons name='close' size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? "Edit Transaksi" : "Tambah Transaksi"}</Text>
          <View style={{ width: 44 }} />
        </View>

        {isPrefilling ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size='large' color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat transaksi...</Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.92)", `${Colors.primaryLight}`, "rgba(255,255,255,0.88)"]}
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
                  { backgroundColor: txType === "income" ? Colors.success : Colors.danger },
                ]}
              >
                <MaterialCommunityIcons
                  name={txType === "income" ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
                  size={26}
                  color="#FFF"
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
                    color={txType === t ? Colors.textInverse : Colors.textSecondary}
                  />
                  <Text style={[styles.typeBtnText, txType === t && { color: Colors.textInverse }]}>
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
                  placeholderTextColor={Colors.textDisabled}
                  autoFocus={true}
                />
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaChip}>
                  <MaterialCommunityIcons name="wallet-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.heroMetaText}>{selectedWallet?.name ?? "Pilih dompet"}</Text>
                </View>
                <View style={styles.heroMetaChip}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.heroMetaText}>{formatDateLong(date.getTime())}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {amountError && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name='alert-circle' size={14} color={Colors.danger} />
              <Text style={styles.errorText}>{amountError}</Text>
            </View>
          )}

          {/* Date Picker */}
          <View style={styles.glassSection}>
            <Text style={styles.fieldLabel}>Tanggal</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <MaterialCommunityIcons name='calendar' size={20} color={Colors.textPrimary} />
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
                    { borderColor: selectedWalletId === w.id ? w.color : Colors.border },
                  ]}
                  onPress={() => setSelectedWalletId(w.id)}
                >
                  <View
                    style={[
                      styles.walletIconBg,
                      { backgroundColor: selectedWalletId === w.id ? w.color : Colors.surfaceAlt },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        w.type === "bank" ? "bank" : w.type === "e-wallet" ? "cellphone" : "wallet"
                      }
                      size={16}
                      color={selectedWalletId === w.id ? "#FFF" : Colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.walletBtnText,
                      selectedWalletId === w.id && {
                        color: Colors.textPrimary,
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
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
        )}

        {/* Footer Button */}
        <View style={styles.footer}>
          <Button
            label={isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            onPress={handleSave}
            variant='primary'
            size='lg'
            loading={isLoading}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  bgOrbTop: {
    position: "absolute",
    top: -80,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(22, 163, 74, 0.10)",
  },
  bgOrbBottom: {
    position: "absolute",
    bottom: 140,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  closeBtn: { padding: 4 },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary },

  content: { padding: 20, gap: 18, paddingBottom: 40 },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...Shadow.md,
  },
  heroShine: {
    position: "absolute",
    top: -36,
    right: -18,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.35)",
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
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
    color: Colors.textPrimary,
    marginTop: 6,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },

  typeToggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 18,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeBtnIncome: { backgroundColor: Colors.success },
  typeBtnExpense: { backgroundColor: Colors.danger },
  typeBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },

  amountSection: { gap: 8 },
  fieldSection: { gap: 12 },
  glassSection: {
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(229,231,235,0.9)",
    padding: 18,
    ...Shadow.sm,
  },
  fieldLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Shadow.sm,
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
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(229,231,235,0.9)",
  },
  heroMetaText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  amountError: { borderColor: Colors.danger, borderWidth: 1 },
  currencyPrefix: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h3,
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.heading,
    fontSize: 32,
    color: Colors.textPrimary,
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
    borderRadius: 100,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  walletBtnActive: { backgroundColor: Colors.surface, borderWidth: 1.5 },
  walletIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  walletBtnText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },

  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorTextInline: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.caption,
    color: Colors.danger,
  },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  errorText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.danger },

  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  dateText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },

  noteInput: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 16,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.88)",
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
    color: Colors.textSecondary,
  },
});

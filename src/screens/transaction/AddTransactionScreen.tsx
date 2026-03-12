// Add Transaction Screen — Bottom Sheet form dengan numpad dan category picker
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { useTransactionStore } from "../../store/useTransactionStore";
import { useWalletStore } from "../../store/useWalletStore";
import { CategoryPicker } from "../../components/transaction/CategoryPicker";
import { Button } from "../../components/common/Button";
import { formatRupiah, formatInputRupiah, parseRupiah } from "../../utils/currency";
import { validateAmount } from "../../utils/validation";
import type { TransactionType } from "../../types/transaction";

export function AddTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { addTransaction, isLoading } = useTransactionStore();
  const { wallets, loadWallets } = useWalletStore();

  const [txType, setTxType] = useState<TransactionType>(route.params?.type ?? "expense");
  const [amountInput, setAmountInput] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date] = useState(Date.now());
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Load wallets and set default
  React.useEffect(() => {
    loadWallets();
  }, []);

  React.useEffect(() => {
    if (!selectedWalletId && wallets.length > 0) {
      const defaultWallet = wallets.find((w) => w.is_default);
      setSelectedWalletId(defaultWallet?.id || wallets[0].id);
    }
  }, [wallets]);

  const amount = parseRupiah(amountInput);

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

    await addTransaction({
      type: txType,
      amount,
      category,
      note: note.trim() || null,
      date,
      wallet_id: selectedWalletId, // Pastikan properti ini ada di interface Transaction
    });

    // Refresh wallets to update balance
    loadWallets();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleAmountChange = (text: string) => {
    setAmountInput(formatInputRupiah(text));
    setAmountError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
            accessible={true}
            accessibilityRole='button'
            accessibilityLabel='Tutup form'
          >
            <MaterialCommunityIcons name='close' size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={true} accessibilityRole='header'>
            Tambah Transaksi
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
          {/* Toggle Pemasukan / Pengeluaran */}
          <View style={styles.typeToggle} accessibilityRole='tablist'>
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
                }}
                accessible={true}
                accessibilityRole='tab'
                accessibilityLabel={t === "income" ? "Pemasukan" : "Pengeluaran"}
                accessibilityState={{ selected: txType === t }}
              >
                <MaterialCommunityIcons
                  name={t === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                  size={18}
                  color={txType === t ? Colors.textInverse : Colors.textSecondary}
                  accessibilityElementsHidden={true}
                />
                <Text
                  style={[styles.typeBtnText, txType === t && { color: Colors.textInverse }]}
                  allowFontScaling={true}
                >
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Wallet Picker */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel} allowFontScaling={true}>
              Dompet
            </Text>
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
                  <MaterialCommunityIcons
                    name={
                      w.type === "bank" ? "bank" : w.type === "e-wallet" ? "cellphone" : "wallet"
                    }
                    size={18}
                    color={selectedWalletId === w.id ? w.color : Colors.textSecondary}
                  />
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

          {/* Input Nominal */}
          <View style={styles.amountSection}>
            <Text style={styles.fieldLabel} allowFontScaling={true}>
              Nominal
            </Text>
            <View style={[styles.amountContainer, amountError ? styles.amountError : null]}>
              <Text style={styles.currencyPrefix} allowFontScaling={true}>
                Rp
              </Text>
              <TextInput
                style={styles.amountInput}
                value={amountInput}
                onChangeText={handleAmountChange}
                keyboardType='numeric'
                placeholder='0'
                placeholderTextColor={Colors.textDisabled}
                accessible={true}
                accessibilityLabel='Nominal transaksi dalam Rupiah'
                accessibilityHint='Masukkan jumlah uang'
                allowFontScaling={true}
              />
            </View>
            {amountError && (
              <View style={styles.errorRow} accessibilityLiveRegion='polite'>
                <MaterialCommunityIcons
                  name='alert-circle'
                  size={14}
                  color={Colors.danger}
                  accessibilityElementsHidden={true}
                />
                <Text style={styles.errorText} allowFontScaling={true} accessibilityRole='alert'>
                  {amountError}
                </Text>
              </View>
            )}
          </View>

          {/* Category Picker */}
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel} allowFontScaling={true}>
              Kategori
            </Text>
            {categoryError && (
              <View style={styles.errorRow} accessibilityLiveRegion='polite'>
                <MaterialCommunityIcons
                  name='alert-circle'
                  size={14}
                  color={Colors.danger}
                  accessibilityElementsHidden={true}
                />
                <Text style={styles.errorText} allowFontScaling={true} accessibilityRole='alert'>
                  {categoryError}
                </Text>
              </View>
            )}
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
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel} allowFontScaling={true}>
              Catatan (opsional)
            </Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder='Tambahkan keterangan...'
              placeholderTextColor={Colors.textDisabled}
              multiline
              numberOfLines={3}
              accessible={true}
              accessibilityLabel='Catatan tambahan untuk transaksi'
              allowFontScaling={true}
            />
          </View>
        </ScrollView>

        {/* Tombol Simpan */}
        <View style={styles.footer}>
          <Button
            label={`Simpan ${txType === "income" ? "Pemasukan" : "Pengeluaran"}`}
            onPress={handleSave}
            variant='primary'
            size='lg'
            loading={isLoading}
            fullWidth
            accessibilityHint='Ketuk dua kali untuk menyimpan transaksi'
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.h4,
    color: Colors.textPrimary,
  },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
    minHeight: 48,
  },
  typeBtnIncome: { backgroundColor: Colors.success },
  typeBtnExpense: { backgroundColor: Colors.danger },
  typeBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  amountSection: { gap: 8 },
  fieldSection: { gap: 10 },
  fieldLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 8,
  },
  amountError: { borderColor: Colors.danger },
  currencyPrefix: { fontFamily: FontFamily.bodyBold, fontSize: 22, color: Colors.textSecondary },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.heading,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: Colors.danger },
  noteInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    minHeight: 88,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});

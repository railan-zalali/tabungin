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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

export function AddTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
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
  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
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
      wallet_id: selectedWalletId,
    });

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
          <Text style={styles.headerTitle}>Tambah Transaksi</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* Toggle Pemasukan / Pengeluaran */}
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
                  setAmountInput("");
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

          {/* Input Nominal */}
          <View style={styles.amountSection}>
            <Text style={styles.fieldLabel}>Nominal</Text>
            <View style={[styles.amountContainer, amountError ? styles.amountError : null]}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.amountInput}
                value={amountInput}
                onChangeText={handleAmountChange}
                keyboardType='numeric'
                placeholder='0'
                placeholderTextColor={Colors.textDisabled}
                autoFocus={true}
              />
            </View>
            {amountError && (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name='alert-circle' size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{amountError}</Text>
              </View>
            )}
          </View>

          {/* Wallet Picker */}
          <View style={styles.fieldSection}>
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
          <View style={styles.fieldSection}>
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
          <View style={styles.fieldSection}>
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

        {/* Footer Button */}
        <View style={styles.footer}>
          <Button
            label='Simpan Transaksi'
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

  content: { padding: 20, gap: 24, paddingBottom: 40 },

  typeToggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Shadow.sm,
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
    backgroundColor: Colors.surface,
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

  noteInput: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
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
    backgroundColor: Colors.surface,
  },
});

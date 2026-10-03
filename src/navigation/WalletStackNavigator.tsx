import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { WalletStackParamList } from "../types/navigation";
import { withScreenErrorBoundary } from "../components/common/AppErrorBoundary";

import { WalletListScreen } from "../screens/settings/WalletListScreen";
import { QRScannerScreen } from "../screens/wallet/QRScannerScreen";
import { AddWalletScreen } from "../screens/settings/AddWalletScreen";
import { JoinWalletScreen } from "../screens/wallet/JoinWalletScreen";

// Di-hoist ke module scope agar tipe komponen stabil (tidak remount tiap render).
const WalletList = withScreenErrorBoundary(WalletListScreen);
const AddWallet = withScreenErrorBoundary(AddWalletScreen);
const QRScanner = withScreenErrorBoundary(QRScannerScreen);
const JoinWallet = withScreenErrorBoundary(JoinWalletScreen);

const Stack = createNativeStackNavigator<WalletStackParamList>();

export function WalletStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='WalletList' component={WalletList} />
      <Stack.Screen name='AddWallet' component={AddWallet} />
      <Stack.Screen name='QRScanner' component={QRScanner} />
      <Stack.Screen name='JoinWallet' component={JoinWallet} />
    </Stack.Navigator>
  );
}

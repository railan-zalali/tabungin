import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { WalletStackParamList } from "../types/navigation";

import { WalletListScreen } from "../screens/settings/WalletListScreen";
import { QRScannerScreen } from "../screens/wallet/QRScannerScreen";
import { AddWalletScreen } from "../screens/settings/AddWalletScreen";
import { JoinWalletScreen } from "../screens/wallet/JoinWalletScreen";

const Stack = createNativeStackNavigator<WalletStackParamList>();

export function WalletStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='WalletList' component={WalletListScreen} />
      <Stack.Screen name='AddWallet' component={AddWalletScreen} />
      <Stack.Screen name='QRScanner' component={QRScannerScreen} />
      <Stack.Screen name='JoinWallet' component={JoinWalletScreen} />
    </Stack.Navigator>
  );
}

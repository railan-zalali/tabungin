import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';

import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { WalletListScreen } from '../screens/settings/WalletListScreen';
import { AddWalletScreen } from '../screens/settings/AddWalletScreen';
import { QRScannerScreen } from '../screens/wallet/QRScannerScreen';
import { JoinWalletScreen } from '../screens/wallet/JoinWalletScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SettingsMain" component={SettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="WalletList" component={WalletListScreen} />
            <Stack.Screen name="AddWallet" component={AddWalletScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="JoinWallet" component={JoinWalletScreen} />
        </Stack.Navigator>
    );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WalletStackParamList } from '../types/navigation';

import { WalletListScreen } from '../screens/settings/WalletListScreen';
import { AddWalletScreen } from '../screens/settings/AddWalletScreen';

const Stack = createNativeStackNavigator<WalletStackParamList>();

export function WalletStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="WalletList" component={WalletListScreen} />
            <Stack.Screen name="AddWallet" component={AddWalletScreen} />
        </Stack.Navigator>
    );
}

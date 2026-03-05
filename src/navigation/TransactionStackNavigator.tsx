// Stack navigators untuk Transaction, Saving, Settings
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionStackParamList, SavingStackParamList, SettingsStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import { FontFamily } from '../constants/typography';

import { TransactionListScreen } from '../screens/transaction/TransactionListScreen';
import { AddTransactionScreen } from '../screens/transaction/AddTransactionScreen';
import { TransactionDetailScreen } from '../screens/transaction/TransactionDetailScreen';
import { SavingListScreen } from '../screens/saving/SavingListScreen';
import { AddSavingGoalScreen } from '../screens/saving/AddSavingGoalScreen';
import { SavingDetailScreen } from '../screens/saving/SavingDetailScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';

const TxStack = createNativeStackNavigator<TransactionStackParamList>();
export function TransactionStackNavigator() {
    return (
        <TxStack.Navigator screenOptions={{ headerShown: false }}>
            <TxStack.Screen name="TransactionList" component={TransactionListScreen} />
            <TxStack.Screen name="AddTransaction" component={AddTransactionScreen} />
            <TxStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
        </TxStack.Navigator>
    );
}

const SavStack = createNativeStackNavigator<SavingStackParamList>();
export function SavingStackNavigator() {
    return (
        <SavStack.Navigator screenOptions={{ headerShown: false }}>
            <SavStack.Screen name="SavingList" component={SavingListScreen} />
            <SavStack.Screen name="AddSavingGoal" component={AddSavingGoalScreen} />
            <SavStack.Screen name="SavingDetail" component={SavingDetailScreen} />
        </SavStack.Navigator>
    );
}

const SetStack = createNativeStackNavigator<SettingsStackParamList>();
export function SettingsStackNavigator() {
    return (
        <SetStack.Navigator screenOptions={{ headerShown: false }}>
            <SetStack.Screen name="SettingsMain" component={SettingsScreen} />
            <SetStack.Screen name="Profile" component={ProfileScreen} />
        </SetStack.Navigator>
    );
}

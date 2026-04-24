import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionStackParamList } from '../types/navigation';
import { TransactionListScreen } from '../screens/transaction/TransactionListScreen';
import { AddTransactionScreen } from '../screens/transaction/AddTransactionScreen';
import { TransactionDetailScreen } from '../screens/transaction/TransactionDetailScreen';
import { RecurringTransactionScreen } from '../screens/transaction/RecurringTransactionScreen';

const Stack = createNativeStackNavigator<TransactionStackParamList>();

export function TransactionStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="TransactionList" component={TransactionListScreen} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="RecurringTransaction" component={RecurringTransactionScreen} />
        </Stack.Navigator>
    );
}

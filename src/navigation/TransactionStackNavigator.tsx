import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TransactionStackParamList } from '../types/navigation';
import { withScreenErrorBoundary } from '../components/common/AppErrorBoundary';
import { TransactionListScreen } from '../screens/transaction/TransactionListScreen';
import { AddTransactionScreen } from '../screens/transaction/AddTransactionScreen';
import { TransactionDetailScreen } from '../screens/transaction/TransactionDetailScreen';
import { RecurringTransactionScreen } from '../screens/transaction/RecurringTransactionScreen';

// Di-hoist ke module scope agar tipe komponen stabil (tidak remount tiap render).
const TransactionList = withScreenErrorBoundary(TransactionListScreen);
const AddTransaction = withScreenErrorBoundary(AddTransactionScreen);
const TransactionDetail = withScreenErrorBoundary(TransactionDetailScreen);
const RecurringTransaction = withScreenErrorBoundary(RecurringTransactionScreen);

const Stack = createNativeStackNavigator<TransactionStackParamList>();

export function TransactionStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="TransactionList" component={TransactionList} />
            <Stack.Screen name="AddTransaction" component={AddTransaction} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetail} />
            <Stack.Screen name="RecurringTransaction" component={RecurringTransaction} />
        </Stack.Navigator>
    );
}

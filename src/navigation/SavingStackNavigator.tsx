import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SavingStackParamList } from '../types/navigation';
import { withScreenErrorBoundary } from '../components/common/AppErrorBoundary';

import { SavingListScreen } from '../screens/saving/SavingListScreen';
import { AddSavingGoalScreen } from '../screens/saving/AddSavingGoalScreen';
import { SavingDetailScreen } from '../screens/saving/SavingDetailScreen';

// Di-hoist ke module scope agar tipe komponen stabil (tidak remount tiap render).
const SavingList = withScreenErrorBoundary(SavingListScreen);
const AddSavingGoal = withScreenErrorBoundary(AddSavingGoalScreen);
const SavingDetail = withScreenErrorBoundary(SavingDetailScreen);

const Stack = createNativeStackNavigator<SavingStackParamList>();

export function SavingStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SavingList" component={SavingList} />
            <Stack.Screen name="AddSavingGoal" component={AddSavingGoal} />
            <Stack.Screen name="SavingDetail" component={SavingDetail} />
        </Stack.Navigator>
    );
}

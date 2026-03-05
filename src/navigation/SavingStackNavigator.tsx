import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SavingStackParamList } from '../types/navigation';

import { SavingListScreen } from '../screens/saving/SavingListScreen';
import { AddSavingGoalScreen } from '../screens/saving/AddSavingGoalScreen';
import { SavingDetailScreen } from '../screens/saving/SavingDetailScreen';

const Stack = createNativeStackNavigator<SavingStackParamList>();

export function SavingStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SavingList" component={SavingListScreen} />
            <Stack.Screen name="AddSavingGoal" component={AddSavingGoalScreen} />
            <Stack.Screen name="SavingDetail" component={SavingDetailScreen} />
        </Stack.Navigator>
    );
}

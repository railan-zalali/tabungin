// Root navigator — menentukan apakah onboarding / auth / main
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import type { RootStackParamList } from '../types/navigation';

import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { TabNavigator } from './TabNavigator';
import { SavingStackNavigator } from './SavingStackNavigator';
import { BudgetScreen } from '../screens/budget/BudgetScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
    const { isLoggedIn, loadSession, isLoading } = useAuthStore();

    useEffect(() => {
        loadSession();
    }, []);

    if (isLoading) return null;

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!isLoggedIn ? (
                <>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={TabNavigator} />
                    <Stack.Screen name="Budget" component={BudgetScreen} />
                    <Stack.Screen name="Savings" component={SavingStackNavigator} />
                </>
            )}
        </Stack.Navigator>
    );
}

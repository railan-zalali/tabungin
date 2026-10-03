// Root navigator — menentukan apakah onboarding / auth / main
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/useThemeStore';
import type { RootStackParamList } from '../types/navigation';

import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { TabNavigator } from './TabNavigator';
import { SavingStackNavigator } from './SavingStackNavigator';
import { BudgetScreen } from '../screens/budget/BudgetScreen';
import { withScreenErrorBoundary } from '../components/common/AppErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Bungkus leaf screen; container navigator dibungkus juga agar crash
// di dalam satu stack tidak membawa seluruh navigator.
const Screen = {
    Onboarding: withScreenErrorBoundary(OnboardingScreen),
    Login: withScreenErrorBoundary(LoginScreen),
    Register: withScreenErrorBoundary(RegisterScreen),
    ForgotPassword: withScreenErrorBoundary(ForgotPasswordScreen),
    Main: TabNavigator,
    Budget: withScreenErrorBoundary(BudgetScreen),
    Savings: SavingStackNavigator,
};

export function RootNavigator() {
    const { isLoggedIn, loadSession, isLoading } = useAuthStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    if (isLoading) {
        return (
            <View style={styles.loadingRoot} accessibilityLabel="Memuat sesi pengguna">
                <Text style={styles.loadingTitle}>Tabungin</Text>
                <Text style={styles.loadingSubtitle}>Menyiapkan sesi dan sinkronisasi data</Text>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!isLoggedIn ? (
                <>
                    <Stack.Screen name="Onboarding" component={Screen.Onboarding} />
                    <Stack.Screen name="Login" component={Screen.Login} />
                    <Stack.Screen name="Register" component={Screen.Register} />
                    <Stack.Screen name="ForgotPassword" component={Screen.ForgotPassword} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={Screen.Main} />
                    <Stack.Screen name="Budget" component={Screen.Budget} />
                    <Stack.Screen name="Savings" component={Screen.Savings} />
                </>
            )}
        </Stack.Navigator>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        loadingRoot: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            backgroundColor: colors.background,
            paddingHorizontal: 24,
        },
        loadingTitle: {
            fontSize: 30,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: -0.6,
        },
        loadingSubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: 'center',
        },
    });

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
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { TabNavigator } from './TabNavigator';
import { SavingStackNavigator } from './SavingStackNavigator';
import { BudgetScreen } from '../screens/budget/BudgetScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
}

const getStyles = (colors: any) =>
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

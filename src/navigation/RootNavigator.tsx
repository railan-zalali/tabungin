// Root navigator — menentukan apakah onboarding / auth / main
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/useThemeStore';
import type { RootStackParamList } from '../types/navigation';

import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { AuthCallbackScreen } from '../screens/auth/AuthCallbackScreen';
import { GuestDataMergeScreen } from '../screens/auth/GuestDataMergeScreen';
import { WebEntryScreen } from '../screens/web/WebEntryScreen';
import { TabNavigator } from './TabNavigator';
import { SavingStackNavigator } from './SavingStackNavigator';
import { BudgetScreen } from '../screens/budget/BudgetScreen';
import { rescheduleCrossFeatureReminders } from '../utils/notificationService';
import { checkForAppUpdate } from '../utils/updateService';

const Stack = createNativeStackNavigator<RootStackParamList>();
const EntryScreenComponent = Platform.OS === 'web' ? WebEntryScreen : OnboardingScreen;

export function RootNavigator() {
    const { hasAppAccess, loadSession, isLoading, pendingGuestMergeResolution, postAuthRedirect } = useAuthStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    useEffect(() => {
        if (!hasAppAccess) return;

        rescheduleCrossFeatureReminders().catch((error) => {
            console.warn('[Startup] Failed to reschedule cross-feature reminders:', error);
        });
        checkForAppUpdate().catch((error) => {
            console.warn('[Startup] Failed to check app update:', error);
        });
    }, [hasAppAccess]);

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
            {!hasAppAccess ? (
                <>
                    <Stack.Screen name="Onboarding" component={EntryScreenComponent} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
                </>
            ) : pendingGuestMergeResolution ? (
                <>
                    <Stack.Screen name="GuestDataMerge" component={GuestDataMergeScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={TabNavigator} initialParams={postAuthRedirect ?? undefined} />
                    <Stack.Screen name="Budget" component={BudgetScreen} />
                    <Stack.Screen name="Savings" component={SavingStackNavigator} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
                </>
            )}
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

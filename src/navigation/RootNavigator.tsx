// Root navigator — menentukan apakah onboarding / auth / main
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    AppState,
    type AppStateStatus,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/useThemeStore';
import { useRecurringAutoGenerator } from '../hooks/useRecurringAutoGenerator';
import { usePushNotifications } from '../hooks/usePushNotifications';
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
    const { isLoggedIn, loadSession, isLoading, biometricEnabled, authenticateWithBiometric } = useAuthStore();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    // Menjalankan auto-generator jika user login
    useRecurringAutoGenerator();

    // Mendaftarkan push token jika user login
    usePushNotifications();

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    // Ref agar listener AppState tidak perlu subscribe ulang setiap
    // isAuthenticating berubah, dan tidak mengunci di tengah prompt biometrik.
    const isAuthenticatingRef = useRef(false);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    // Kunci ulang saat app tidak lagi aktif (background / app switcher /
    // Control Center). Tanpa ini app terbuka selamanya setelah unlock pertama.
    useEffect(() => {
        if (!isLoggedIn || !biometricEnabled) return;

        const handleAppStateChange = (state: AppStateStatus) => {
            if (state !== 'background' && state !== 'inactive') return;
            if (isAuthenticatingRef.current) return;
            setIsUnlocked(false);
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [isLoggedIn, biometricEnabled]);

    useEffect(() => {
        // Jika tidak login, atau tidak menggunakan biometrik, otomatis unlock
        if (!isLoggedIn || !biometricEnabled) {
            setIsUnlocked(true);
            return;
        }

        // Kalau login, biometrik aktif, dan belum unlock, coba autentikasi
        if (isLoggedIn && biometricEnabled && !isUnlocked && !isAuthenticating) {
            const auth = async () => {
                setIsAuthenticating(true);
                isAuthenticatingRef.current = true;
                const success = await authenticateWithBiometric();
                if (success) {
                    setIsUnlocked(true);
                }
                setIsAuthenticating(false);
                isAuthenticatingRef.current = false;
            };
            auth();
        }
    }, [isLoggedIn, biometricEnabled, isUnlocked, isAuthenticating, authenticateWithBiometric]);

    if (isLoading) {
        return (
            <View style={styles.loadingRoot} accessibilityLabel="Memuat sesi pengguna">
                <Text style={styles.loadingTitle}>Tabungin</Text>
                <Text style={styles.loadingSubtitle}>Menyiapkan sesi dan sinkronisasi data</Text>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isLoggedIn && biometricEnabled && !isUnlocked) {
        return (
            <View style={[styles.loadingRoot, { justifyContent: 'center' }]}>
                <View style={[styles.lockIconWrap, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons name="lock-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.loadingTitle, { marginTop: 24 }]}>Aplikasi Terkunci</Text>
                <Text style={[styles.loadingSubtitle, { marginBottom: 32 }]}>
                    Gunakan biometrik untuk membuka Tabungin.
                </Text>
                <TouchableOpacity
                    style={[styles.unlockButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                        setIsAuthenticating(true);
                        isAuthenticatingRef.current = true;
                        const success = await authenticateWithBiometric();
                        if (success) setIsUnlocked(true);
                        setIsAuthenticating(false);
                        isAuthenticatingRef.current = false;
                    }}
                >
                    <Text style={styles.unlockButtonText}>Buka Aplikasi</Text>
                </TouchableOpacity>
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
            marginTop: 8,
            marginBottom: 24,
            paddingHorizontal: 40,
        },
        lockIconWrap: {
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
        },
        unlockButton: {
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 16,
        },
        unlockButtonText: {
            color: colors.textInverse,
            fontSize: 16,
            fontWeight: '600',
        },
    });

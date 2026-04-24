import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import {
    useFonts,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initDatabase } from './src/database/schema';
import { linking } from './src/navigation/LinkingConfiguration';
import { useTheme } from './src/store/useThemeStore';

export default function App() {
    const { colors, gradients, isDark } = useTheme();
    const [dbReady, setDbReady] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [dbInitAttempt, setDbInitAttempt] = useState(0);

    const [fontsLoaded, fontError] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_700Bold,
    });

    useEffect(() => {
        let isMounted = true;

        async function setupDatabase() {
            try {
                setDbError(null);
                await initDatabase();

                if (isMounted) {
                    setDbReady(true);
                }
            } catch (error) {
                console.error('Gagal menginisialisasi database:', error);

                if (isMounted) {
                    setDbReady(false);
                    setDbError('Gagal memuat database. Coba lagi untuk melanjutkan.');
                }
            }
        }

        setupDatabase();

        return () => {
            isMounted = false;
        };
    }, [dbInitAttempt]);

    const navigationTheme = React.useMemo(
        () => ({
            ...DefaultTheme,
            dark: isDark,
            colors: {
                ...DefaultTheme.colors,
                primary: colors.primary,
                background: colors.background,
                card: colors.surfaceElevated,
                text: colors.textPrimary,
                border: colors.border,
                notification: colors.danger,
            },
        }),
        [colors, isDark],
    );

    const handleRetryDatabase = () => {
        setDbReady(false);
        setDbError(null);
        setDbInitAttempt((current) => current + 1);
    };

    if ((!fontsLoaded && !fontError) || !dbReady) {
        return (
            <LinearGradient
                colors={gradients.hero as unknown as [string, string, ...string[]]}
                style={[styles.loadingContainer, { backgroundColor: colors.background }]}
            >
                <View style={[styles.loadingGlowTop, { backgroundColor: colors.primaryLight }]} pointerEvents="none" />
                <View style={[styles.loadingGlowBottom, { backgroundColor: colors.infoBg }]} pointerEvents="none" />

                <View
                    style={[
                        styles.loadingCard,
                        {
                            backgroundColor: colors.surfaceGlass,
                            borderColor: colors.glassStroke,
                            shadowColor: colors.shadowColor,
                        },
                    ]}
                    accessibilityLabel="Memuat aplikasi Tabungin"
                >
                    <View style={styles.logoContainer}>
                        <View style={[styles.logoIconWrap, { backgroundColor: colors.primaryBg }]}>
                            <MaterialCommunityIcons name="piggy-bank-outline" size={44} color={colors.primary} />
                        </View>
                        <Text style={[styles.appName, { color: colors.textPrimary }]} allowFontScaling={false}>
                            Tabungin
                        </Text>
                        <Text style={[styles.tagline, { color: colors.textSecondary }]} allowFontScaling={false}>
                            Catat, Kelola, Wujudkan
                        </Text>
                    </View>

                    <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Sedang memuat" />

                    {dbError ? (
                        <View style={styles.errorContainer}>
                            <Text style={[styles.errorText, { color: colors.danger }]} allowFontScaling={false}>
                                {dbError}
                            </Text>
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                onPress={handleRetryDatabase}
                                accessibilityRole="button"
                                accessibilityLabel="Coba lagi memuat database"
                            >
                                <Text style={styles.retryButtonText} allowFontScaling={false}>
                                    Coba Lagi
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {fontError ? (
                        <Text style={[styles.errorText, { color: colors.danger }]} allowFontScaling={false}>
                            Gagal memuat font.
                        </Text>
                    ) : null}
                </View>
            </LinearGradient>
        );
    }

    return (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaProvider>
                <NavigationContainer linking={linking as any} theme={navigationTheme}>
                    <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent />
                    <RootNavigator />
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingGlowTop: {
        position: 'absolute',
        top: -90,
        right: -40,
        width: 220,
        height: 220,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    loadingGlowBottom: {
        position: 'absolute',
        left: -60,
        bottom: 120,
        width: 180,
        height: 180,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    loadingCard: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        gap: 28,
        paddingVertical: 36,
        paddingHorizontal: 28,
        borderRadius: 32,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 10,
    },
    logoContainer: { alignItems: 'center', gap: 10 },
    logoIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 15,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    errorContainer: {
        alignItems: 'center',
        gap: 12,
    },
    retryButton: {
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

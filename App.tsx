// App.tsx — Entry point utama Tabungin
import 'react-native-get-random-values'; // harus di baris pertama sebelum uuid
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import { Colors } from './src/constants/colors';
import { linking } from './src/navigation/LinkingConfiguration';

export default function App() {
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

    const handleRetryDatabase = () => {
        setDbReady(false);
        setDbError(null);
        setDbInitAttempt((current) => current + 1);
    };

    if (!fontsLoaded && !fontError || !dbReady) {
        return (
            <View style={styles.loadingContainer} accessible={true} accessibilityLabel="Memuat aplikasi Tabungin">
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText} accessibilityElementsHidden={true}>🐷</Text>
                    <Text style={styles.appName} allowFontScaling={false}>Tabungin</Text>
                    <Text style={styles.tagline} allowFontScaling={false}>Catat, Kelola, Wujudkan</Text>
                </View>
                <ActivityIndicator size="large" color={Colors.primary} accessibilityLabel="Sedang memuat" />
                {dbError && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText} allowFontScaling={false}>{dbError}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={handleRetryDatabase}
                            accessibilityRole="button"
                            accessibilityLabel="Coba lagi memuat database"
                        >
                            <Text style={styles.retryButtonText} allowFontScaling={false}>Coba Lagi</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {fontError && (
                    <Text style={styles.errorText} allowFontScaling={false}>Gagal memuat font.</Text>
                )}
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
                <NavigationContainer linking={linking as any}>
                    <StatusBar style="auto" />
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
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    logoContainer: { alignItems: 'center', gap: 10 },
    logoText: { fontSize: 64 },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 15,
        color: Colors.textSecondary,
    },
    errorText: {
        fontSize: 14,
        color: Colors.danger,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    errorContainer: {
        alignItems: 'center',
        gap: 12,
    },
    retryButton: {
        backgroundColor: Colors.primary,
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

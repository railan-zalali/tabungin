// App.tsx — Entry point utama Tabungin
import 'react-native-get-random-values'; // harus di baris pertama sebelum uuid
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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

export default function App() {
    const [dbReady, setDbReady] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);

    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_700Bold,
    });

    useEffect(() => {
        async function setupDatabase() {
            try {
                await initDatabase();
                setDbReady(true);
            } catch (error) {
                console.error('Gagal menginisialisasi database:', error);
                setDbError('Gagal memuat database. Coba restart aplikasi.');
                setDbReady(true); // tetap lanjutkan meski error
            }
        }
        setupDatabase();
    }, []);

    if (!fontsLoaded || !dbReady) {
        return (
            <View style={styles.loadingContainer} accessible={true} accessibilityLabel="Memuat aplikasi Tabungin">
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText} accessibilityElementsHidden={true}>🐷</Text>
                    <Text style={styles.appName} allowFontScaling={false}>Tabungin</Text>
                    <Text style={styles.tagline} allowFontScaling={false}>Catat, Kelola, Wujudkan</Text>
                </View>
                <ActivityIndicator size="large" color={Colors.primary} accessibilityLabel="Sedang memuat" />
                {dbError && (
                    <Text style={styles.errorText} allowFontScaling={false}>{dbError}</Text>
                )}
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
                <NavigationContainer>
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
});

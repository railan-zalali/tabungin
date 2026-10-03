// Error Boundary — menangkap error React tree untuk mencegah crash seluruh app
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    children: React.ReactNode;
    /** Optional: tampilan fallback kustom, misal untuk screen-level isolation */
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('[AppErrorBoundary] Uncaught error:', error, errorInfo, errorInfo?.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.iconWrap}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={56} color="#FF6B6B" />
                    </View>
                    <Text style={styles.title}>{this.props.fallbackTitle ?? 'Terjadi Kesalahan'}</Text>
                    <Text style={styles.subtitle}>
                        Aplikasi mengalami error yang tidak terduga. Coba muat ulang untuk melanjutkan.
                    </Text>
                    {__DEV__ && this.state.error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{this.state.error.message}</Text>
                        </View>
                    ) : null}
                    <TouchableOpacity style={styles.button} onPress={this.handleReload}>
                        <Text style={styles.buttonText}>Muat Ulang</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }
}

/**
 * HOC untuk isolasi error per-screen: crash di satu screen hanya menampilkan
 * fallback screen itu, bukan membawa seluruh navigator/app.
 * Dipakai di navigator sebagai `component={withScreenErrorBoundary(XScreen)}`.
 */
export function withScreenErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallbackTitle?: string,
): React.ComponentType<P> {
    function Wrapped(props: P) {
        return (
            <AppErrorBoundary fallbackTitle={fallbackTitle}>
                <Component {...props} />
            </AppErrorBoundary>
        );
    }
    Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Screen'})`;
    return Wrapped;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F14',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 16,
    },
    iconWrap: {
        width: 96,
        height: 96,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.20)',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.60)',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 320,
    },
    errorBox: {
        width: '100%',
        maxWidth: 340,
        padding: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 107, 107, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.15)',
    },
    errorText: {
        fontSize: 12,
        color: 'rgba(255, 107, 107, 0.85)',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#1DB954',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 32,
        marginTop: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

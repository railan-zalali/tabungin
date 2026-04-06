import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { ContextBadge } from '../../components/common/ContextBadge';
import { Button } from '../../components/common/Button';
import { checkForAppUpdate, getCurrentAppVersion, openReleaseDownload, type AppUpdateStatus } from '../../utils/updateService';
import { useResponsiveMetrics } from '../../utils/responsive';

function describeStatus(status: AppUpdateStatus) {
    if (status.isForceUpdate) {
        return { title: 'Update wajib tersedia', tone: 'warning' as const, description: 'Versi saat ini sudah di bawah batas minimum yang didukung.' };
    }
    if (status.hasUpdate) {
        return { title: 'Ada update baru', tone: 'warning' as const, description: 'Versi terbaru siap diunduh beserta catatan rilisnya.' };
    }
    if (status.latestRelease) {
        return { title: 'Aplikasi sudah terbaru', tone: 'success' as const, description: 'Tidak ada update baru yang perlu dipasang sekarang.' };
    }
    return { title: 'Status update belum diketahui', tone: 'neutral' as const, description: 'Jalankan pengecekan manual untuk mengambil metadata rilis terbaru.' };
}

export function AppUpdateScreen() {
    const navigation = useNavigation<SettingsChildNavigationProp<'AppUpdate'>>();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const metrics = useResponsiveMetrics();
    const [status, setStatus] = useState<AppUpdateStatus>({
        currentVersion: getCurrentAppVersion().version,
        currentBuildNumber: getCurrentAppVersion().buildNumber,
        latestRelease: null,
        hasUpdate: false,
        isForceUpdate: false,
    });
    const [isChecking, setIsChecking] = useState(false);
    const currentVersion = getCurrentAppVersion();
    const presentation = describeStatus(status);

    const runCheck = async () => {
        setIsChecking(true);
        try {
            setStatus(await checkForAppUpdate({ ignoreInterval: true }));
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        runCheck().catch((error) => console.warn('[AppUpdate] Failed to check version:', error));
    }, []);

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Pembaruan aplikasi"
                subtitle="Cek versi terbaru, catatan rilis, dan tautan unduhan resmi."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}>
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Versi saat ini</Text>
                    <Text style={styles.heroValue}>{currentVersion.version}</Text>
                    <Text style={styles.heroSubtitle}>Build {currentVersion.buildNumber}</Text>
                    <View style={styles.badgeRow}>
                        <ContextBadge icon="cellphone" label="android" tone="info" />
                        <ContextBadge icon="shield-check-outline" label={presentation.title} tone={presentation.tone} />
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{presentation.title}</Text>
                    <Text style={styles.cardText}>{presentation.description}</Text>
                    {isChecking ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.loadingText}>Memeriksa metadata rilis terbaru...</Text>
                        </View>
                    ) : null}
                    <Button label="Cek update sekarang" onPress={runCheck} variant="primary" disabled={isChecking} />
                </View>

                {status.latestRelease ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Rilis terbaru</Text>
                        <Text style={styles.releaseVersion}>{status.latestRelease.version} • build {status.latestRelease.build_number}</Text>
                        <Text style={styles.cardText}>{status.latestRelease.release_notes || 'Release notes belum diisi untuk rilis ini.'}</Text>
                        <Button
                            label="Buka tautan unduh"
                            onPress={() => openReleaseDownload(status.latestRelease!.download_url)}
                            variant="primary"
                            disabled={!status.latestRelease.download_url}
                        />
                    </View>
                ) : null}
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: { paddingHorizontal: 20, paddingBottom: 108, gap: 18 },
        contentWide: { maxWidth: 920, width: '100%', alignSelf: 'center' },
        heroCard: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 8,
        },
        heroTitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.caption, color: colors.textSecondary },
        heroValue: { fontFamily: FontFamily.headingMedium, fontSize: FontSize.h2, color: colors.textPrimary },
        heroSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
        card: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 18,
            gap: 12,
        },
        cardTitle: { ...Typography.h4, color: colors.textPrimary },
        cardText: { fontFamily: FontFamily.body, fontSize: FontSize.body, lineHeight: 21, color: colors.textSecondary },
        loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        loadingText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        releaseVersion: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.body, color: colors.primary },
    });

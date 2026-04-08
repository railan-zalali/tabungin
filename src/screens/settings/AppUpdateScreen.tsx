import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { SettingsChildNavigationProp } from '../../types/navigation';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize } from '../../constants/typography';
import { useTheme } from '../../store/useThemeStore';
import { ScreenShell } from '../../components/common/ScreenShell';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { Button } from '../../components/common/Button';
import { FormSection } from '../../components/common/FormSection';
import { HeroSummaryCard } from '../../components/common/HeroSummaryCard';
import { InlineNotice } from '../../components/common/InlineNotice';
import { MetricCard } from '../../components/common/MetricCard';
import { StatStrip } from '../../components/common/StatStrip';
import { checkForAppUpdate, getCurrentAppVersion, openReleaseDownload, type AppUpdateStatus } from '../../utils/updateService';
import { useResponsiveMetrics } from '../../utils/responsive';

function describeStatus(status: AppUpdateStatus) {
    if (status.isForceUpdate) {
        return {
            title: 'Update wajib tersedia',
            tone: 'warning' as const,
            description: 'Versi saat ini sudah di bawah batas minimum yang didukung.',
            noticeTone: 'danger' as const,
        };
    }
    if (status.hasUpdate) {
        return {
            title: 'Ada update baru',
            tone: 'warning' as const,
            description: 'Versi terbaru siap diunduh beserta catatan rilisnya.',
            noticeTone: 'warning' as const,
        };
    }
    if (status.latestRelease) {
        return {
            title: 'Aplikasi sudah terbaru',
            tone: 'success' as const,
            description: 'Tidak ada update baru yang perlu dipasang sekarang.',
            noticeTone: 'success' as const,
        };
    }
    return {
        title: 'Status update belum diketahui',
        tone: 'info' as const,
        description: 'Jalankan pengecekan manual untuk mengambil metadata rilis terbaru.',
        noticeTone: 'info' as const,
    };
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
                subtitle="Pantau versi aktif, status rilis, dan tautan unduhan resmi tanpa keluar dari konteks."
                showBack
                onBackPress={() => navigation.goBack()}
                variant="transparent"
                eyebrow="System Health"
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, metrics.widthClass !== 'compact' ? styles.contentWide : null]}
            >
                <HeroSummaryCard
                    eyebrow="Release Status"
                    title="Versi Tabungin"
                    value={currentVersion.version}
                    description={presentation.description}
                    icon="cellphone-arrow-down"
                    tone={presentation.tone}
                    stats={[
                        { label: 'Build aktif', value: String(currentVersion.buildNumber), icon: 'numeric' },
                        { label: 'Channel', value: 'Android', icon: 'android' },
                        { label: 'Status', value: presentation.title, icon: 'shield-check-outline' },
                    ]}
                />

                <InlineNotice
                    icon={status.isForceUpdate ? 'alert-octagon-outline' : 'shield-check-outline'}
                    title={presentation.title}
                    description={
                        status.isForceUpdate
                            ? 'Update ini sebaiknya diprioritaskan agar aplikasi tetap aman dipakai dan sinkronisasi tidak terganggu.'
                            : 'Pengecekan manual tetap tersedia saat kamu ingin memastikan rilis terbaru sudah benar-benar terbaca.'
                    }
                    tone={presentation.noticeTone}
                />

                <FormSection
                    eyebrow="Current Build"
                    title="Versi yang sedang dipakai"
                    subtitle="Ringkasan ini membantu memastikan perangkat memakai build yang tepat sebelum melakukan restore, impor, atau sinkronisasi."
                    variant="highlight"
                >
                    <View style={styles.metricGrid}>
                        <MetricCard label="Versi aktif" value={currentVersion.version} icon="cellphone" tone="primary" />
                        <MetricCard
                            label="Build number"
                            value={String(currentVersion.buildNumber)}
                            icon="counter"
                            tone="neutral"
                        />
                    </View>
                    <StatStrip
                        items={[
                            { label: 'Platform', value: 'Android' },
                            { label: 'Rilis', value: status.latestRelease ? 'Tersambung' : 'Lokal' },
                            { label: 'Pemeriksaan', value: isChecking ? 'Sedang jalan' : 'Siap' },
                        ]}
                    />
                    {isChecking ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.loadingText}>Memeriksa metadata rilis terbaru...</Text>
                        </View>
                    ) : null}
                    <Button
                        label="Cek update sekarang"
                        onPress={runCheck}
                        variant="primary"
                        disabled={isChecking}
                        loading={isChecking}
                    />
                </FormSection>

                <FormSection
                    eyebrow="Latest Release"
                    title={status.latestRelease ? 'Rilis terbaru tersedia' : 'Belum ada metadata rilis'}
                    subtitle={
                        status.latestRelease
                            ? 'Kalau ada update yang lebih baru, detail versinya akan muncul di sini beserta ringkasan release notes.'
                            : 'Jalankan pengecekan manual untuk mengambil metadata terbaru dari layanan rilis.'
                    }
                    density="compact"
                >
                    {status.latestRelease ? (
                        <>
                            <View style={styles.releaseHeader}>
                                <Text style={styles.releaseVersion}>{status.latestRelease.version}</Text>
                                <Text style={styles.releaseBuild}>Build {status.latestRelease.build_number}</Text>
                            </View>
                            <Text style={styles.releaseNotes}>
                                {status.latestRelease.release_notes || 'Release notes belum diisi untuk rilis ini.'}
                            </Text>
                            <Button
                                label="Buka tautan unduh"
                                onPress={() => openReleaseDownload(status.latestRelease!.download_url)}
                                variant="secondary"
                                disabled={!status.latestRelease.download_url}
                            />
                        </>
                    ) : (
                        <InlineNotice
                            icon="cloud-search-outline"
                            description="Belum ada metadata rilis yang berhasil dibaca. Ini tidak selalu berarti ada masalah, tetapi sebaiknya cek ulang saat koneksi stabil."
                            tone="info"
                        />
                    )}
                </FormSection>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        content: { paddingHorizontal: 20, paddingBottom: 108, gap: 18 },
        contentWide: { maxWidth: 920, width: '100%', alignSelf: 'center' },
        metricGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
        },
        loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        loadingText: { fontFamily: FontFamily.body, fontSize: FontSize.caption, color: colors.textSecondary },
        releaseHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            paddingBottom: 4,
        },
        releaseVersion: {
            fontFamily: FontFamily.headingMedium,
            fontSize: FontSize.h3,
            color: colors.textPrimary,
        },
        releaseBuild: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
        },
        releaseNotes: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textSecondary,
            backgroundColor: colors.surfaceAlt,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 16,
        },
    });

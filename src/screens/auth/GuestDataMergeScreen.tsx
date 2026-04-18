import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { Button } from '../../components/common/Button';
import { InlineNotice } from '../../components/common/InlineNotice';
import { StatStrip } from '../../components/common/StatStrip';
import { ScreenShell } from '../../components/common/ScreenShell';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { StatePanel } from '../../components/common/StatePanel';
import { useResponsiveMetrics } from '../../utils/responsive';

function formatSummary(summary: { wallets: number; transactions: number; savingGoals: number; budgets: number }) {
    return `${summary.wallets} dompet, ${summary.transactions} transaksi, ${summary.savingGoals} target, ${summary.budgets} budget`;
}

export function GuestDataMergeScreen() {
    const { colors } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
    const resolution = useAuthStore((state) => state.pendingGuestMergeResolution);
    const resolveGuestMergeResolution = useAuthStore((state) => state.resolveGuestMergeResolution);
    const [isResolving, setIsResolving] = React.useState<'merge_local' | 'cloud_only' | null>(null);

    const handleResolve = async (strategy: 'merge_local' | 'cloud_only') => {
        setIsResolving(strategy);
        try {
            await resolveGuestMergeResolution(strategy);
        } finally {
            setIsResolving(null);
        }
    };

    if (!resolution) {
        return (
            <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
                <View style={styles.centerWrap}>
                    <StatePanel
                        loading
                        title="Menyiapkan keputusan merge"
                        description="Ringkasan data lokal guest dan data cloud sedang dibandingkan."
                    />
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.container,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                        paddingTop: metrics.headerTopOffset + 16,
                        paddingBottom: metrics.safeBottomSpacing + 16,
                        gap: metrics.verticalGap + 2,
                    },
                ]}
            >
                <View style={styles.heroIcon}>
                    <MaterialCommunityIcons name="source-merge" size={32} color={colors.primary} />
                </View>
                <Text style={styles.eyebrow}>Keputusan Merge Diperlukan</Text>
                <Text style={styles.title}>Akun ini sudah punya data cloud, sementara sesi guest juga punya data lokal.</Text>
                <Text style={styles.description}>
                    Pilih bagaimana Tabungin harus melanjutkan. Keputusan ini menentukan apakah data guest akan ikut
                    didorong ke akun, atau data cloud menjadi sumber utama.
                </Text>

                <InlineNotice
                    icon="compare-horizontal"
                    title="Keputusan ini berdampak langsung"
                    description="Flow ini sengaja dibuat eksplisit supaya kamu tahu sumber data mana yang akan menjadi basis setelah login."
                    tone="warning"
                />

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Data lokal guest</Text>
                    <Text style={styles.summaryValue}>{formatSummary(resolution.local)}</Text>
                    <Text style={styles.summaryLabel}>Data cloud saat ini</Text>
                    <Text style={styles.summaryValue}>{formatSummary(resolution.remote)}</Text>
                </View>

                <StatStrip
                    items={[
                        { label: 'Guest wallets', value: `${resolution.local.wallets}` },
                        { label: 'Cloud wallets', value: `${resolution.remote.wallets}` },
                        { label: 'Target aktif', value: `${resolution.local.savingGoals + resolution.remote.savingGoals}` },
                    ]}
                    vertical={metrics.widthClass === 'compact'}
                />

                <View style={styles.actionStack}>
                    <Button
                        label="Gabungkan data lokal ke akun"
                        onPress={() => handleResolve('merge_local')}
                        loading={isResolving === 'merge_local'}
                        fullWidth
                        accessibilityLabel="Gabungkan data lokal guest ke akun"
                    />
                    <Button
                        label="Pakai data cloud saja"
                        onPress={() => handleResolve('cloud_only')}
                        loading={isResolving === 'cloud_only'}
                        variant="secondary"
                        fullWidth
                        accessibilityLabel="Abaikan data lokal guest dan pakai data cloud"
                    />
                </View>

                <View style={styles.noteCard}>
                    <Text style={styles.noteTitle}>Aturan saat ini</Text>
                    <Text style={styles.noteText}>`Gabungkan` mempertahankan data guest dan melanjutkan sync.</Text>
                    <Text style={styles.noteText}>
                        `Pakai cloud` menghapus data lokal guest lalu menarik ulang data dari cloud.
                    </Text>
                </View>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isCompact: boolean) =>
    StyleSheet.create({
        container: {
            gap: 18,
        },
        centerWrap: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
        },
        helperText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        heroIcon: {
            width: 64,
            height: 64,
            borderRadius: BorderRadius['2xl'],
            backgroundColor: colors.primaryBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        title: {
            ...Typography.h2,
            color: colors.textPrimary,
        },
        description: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: isCompact ? 21 : 22,
            color: colors.textSecondary,
        },
        summaryCard: {
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['3xl'],
            padding: 18,
            gap: 8,
        },
        summaryLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            textTransform: 'uppercase',
        },
        summaryValue: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        actionStack: {
            gap: 12,
        },
        noteCard: {
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: BorderRadius['3xl'],
            padding: 16,
            gap: 8,
        },
        noteTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        noteText: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            lineHeight: 20,
            color: colors.textSecondary,
        },
    });

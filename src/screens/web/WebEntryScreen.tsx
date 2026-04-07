import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import type { RootStackParamList } from '../../types/navigation';
import { Button } from '../../components/common/Button';
import { ContextBadge } from '../../components/common/ContextBadge';
import { ScreenShell } from '../../components/common/ScreenShell';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import { useResponsiveMetrics } from '../../utils/responsive';

type RootNavigation = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const VALUE_POINTS = [
    {
        icon: 'cloud-lock-outline',
        title: 'Offline-first, tetap aman',
        description: 'Catat transaksi, target, dan budget langsung dari browser. Saat akun aktif, data bisa lanjut sinkron ke cloud.',
        tone: 'info' as const,
    },
    {
        icon: 'target',
        title: 'Saving goal yang terukur',
        description: 'Deadline, ritme tabungan, dan status ahead / on-track / behind tampil jelas sejak awal.',
        tone: 'success' as const,
    },
    {
        icon: 'account-group-outline',
        title: 'Siap untuk kolaborasi',
        description: 'Shared wallet dan flow upgrade guest ke akun sudah disiapkan tanpa mengorbankan data lokal.',
        tone: 'primary' as const,
    },
];

const CAPABILITIES = [
    { label: 'Pencatatan lokal', value: 'Aktif', tone: 'success' as const },
    { label: 'Export / import', value: 'Aktif', tone: 'info' as const },
    { label: 'Saving goal deadline', value: 'Aktif', tone: 'success' as const },
    { label: 'Cloud sync', value: 'Aktif saat login', tone: 'warning' as const },
    { label: 'Shared wallet', value: 'Aktif saat login', tone: 'warning' as const },
    { label: 'Guest mode', value: 'Aktif', tone: 'primary' as const },
];

const FLOW_STEPS = [
    'Masuk dengan akun untuk sync cloud dan shared wallet.',
    'Atau lanjut tanpa akun untuk mode lokal yang cepat.',
    'Setelah masuk, data guest bisa digabung atau diganti cloud lewat flow merge yang eksplisit.',
];

export function WebEntryScreen() {
    const navigation = useNavigation<RootNavigation>();
    const { colors, gradients } = useTheme();
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isWide), [colors, metrics.isWide]);
    const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
    const [isStartingGuest, setIsStartingGuest] = React.useState(false);

    const handleGuestMode = async () => {
        setIsStartingGuest(true);
        try {
            await continueAsGuest();
        } finally {
            setIsStartingGuest(false);
        }
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: metrics.horizontalPadding,
                    },
                ]}
            >
                <View style={[styles.pageWidth, { maxWidth: metrics.isWide ? 1180 : 980 }]}>
                    <View style={styles.topBar}>
                        <View style={styles.brandRow}>
                            <View style={styles.brandMark}>
                                <Text style={styles.brandMarkText}>T</Text>
                            </View>
                            <View>
                                <Text style={styles.brandTitle}>Tabungin Web</Text>
                                <Text style={styles.brandSubtitle}>Finance workspace untuk desktop dan browser.</Text>
                            </View>
                        </View>

                        <View style={styles.topBarActions}>
                            <TouchableOpacity
                                style={styles.textLink}
                                onPress={() => navigation.navigate('Login')}
                                accessibilityRole="button"
                                accessibilityLabel="Masuk ke akun Tabungin"
                            >
                                <Text style={styles.textLinkLabel}>Masuk</Text>
                            </TouchableOpacity>
                            <Button
                                label="Buat akun"
                                onPress={() => navigation.navigate('Register')}
                                size="sm"
                                accessibilityLabel="Buat akun Tabungin baru"
                            />
                        </View>
                    </View>

                    <View style={[styles.heroGrid, metrics.width >= 960 ? styles.heroGridWide : null]}>
                        <LinearGradient
                            colors={gradients.hero as unknown as [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <ContextBadge icon="monitor-dashboard" label="Web Experience" inverse />
                            <Text style={styles.heroTitle}>Kelola uang, target, dan kolaborasi dari browser dengan tampilan yang memang dibuat untuk web.</Text>
                            <Text style={styles.heroDescription}>
                                Landing page ini menggantikan onboarding mobile di browser. Kamu bisa masuk dengan akun,
                                lanjut sebagai guest, lalu tetap pindah ke app flow yang sama tanpa blank screen.
                            </Text>

                            <View style={styles.heroActions}>
                                <Button
                                    label="Masuk ke akun"
                                    onPress={() => navigation.navigate('Login')}
                                    accessibilityLabel="Masuk ke akun Tabungin dari web"
                                />
                                <Button
                                    label="Lanjut tanpa akun"
                                    onPress={handleGuestMode}
                                    variant="secondary"
                                    loading={isStartingGuest}
                                    accessibilityLabel="Lanjut menggunakan Tabungin web tanpa akun"
                                />
                            </View>

                            <View style={styles.heroMetricsRow}>
                                <View style={styles.heroMetric}>
                                    <Text style={styles.heroMetricValue}>Guest / Cloud</Text>
                                    <Text style={styles.heroMetricLabel}>Mode akses fleksibel</Text>
                                </View>
                                <View style={styles.heroMetric}>
                                    <Text style={styles.heroMetricValue}>Atomic Saving</Text>
                                    <Text style={styles.heroMetricLabel}>Wallet ke goal konsisten</Text>
                                </View>
                                <View style={styles.heroMetric}>
                                    <Text style={styles.heroMetricValue}>Realtime Ready</Text>
                                    <Text style={styles.heroMetricLabel}>Conflict rule sudah eksplisit</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <View style={styles.previewColumn}>
                            <View style={styles.previewGlass}>
                                <View style={styles.previewHeader}>
                                    <ContextBadge icon="wallet-outline" label="Workspace pribadi" tone="primary" />
                                    <ContextBadge icon="target" label="3 target aktif" tone="success" />
                                </View>

                                <View style={styles.previewCard}>
                                    <View style={styles.previewCardHeader}>
                                        <Text style={styles.previewCardTitle}>Goal planning</Text>
                                        <ContextBadge icon="trending-up" label="On track" tone="success" />
                                    </View>
                                    <Text style={styles.previewCardBody}>Laptop kerja selesai lebih cepat jika ritme tabungan dinaikkan Rp 350.000 per bulan.</Text>
                                </View>

                                <View style={[styles.previewCard, styles.previewCardAccent]}>
                                    <View style={styles.previewCardHeader}>
                                        <Text style={styles.previewCardTitle}>Capability matrix</Text>
                                        <ContextBadge icon="cloud-check-outline" label="Cloud siap" tone="info" />
                                    </View>
                                    <Text style={styles.previewCardBody}>Masuk akun untuk sync dan shared wallet. Tetap lanjut sebagai guest bila hanya butuh mode lokal cepat.</Text>
                                </View>

                                <View style={styles.miniTimeline}>
                                    <View style={styles.timelineLine} />
                                    {FLOW_STEPS.map((step, index) => (
                                        <View key={step} style={styles.timelineRow}>
                                            <View style={styles.timelineDotWrap}>
                                                <Text style={styles.timelineDotText}>{index + 1}</Text>
                                            </View>
                                            <Text style={styles.timelineCopy}>{step}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.sectionGrid, metrics.width >= 980 ? styles.sectionGridWide : null]}>
                        <View style={styles.sectionColumn}>
                            <Text style={styles.sectionEyebrow}>Yang sudah aktif</Text>
                            <Text style={styles.sectionTitle}>Core system yang relevan di web sudah siap dipakai.</Text>

                            <View style={styles.valueGrid}>
                                {VALUE_POINTS.map((item) => (
                                    <View key={item.title} style={styles.valueCard}>
                                        <View style={styles.valueIcon}>
                                            <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.primary} />
                                        </View>
                                        <ContextBadge label={item.title} tone={item.tone} />
                                        <Text style={styles.valueDescription}>{item.description}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.sectionColumn}>
                            <View style={styles.capabilityPanel}>
                                <Text style={styles.sectionEyebrow}>Capability</Text>
                                <Text style={styles.capabilityTitle}>Mode akses di browser</Text>
                                <Text style={styles.capabilityDescription}>
                                    Halaman web ini sengaja langsung menjelaskan batas guest mode vs akun agar user tidak bingung sejak layar pertama.
                                </Text>

                                <View style={styles.capabilityStack}>
                                    {CAPABILITIES.map((item) => (
                                        <View key={item.label} style={styles.capabilityRow}>
                                            <Text style={styles.capabilityLabel}>{item.label}</Text>
                                            <ContextBadge label={item.value} tone={item.tone} />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors'], isWide: boolean) =>
    StyleSheet.create({
        content: {
            paddingTop: 28,
            paddingBottom: 56,
            alignItems: 'center',
        },
        pageWidth: {
            width: '100%',
            gap: 24,
        },
        topBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingVertical: 4,
            flexWrap: 'wrap',
        },
        brandRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
        },
        brandMark: {
            width: 52,
            height: 52,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.14,
            shadowRadius: 24,
            elevation: 8,
        },
        brandMarkText: {
            fontFamily: FontFamily.heading,
            fontSize: 26,
            color: colors.textInverse,
        },
        brandTitle: {
            fontFamily: FontFamily.heading,
            fontSize: 22,
            color: colors.textPrimary,
            letterSpacing: -0.4,
        },
        brandSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            color: colors.textSecondary,
            marginTop: 2,
        },
        topBarActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        textLink: {
            minHeight: 42,
            paddingHorizontal: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: BorderRadius.xl,
        },
        textLinkLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        heroGrid: {
            gap: 20,
        },
        heroGridWide: {
            flexDirection: 'row',
            alignItems: 'stretch',
        },
        heroCard: {
            flex: isWide ? 1.25 : undefined,
            minHeight: 420,
            borderRadius: BorderRadius['5xl'],
            padding: 28,
            gap: 18,
            overflow: 'hidden',
        },
        heroTitle: {
            fontFamily: FontFamily.heading,
            fontSize: isWide ? 42 : 32,
            lineHeight: isWide ? 48 : 38,
            letterSpacing: -1.2,
            color: colors.textInverse,
            maxWidth: 680,
        },
        heroDescription: {
            fontFamily: FontFamily.body,
            fontSize: 16,
            lineHeight: 24,
            color: 'rgba(255,255,255,0.84)',
            maxWidth: 640,
        },
        heroActions: {
            flexDirection: 'row',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 6,
        },
        heroMetricsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 'auto',
        },
        heroMetric: {
            minWidth: 180,
            flex: 1,
            padding: 16,
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
            backgroundColor: 'rgba(255,255,255,0.12)',
        },
        heroMetricValue: {
            fontFamily: FontFamily.headingMedium,
            fontSize: 18,
            color: colors.textInverse,
        },
        heroMetricLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: 'rgba(255,255,255,0.78)',
            marginTop: 4,
        },
        previewColumn: {
            flex: 0.95,
        },
        previewGlass: {
            height: '100%',
            minHeight: 420,
            borderRadius: BorderRadius['5xl'],
            padding: 22,
            backgroundColor: colors.surfaceGlass,
            borderWidth: 1,
            borderColor: colors.glassStroke,
            gap: 14,
        },
        previewHeader: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        previewCard: {
            gap: 8,
            padding: 16,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        previewCardAccent: {
            backgroundColor: colors.primaryBg,
            borderColor: `${colors.primary}20`,
        },
        previewCardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        previewCardTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
            flex: 1,
        },
        previewCardBody: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 20,
            color: colors.textSecondary,
        },
        miniTimeline: {
            position: 'relative',
            gap: 14,
            marginTop: 6,
            paddingLeft: 2,
        },
        timelineLine: {
            position: 'absolute',
            left: 14,
            top: 16,
            bottom: 16,
            width: 1,
            backgroundColor: colors.borderStrong,
        },
        timelineRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        timelineDotWrap: {
            width: 28,
            height: 28,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            zIndex: 1,
        },
        timelineDotText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textInverse,
        },
        timelineCopy: {
            flex: 1,
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 20,
            color: colors.textSecondary,
            paddingTop: 3,
        },
        sectionGrid: {
            gap: 20,
        },
        sectionGridWide: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        sectionColumn: {
            flex: 1,
            gap: 16,
        },
        sectionEyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        sectionTitle: {
            fontFamily: FontFamily.heading,
            fontSize: isWide ? 30 : 24,
            lineHeight: isWide ? 36 : 30,
            letterSpacing: -0.6,
            color: colors.textPrimary,
            maxWidth: 640,
        },
        valueGrid: {
            gap: 14,
        },
        valueCard: {
            gap: 12,
            padding: 18,
            borderRadius: BorderRadius['4xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        valueIcon: {
            width: 46,
            height: 46,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        valueDescription: {
            fontFamily: FontFamily.body,
            fontSize: 15,
            lineHeight: 22,
            color: colors.textSecondary,
        },
        capabilityPanel: {
            gap: 14,
            padding: 20,
            borderRadius: BorderRadius['4xl'],
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        capabilityTitle: {
            fontFamily: FontFamily.headingMedium,
            fontSize: 22,
            lineHeight: 28,
            color: colors.textPrimary,
        },
        capabilityDescription: {
            fontFamily: FontFamily.body,
            fontSize: 15,
            lineHeight: 22,
            color: colors.textSecondary,
        },
        capabilityStack: {
            gap: 12,
            marginTop: 4,
        },
        capabilityRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
        },
        capabilityLabel: {
            flex: 1,
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
    });

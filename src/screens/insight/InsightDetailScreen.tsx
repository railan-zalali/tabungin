// Insight Detail (roadmap §5.1 P2-06 tahap 1, task IN-1).
//
// Layar khusus yang menampilkan seluruh insight + penjelasan angka dan
// langkah yang bisa diambil. Sebelumnya tombol "Buka detail insight" di
// Dashboard hanya berpindah ke tab Report — pengguna tidak pernah mendapat
// halaman detail tersendiri.
//
// Sumber data sama dengan Report (`useInsights`, jendela 6 bulan), jadi
// angka di sini tidak pernah berbeda dengan laporan.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BorderRadius } from '../../constants/theme';
import { FontSize, Typography, scaleFontSize } from '../../constants/typography';
import { useScreenLayout } from '../../hooks/useScreenLayout';
import { INSIGHT_WINDOW_MONTHS, useInsights } from '../../hooks/useInsights';
import { useTheme } from '../../store/useThemeStore';
import type { RootStackParamList, TabParamList } from '../../types/navigation';
import { AppScreenHeader } from '../../components/common/AppScreenHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { InsightCard } from '../../components/common/InsightCard';
import { ScreenShell } from '../../components/common/ScreenShell';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Skeleton } from '../../components/common/SkeletonLoader';
import { INSIGHT_EXPLANATIONS } from '../../utils/insightExplain';

// Root-stack screen yang boleh melompat ke tab Report tanpa harus melewati
// `navigate('Main', { screen })` — composite membuat keduanya type-safe.
type InsightDetailNavigationProp = CompositeNavigationProp<
    NativeStackNavigationProp<RootStackParamList, 'InsightDetail'>,
    BottomTabNavigationProp<TabParamList>
>;

function ExplanationBlock({ label, text }: { label: string; text: string }) {
    const { colors, textSize } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);

    return (
        <View style={styles.explanation}>
            <Text style={styles.explanationLabel}>{label}</Text>
            <Text style={styles.explanationText}>{text}</Text>
        </View>
    );
}

export function InsightDetailScreen() {
    const navigation = useNavigation<InsightDetailNavigationProp>();
    const { colors, textSize } = useTheme();
    const { contentBottomSpacing } = useScreenLayout();
    const styles = React.useMemo(() => getStyles(colors, textSize), [colors, textSize]);
    const { insights, isLoading } = useInsights();

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <AppScreenHeader
                title="Detail insight"
                subtitle={`${INSIGHT_WINDOW_MONTHS} bulan terakhir`}
                showBack
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: contentBottomSpacing }]}>
                <SectionHeader
                    title={`${insights.length} insight terbaca`}
                    subtitle="Setiap insight menyertakan angka dasarnya dan langkah yang bisa diambil."
                />

                {isLoading ? (
                    <View style={styles.stack}>
                        <Skeleton height={140} borderRadius={24} />
                        <Skeleton height={140} borderRadius={24} />
                    </View>
                ) : insights.length === 0 ? (
                    <EmptyState
                        icon="lightbulb-on-outline"
                        title="Belum ada insight"
                        description="Tambahkan transaksi dulu supaya pola pengeluaran, tabungan, dan perkiraan bulan depan mulai terbentuk."
                    />
                ) : (
                    <View style={styles.stack}>
                        {insights.map((insight) => (
                            <View key={insight.id} style={styles.insightItem}>
                                <InsightCard insight={insight} />
                                <ExplanationBlock label="Apa artinya" text={INSIGHT_EXPLANATIONS[insight.id].meaning} />
                                <ExplanationBlock
                                    label="Yang bisa dilakukan"
                                    text={INSIGHT_EXPLANATIONS[insight.id].action}
                                />
                            </View>
                        ))}
                    </View>
                )}

                <SectionHeader
                    title="Laporan lengkap"
                    subtitle="Snapshot keuangan, breakdown kategori per periode, dan ekspor ke PDF."
                    actionLabel="Buka laporan"
                    onAction={() => navigation.navigate('Main', { screen: 'Report' })}
                />
            </ScrollView>
        </ScreenShell>
    );
}

const getStyles = (
    colors: ReturnType<typeof useTheme>['colors'],
    textSize: ReturnType<typeof useTheme>['textSize'],
) =>
    StyleSheet.create({
        content: {
            paddingHorizontal: 20,
            gap: 18,
        },
        stack: {
            gap: 14,
        },
        insightItem: {
            gap: 10,
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: BorderRadius['4xl'],
            padding: 16,
        },
        explanation: {
            gap: 4,
        },
        explanationLabel: {
            ...Typography.label,
            fontSize: scaleFontSize(FontSize.label, textSize),
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
        },
        explanationText: {
            ...Typography.body,
            fontSize: scaleFontSize(FontSize.body, textSize),
            color: colors.textPrimary,
            lineHeight: Math.round(scaleFontSize(FontSize.body, textSize) * 1.5),
        },
    });

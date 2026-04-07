import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BorderRadius } from '../../constants/theme';
import { FontFamily, FontSize, Typography } from '../../constants/typography';
import { ScreenShell } from '../../components/common/ScreenShell';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../store/useThemeStore';
import type { RootStackParamList } from '../../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
    id: string;
    icon: string;
    title: string;
    description: string;
    accent: 'primary' | 'warning' | 'info';
}

const SLIDES: Slide[] = [
    {
        id: 'capture',
        icon: 'wallet-outline',
        title: 'Catat arus uang tanpa ribet',
        description: 'Pemasukan, pengeluaran, dan dompet aktif tampil lebih jelas supaya kamu cepat paham kondisi hari ini.',
        accent: 'primary',
    },
    {
        id: 'goals',
        icon: 'bullseye-arrow',
        title: 'Dorong target pribadi dan bersama',
        description: 'Tabungan, progress, dan konteks shared wallet terasa rapi sehingga tujuan lebih mudah dipantau.',
        accent: 'warning',
    },
    {
        id: 'insight',
        icon: 'chart-box-outline',
        title: 'Baca insight yang benar-benar berguna',
        description: 'Snapshot, tren, dan insight keuangan membantu kamu ambil keputusan tanpa tenggelam di angka.',
        accent: 'info',
    },
];

function resolveSlidePalette(colors: ReturnType<typeof useTheme>['colors'], accent: Slide['accent']) {
    switch (accent) {
        case 'warning':
            return { bg: colors.warningSurface, ring: colors.warningBg, text: colors.warning };
        case 'info':
            return { bg: colors.infoBg, ring: colors.infoLight, text: colors.info };
        case 'primary':
        default:
            return { bg: colors.primaryBg, ring: colors.primaryLight, text: colors.primary };
    }
}

export function OnboardingScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const flatListRef = useRef<FlatList<Slide>>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
    const { colors, gradients } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
            return;
        }
        navigation.navigate('Login');
    };

    return (
        <ScreenShell topInset={false} bottomInset surfaceVariant="alt">
            <View style={styles.topBar}>
                <View style={styles.brandWrap}>
                    <LinearGradient colors={gradients.hero as unknown as [string, string, ...string[]]} style={styles.brandIcon}>
                        <MaterialCommunityIcons name="piggy-bank-outline" size={28} color={colors.textInverse} />
                    </LinearGradient>
                    <View>
                        <Text style={styles.brandTitle}>Tabungin</Text>
                        <Text style={styles.brandSubtitle}>Rapi, tenang, dan selalu kontekstual.</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => navigation.navigate('Login')}
                    accessibilityRole="button"
                    accessibilityLabel="Lewati onboarding dan buka login"
                >
                    <Text style={styles.skipText}>Lewati</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.heroIntro}>
                <Text style={styles.eyebrow}>Mission Control Keuangan Harian</Text>
                <Text style={styles.heroTitle}>Biar setiap rupiah terasa jelas, bukan sekadar tercatat.</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slider}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(index);
                }}
                renderItem={({ item, index }) => {
                    const palette = resolveSlidePalette(colors, item.accent);
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 80).springify()} style={[styles.slide, { width: SCREEN_WIDTH }]}>
                            <View style={[styles.slideCard, { backgroundColor: colors.panelSurface }]}>
                                <View style={[styles.iconStage, { backgroundColor: palette.bg }]}>
                                    <View style={[styles.iconRing, { backgroundColor: palette.ring }]} />
                                    <MaterialCommunityIcons name={item.icon as any} size={84} color={palette.text} />
                                </View>

                                <View style={styles.slideCopy}>
                                    <Text style={styles.slideTitle}>{item.title}</Text>
                                    <Text style={styles.slideDescription}>{item.description}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    );
                }}
            />

            <View style={styles.footer}>
                <View style={styles.progressRow} accessibilityLabel={`Slide ${currentIndex + 1} dari ${SLIDES.length}`}>
                    {SLIDES.map((slide, index) => (
                        <View
                            key={slide.id}
                            style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
                        />
                    ))}
                </View>

                <Button
                    label={currentIndex === SLIDES.length - 1 ? 'Masuk ke Tabungin' : 'Lanjut'}
                    onPress={handleNext}
                    variant="primary"
                    size="lg"
                    fullWidth
                />

                <TouchableOpacity
                    style={styles.secondaryCta}
                    onPress={() => navigation.navigate('Register')}
                    accessibilityRole="button"
                    accessibilityLabel="Buat akun baru"
                >
                    <Text style={styles.secondaryCtaText}>Belum punya akun? Buat akun baru</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.guestCta}
                    onPress={() => continueAsGuest()}
                    accessibilityRole="button"
                    accessibilityLabel="Lanjut tanpa akun"
                >
                    <Text style={styles.guestCtaText}>Lanjut tanpa akun</Text>
                </TouchableOpacity>
            </View>
        </ScreenShell>
    );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        topBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 56,
            paddingBottom: 12,
            gap: 12,
        },
        brandWrap: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
        },
        brandIcon: {
            width: 48,
            height: 48,
            borderRadius: BorderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
        },
        brandTitle: {
            ...Typography.h4,
            color: colors.textPrimary,
        },
        brandSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        skipBtn: {
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        skipText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        heroIntro: {
            paddingHorizontal: 20,
            paddingTop: 8,
            gap: 8,
        },
        eyebrow: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
        heroTitle: {
            ...Typography.h1,
            color: colors.textPrimary,
        },
        slider: {
            paddingTop: 22,
        },
        slide: {
            paddingHorizontal: 20,
        },
        slideCard: {
            borderRadius: BorderRadius['5xl'],
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.08,
            shadowRadius: 22,
            elevation: 5,
            gap: 22,
        },
        iconStage: {
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 260,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
        },
        iconRing: {
            position: 'absolute',
            width: 188,
            height: 188,
            borderRadius: BorderRadius.full,
        },
        slideCopy: {
            gap: 10,
        },
        slideTitle: {
            ...Typography.h2,
            color: colors.textPrimary,
        },
        slideDescription: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.body,
            lineHeight: 22,
            color: colors.textSecondary,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 28,
            gap: 16,
        },
        progressRow: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
        },
        dot: {
            height: 8,
            borderRadius: BorderRadius.full,
        },
        dotActive: {
            width: 24,
            backgroundColor: colors.primary,
        },
        dotInactive: {
            width: 8,
            backgroundColor: colors.border,
        },
        secondaryCta: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
        },
        secondaryCtaText: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: FontSize.body,
            color: colors.textSecondary,
        },
        guestCta: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 4,
        },
        guestCtaText: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
        },
    });

// Onboarding Screen — 3 slide dengan animasi dan dot indicator
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { RootStackParamList } from '../../types/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
    id: string;
    icon: string;
    iconColor: string;
    title: string;
    description: string;
    bgColor: string;
}

const SLIDES: Slide[] = [
    {
        id: '1',
        icon: 'wallet',
        iconColor: Colors.primary,
        title: 'Catat Keuangan Harianmu',
        description: 'Catat pemasukan & pengeluaranmu dengan mudah. Kelola setiap rupiah jadi lebih berarti.',
        bgColor: Colors.primaryLight,
    },
    {
        id: '2',
        icon: 'piggy-bank',
        iconColor: Colors.secondary,
        title: 'Wujudkan Impianmu',
        description: 'Buat target tabungan untuk barang impianmu. Pantau progres dan capai tujuanmu lebih cepat!',
        bgColor: Colors.secondaryLight,
    },
    {
        id: '3',
        icon: 'chart-donut',
        iconColor: Colors.info,
        title: 'Laporan Visual Lengkap',
        description: 'Lihat laporan keuangan secara visual. Pahami kebiasaan belanjamu dan buat keputusan lebih smart.',
        bgColor: Colors.infoLight,
    },
];

export function OnboardingScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex((prev) => prev + 1);
        } else {
            navigation.navigate('Login');
        }
    };

    const handleSkip = () => navigation.navigate('Login');

    return (
        <SafeAreaView style={styles.container}>
            {/* Tombol skip */}
            <TouchableOpacity
                style={styles.skipBtn}
                onPress={handleSkip}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Lewati onboarding"
                accessibilityHint="Ketuk dua kali untuk langsung masuk ke halaman login"
            >
                <Text style={styles.skipText} allowFontScaling={true}>Lewati</Text>
            </TouchableOpacity>

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(idx);
                }}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                        <View style={[styles.illustrationContainer, { backgroundColor: item.bgColor }]}>
                            <MaterialCommunityIcons
                                name={item.icon as any}
                                size={100}
                                color={item.iconColor}
                                accessibilityElementsHidden={true}
                            />
                        </View>
                        <Text style={styles.title} allowFontScaling={true}>{item.title}</Text>
                        <Text style={styles.description} allowFontScaling={true}>{item.description}</Text>
                    </View>
                )}
            />

            {/* Dot indicator */}
            <View style={styles.dotsContainer} accessibilityLabel={`Slide ${currentIndex + 1} dari ${SLIDES.length}`}>
                {SLIDES.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === currentIndex ? styles.dotActive : styles.dotInactive,
                        ]}
                    />
                ))}
            </View>

            {/* Tombol CTA */}
            <TouchableOpacity
                style={styles.cta}
                onPress={handleNext}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={currentIndex === SLIDES.length - 1 ? 'Mulai sekarang' : 'Selanjutnya'}
            >
                <Text style={styles.ctaText} allowFontScaling={true}>
                    {currentIndex === SLIDES.length - 1 ? 'Mulai Sekarang 🚀' : 'Selanjutnya'}
                </Text>
                <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={Colors.textInverse}
                    accessibilityElementsHidden={true}
                />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    skipBtn: {
        position: 'absolute',
        top: 56,
        right: 20,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 48,
        justifyContent: 'center',
    },
    skipText: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 80,
        gap: 24,
    },
    illustrationContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontFamily: FontFamily.heading,
        fontSize: FontSize.h2,
        color: Colors.textPrimary,
        textAlign: 'center',
        lineHeight: 32,
    },
    description: {
        fontFamily: FontFamily.body,
        fontSize: FontSize.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 20,
    },
    dot: { borderRadius: 99, height: 8 },
    dotActive: { width: 24, backgroundColor: Colors.primary },
    dotInactive: { width: 8, backgroundColor: Colors.border },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: Colors.primary,
        marginHorizontal: 24,
        marginBottom: 32,
        paddingVertical: 18,
        borderRadius: 16,
        minHeight: 60,
    },
    ctaText: {
        fontFamily: FontFamily.bodyBold,
        fontSize: FontSize.h4,
        color: Colors.textInverse,
    },
});

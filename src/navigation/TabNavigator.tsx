import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily, FontSize } from '../constants/typography';
import { BorderRadius, Spacing } from '../constants/theme';
import type { TabParamList } from '../types/navigation';
import { useTransactionStore } from '../store/useTransactionStore';
import { useWalletStore } from '../store/useWalletStore';
import { useTheme } from '../store/useThemeStore';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TransactionStackNavigator } from './TransactionStackNavigator';
import { WalletStackNavigator } from './WalletStackNavigator';
import { ReportScreen } from '../screens/report/ReportScreen';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

type TabRouteName = keyof TabParamList;

const TAB_META: Record<
    TabRouteName,
    { label: string; icon: string; activeIcon: string; accent: 'primary' | 'success' | 'warning' | 'info' }
> = {
    Dashboard: {
        label: 'Beranda',
        icon: 'home-outline',
        activeIcon: 'home',
        accent: 'primary',
    },
    Transactions: {
        label: 'Transaksi',
        icon: 'swap-horizontal',
        activeIcon: 'swap-horizontal-bold',
        accent: 'success',
    },
    Wallet: {
        label: 'Dompet',
        icon: 'wallet-outline',
        activeIcon: 'wallet',
        accent: 'warning',
    },
    Report: {
        label: 'Laporan',
        icon: 'chart-box-outline',
        activeIcon: 'chart-box',
        accent: 'info',
    },
    Settings: {
        label: 'Setelan',
        icon: 'cog-outline',
        activeIcon: 'cog',
        accent: 'primary',
    },
};

function resolveAccentColor(colors: any, accent: (typeof TAB_META)[TabRouteName]['accent']) {
    switch (accent) {
        case 'success':
            return colors.success;
        case 'warning':
            return colors.warning;
        case 'info':
            return colors.info;
        case 'primary':
        default:
            return colors.primary;
    }
}

function TabBarButton({
    routeName,
    isFocused,
    onPress,
}: {
    routeName: TabRouteName;
    isFocused: boolean;
    onPress: () => void;
}) {
    const { colors, motion } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const meta = TAB_META[routeName];
    const accentColor = resolveAccentColor(colors, meta.accent);
    const scale = useSharedValue(isFocused ? 1 : 0.96);
    const lift = useSharedValue(isFocused ? -4 : 0);
    const glow = useSharedValue(isFocused ? 1 : 0);

    React.useEffect(() => {
        scale.value = withSpring(isFocused ? 1 : 0.97, motion.spring.snappy);
        lift.value = withSpring(isFocused ? -5 : 0, motion.spring.lift);
        glow.value = withTiming(isFocused ? 1 : 0, { duration: motion.duration.normal });
    }, [glow, isFocused, lift, motion.duration.normal, motion.spring.lift, motion.spring.snappy, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: lift.value }, { scale: scale.value }],
    }));

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
        transform: [{ scaleX: glow.value }],
    }));

    return (
        <TouchableOpacity
            style={styles.pressable}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: isFocused }}
        >
            <Animated.View style={[styles.tabButton, animatedStyle]}>
                {isFocused && (
                    <LinearGradient
                        colors={[colors.brutalLime, colors.brutalLime]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.activeGlow}
                    />
                )}
                <Animated.View style={[styles.activeIndicator, { backgroundColor: accentColor }, indicatorStyle]} />
                <View style={[styles.iconWrap, isFocused && { backgroundColor: `${accentColor}18` }]}>
                    <MaterialCommunityIcons
                        name={(isFocused ? meta.activeIcon : meta.icon) as any}
                        size={22}
                        color={isFocused ? colors.brutalInk : colors.textSecondary}
                    />
                </View>
                <Text
                    style={[
                        styles.tabLabel,
                        { color: isFocused ? colors.textPrimary : colors.textSecondary },
                        isFocused && styles.tabLabelFocused,
                    ]}
                    numberOfLines={1}
                >
                    {meta.label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);

    return (
        <View pointerEvents="box-none" style={styles.tabBarOuter}>
            <View style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <LinearGradient
                    colors={[colors.brutalWhite, colors.brutalWhite]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabBar}
                >
                    {state.routes.map((route, index) => {
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        if (!(route.name in TAB_META)) {
                            return null;
                        }

                        return (
                            <TabBarButton
                                key={route.key}
                                routeName={route.name as TabRouteName}
                                isFocused={isFocused}
                                onPress={onPress}
                            />
                        );
                    })}
                </LinearGradient>
            </View>
        </View>
    );
}

export function TabNavigator() {
    const { initRealtime: initTxRealtime, stopRealtime: stopTxRealtime } = useTransactionStore();
    const { initRealtime: initWalletRealtime, stopRealtime: stopWalletRealtime } = useWalletStore();

    React.useEffect(() => {
        initTxRealtime();
        initWalletRealtime();

        return () => {
            stopTxRealtime();
            stopWalletRealtime();
        };
    }, [initTxRealtime, initWalletRealtime, stopTxRealtime, stopWalletRealtime]);

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Transactions" component={TransactionStackNavigator} />
            <Tab.Screen name="Wallet" component={WalletStackNavigator} />
            <Tab.Screen name="Report" component={ReportScreen} />
            <Tab.Screen name="Settings" component={SettingsStackNavigator} />
        </Tab.Navigator>
    );
}

const getStyles = (colors: any) =>
    StyleSheet.create({
        tabBarOuter: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
        },
        tabBarShell: {
            paddingHorizontal: Spacing.base,
        },
        tabBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
            paddingTop: 12,
            paddingBottom: 4,
            borderRadius: BorderRadius.md,
            borderWidth: 2,
            borderColor: colors.brutalInk,
            shadowColor: colors.brutalInk,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: Platform.OS === 'ios' ? 1 : 1,
            shadowRadius: 0,
            elevation: 16,
            backgroundColor: colors.brutalWhite,
        },
        pressable: {
            flex: 1,
        },
        tabButton: {
            minHeight: 64,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: BorderRadius.sm,
            overflow: 'hidden',
            paddingHorizontal: 4,
            paddingVertical: 10,
            position: 'relative',
        },
        activeGlow: {
            ...StyleSheet.absoluteFillObject,
            borderRadius: BorderRadius.sm,
        },
        activeIndicator: {
            position: 'absolute',
            top: 0,
            alignSelf: 'center',
            width: 26,
            height: 4,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderWidth: 1,
            borderColor: colors.brutalInk,
        },
        iconWrap: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.sm,
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: 11,
            textAlign: 'center',
            letterSpacing: 0.15,
        },
        tabLabelFocused: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
    });

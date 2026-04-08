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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FontFamily, FontSize } from '../constants/typography';
import { BorderRadius } from '../constants/theme';
import type { TabParamList } from '../types/navigation';
import { useTransactionStore } from '../store/useTransactionStore';
import { useWalletStore } from '../store/useWalletStore';
import { useSavingStore } from '../store/useSavingStore';
import { useTheme } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';
import { triggerHapticImpact } from '../utils/haptics';
import { ContextBadge } from '../components/common/ContextBadge';
import { syncDatabase } from '../database/sync';
import { useResponsiveMetrics } from '../utils/responsive';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TransactionStackNavigator } from './TransactionStackNavigator';
import { WalletStackNavigator } from './WalletStackNavigator';
import { ReportScreen } from '../screens/report/ReportScreen';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

type TabRouteName = keyof TabParamList;

const TAB_META: Record<
    TabRouteName,
    { label: string; icon: string; activeIcon: string }
> = {
    Dashboard: {
        label: 'Beranda',
        icon: 'home-outline',
        activeIcon: 'home',
    },
    Transactions: {
        label: 'Transaksi',
        icon: 'swap-horizontal',
        activeIcon: 'swap-horizontal-bold',
    },
    Wallet: {
        label: 'Dompet',
        icon: 'wallet-outline',
        activeIcon: 'wallet',
    },
    Report: {
        label: 'Laporan',
        icon: 'chart-box-outline',
        activeIcon: 'chart-box',
    },
    Settings: {
        label: 'Setelan',
        icon: 'cog-outline',
        activeIcon: 'cog',
    },
};

function resolveAccentColor(colors: any) {
    return colors.primary;
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
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
    const meta = TAB_META[routeName];
    const accentColor = resolveAccentColor(colors);
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
                triggerHapticImpact();
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
                        colors={[`${accentColor}20`, colors.surfaceCard]}
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
                        color={isFocused ? accentColor : colors.textSecondary}
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
    const metrics = useResponsiveMetrics();
    const styles = React.useMemo(() => getStyles(colors, metrics.isCompact), [colors, metrics.isCompact]);
    const user = useAuthStore((state) => state.user);
    const sessionStatus = useAuthStore((state) => state.sessionStatus);
    const rootNavigation = navigation.getParent() as any;

    if (Platform.OS === 'web') {
        return (
            <View style={[styles.webSidebar, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.webSidebarTop}>
                    <View style={styles.webBrandRow}>
                        <View style={styles.webBrandMark}>
                            <Text style={styles.webBrandMarkText}>T</Text>
                        </View>
                        <View style={styles.webBrandCopy}>
                            <Text style={styles.webBrandTitle}>Tabungin</Text>
                            <Text style={styles.webBrandSubtitle}>Desktop workspace</Text>
                        </View>
                    </View>

                    <View style={styles.webProfileCard}>
                        <View style={styles.webProfileAvatar}>
                            <Text style={styles.webProfileAvatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? 'T'}</Text>
                        </View>
                        <View style={styles.webProfileCopy}>
                            <Text style={styles.webProfileName} numberOfLines={1}>{user?.name ?? 'Pengguna Tabungin'}</Text>
                            <Text style={styles.webProfileMeta} numberOfLines={1}>
                                {sessionStatus === 'guest' ? 'Mode guest lokal aktif' : user?.email || 'Akun tersambung'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.webTabStack}>
                        {state.routes.map((route, index) => {
                            const isFocused = state.index === index;
                            const meta = TAB_META[route.name as TabRouteName];
                            if (!meta) return null;

                            return (
                                <TouchableOpacity
                                    key={route.key}
                                    style={[
                                        styles.webTabButton,
                                        isFocused ? styles.webTabButtonActive : null,
                                    ]}
                                    onPress={() => {
                                        triggerHapticImpact();
                                        if (!isFocused) {
                                            navigation.navigate(route.name);
                                        }
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={meta.label}
                                    accessibilityState={{ selected: isFocused }}
                                >
                                    <View style={[styles.webTabIconWrap, isFocused ? { backgroundColor: `${resolveAccentColor(colors)}18` } : null]}>
                                        <MaterialCommunityIcons
                                            name={(isFocused ? meta.activeIcon : meta.icon) as any}
                                            size={20}
                                            color={isFocused ? resolveAccentColor(colors) : colors.textSecondary}
                                        />
                                    </View>
                                    <View style={styles.webTabCopy}>
                                        <Text style={[styles.webTabLabel, isFocused ? styles.webTabLabelActive : null]}>{meta.label}</Text>
                                        <Text style={styles.webTabHint}>
                                            {route.name === 'Dashboard'
                                                ? 'Ringkasan utama'
                                                : route.name === 'Transactions'
                                                    ? 'Arus kas & filter'
                                                    : route.name === 'Wallet'
                                                        ? 'Saldo & anggota'
                                                        : route.name === 'Report'
                                                            ? 'Insight & tren'
                                                            : 'Preferensi & data'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.webSidebarBottom}>
                    <View style={styles.webSidePanel}>
                        <Text style={styles.webSidePanelTitle}>Capability</Text>
                        <View style={styles.webSidePanelRow}>
                            <Text style={styles.webSidePanelLabel}>Mode</Text>
                            <ContextBadge
                                icon={sessionStatus === 'guest' ? 'cloud-off-outline' : 'cloud-check-outline'}
                                label={sessionStatus === 'guest' ? 'Local only' : 'Cloud active'}
                                tone={sessionStatus === 'guest' ? 'warning' : 'success'}
                            />
                        </View>
                        <View style={styles.webSidePanelRow}>
                            <Text style={styles.webSidePanelLabel}>Akses cepat</Text>
                            <TouchableOpacity
                                style={styles.webShortcutButton}
                                onPress={() => rootNavigation?.navigate('Savings', { screen: 'SavingList' })}
                                accessibilityRole="button"
                                accessibilityLabel="Buka target tabungan"
                            >
                                <MaterialCommunityIcons name="piggy-bank-outline" size={16} color={colors.primary} />
                                <Text style={styles.webShortcutLabel}>Target tabungan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View pointerEvents="box-none" style={styles.tabBarOuter}>
            <View style={[styles.tabBarShell, { paddingHorizontal: metrics.horizontalPadding, paddingBottom: Math.max(insets.bottom, 10) }]}>
                <LinearGradient
                    colors={[colors.surfaceElevated, colors.surfaceGlass]}
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
    const { initRealtime: initSavingRealtime, stopRealtime: stopSavingRealtime } = useSavingStore();
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const clearPostAuthRedirect = useAuthStore((state) => state.clearPostAuthRedirect);
    const canSync = useAuthStore((state) => state.canSync);

    React.useEffect(() => {
        if (canSync) {
            syncDatabase().catch(console.error);
        }
        initTxRealtime();
        initWalletRealtime();
        initSavingRealtime();

        return () => {
            stopTxRealtime();
            stopWalletRealtime();
            stopSavingRealtime();
        };
    }, [canSync, initSavingRealtime, initTxRealtime, initWalletRealtime, stopSavingRealtime, stopTxRealtime, stopWalletRealtime]);

    React.useEffect(() => {
        const redirect = route.params;
        if (!redirect?.screen) return;
        navigation.navigate(redirect.screen, redirect.params);
        clearPostAuthRedirect();
    }, [clearPostAuthRedirect, navigation, route.params]);

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
                sceneStyle: Platform.OS === 'web'
                    ? {
                        marginLeft: 304,
                        backgroundColor: colors.backgroundAlt,
                    }
                    : undefined,
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

const getStyles = (colors: any, isCompact: boolean) =>
    StyleSheet.create({
        tabBarOuter: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
        },
        webSidebar: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 280,
            paddingHorizontal: 18,
            backgroundColor: colors.surfaceGlass,
            borderRightWidth: 1,
            borderRightColor: colors.border,
            justifyContent: 'space-between',
        },
        webSidebarTop: {
            gap: 18,
        },
        webBrandRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        webBrandMark: {
            width: 46,
            height: 46,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
        },
        webBrandMarkText: {
            fontFamily: FontFamily.heading,
            fontSize: 22,
            color: colors.textInverse,
        },
        webBrandCopy: {
            flex: 1,
        },
        webBrandTitle: {
            fontFamily: FontFamily.heading,
            fontSize: 20,
            color: colors.textPrimary,
        },
        webBrandSubtitle: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        webProfileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        webProfileAvatar: {
            width: 42,
            height: 42,
            borderRadius: BorderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryBg,
        },
        webProfileAvatarText: {
            fontFamily: FontFamily.headingMedium,
            fontSize: 18,
            color: colors.primary,
        },
        webProfileCopy: {
            flex: 1,
        },
        webProfileName: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        webProfileMeta: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        webTabStack: {
            gap: 10,
        },
        webTabButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderColor: 'transparent',
        },
        webTabButtonActive: {
            backgroundColor: colors.panelSurface,
            borderColor: colors.border,
        },
        webTabIconWrap: {
            width: 42,
            height: 42,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
        },
        webTabCopy: {
            flex: 1,
        },
        webTabLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        webTabLabelActive: {
            color: colors.primary,
        },
        webTabHint: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
            marginTop: 2,
        },
        webSidebarBottom: {
            gap: 12,
        },
        webSidePanel: {
            gap: 12,
            padding: 14,
            borderRadius: BorderRadius['3xl'],
            backgroundColor: colors.panelSurface,
            borderWidth: 1,
            borderColor: colors.border,
        },
        webSidePanelTitle: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.body,
            color: colors.textPrimary,
        },
        webSidePanelRow: {
            gap: 8,
        },
        webSidePanelLabel: {
            fontFamily: FontFamily.body,
            fontSize: FontSize.caption,
            color: colors.textSecondary,
        },
        webShortcutButton: {
            minHeight: 42,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            borderRadius: BorderRadius['2xl'],
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
        },
        webShortcutLabel: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
            color: colors.textPrimary,
        },
        tabBarShell: {},
        tabBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: isCompact ? 8 : 10,
            paddingTop: isCompact ? 10 : 12,
            paddingBottom: 4,
            borderRadius: BorderRadius['5xl'],
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: Platform.OS === 'ios' ? 0.14 : 0.22,
            shadowRadius: 28,
            elevation: 16,
            backgroundColor: colors.surfaceGlass,
        },
        pressable: {
            flex: 1,
        },
        tabButton: {
            minHeight: isCompact ? 60 : 64,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: BorderRadius['4xl'],
            overflow: 'hidden',
            paddingHorizontal: 4,
            paddingVertical: isCompact ? 8 : 10,
            position: 'relative',
        },
        activeGlow: {
            ...StyleSheet.absoluteFillObject,
            borderRadius: BorderRadius['4xl'],
        },
        activeIndicator: {
            position: 'absolute',
            top: 0,
            alignSelf: 'center',
            width: 26,
            height: 4,
            borderBottomLeftRadius: BorderRadius.sm,
            borderBottomRightRadius: BorderRadius.sm,
        },
        iconWrap: {
            width: isCompact ? 38 : 40,
            height: isCompact ? 38 : 40,
            borderRadius: BorderRadius['2xl'],
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabLabel: {
            fontFamily: FontFamily.bodyMedium,
            fontSize: isCompact ? 10 : 11,
            textAlign: 'center',
            letterSpacing: 0.15,
        },
        tabLabelFocused: {
            fontFamily: FontFamily.bodyBold,
            fontSize: FontSize.caption,
        },
    });

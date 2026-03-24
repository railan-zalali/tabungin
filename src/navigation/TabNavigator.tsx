import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Shadow } from '../constants/theme';
import type { TabParamList } from '../types/navigation';
import { useTransactionStore } from '../store/useTransactionStore';
import { useWalletStore } from '../store/useWalletStore';

// Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TransactionStackNavigator } from './TransactionStackNavigator';
import { WalletStackNavigator } from './WalletStackNavigator';
import { ReportScreen } from '../screens/report/ReportScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator<TabParamList>();

interface TabIconProps {
    name: string;
    label: string;
    focused: boolean;
    color: string;
}

function TabIcon({ name, label, focused, color }: TabIconProps) {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        if (focused) {
            scale.value = withSpring(1.2, { damping: 10, stiffness: 200 });
            translateY.value = withSpring(-4, { damping: 10 });
        } else {
            scale.value = withSpring(1, { damping: 15 });
            translateY.value = withSpring(0, { damping: 15 });
        }
    }, [focused]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
    }));

    return (
        <Animated.View style={[styles.tabItem, animStyle]}>
            <MaterialCommunityIcons
                name={name as any}
                size={24}
                color={color}
                accessibilityElementsHidden={true}
            />
            <Text
                style={[styles.tabLabel, { color, opacity: focused ? 1 : 0.7 }]}
                allowFontScaling={false}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Animated.View>
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
    }, []);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'home' : 'home-outline'} label="Beranda" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionStackNavigator}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'swap-horizontal-bold' : 'swap-horizontal'} label="Transaksi" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Wallet"
                component={WalletStackNavigator}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'wallet' : 'wallet-outline'} label="Dompet" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Report"
                component={ReportScreen}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'chart-bar' : 'chart-bar'} label="Laporan" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsStackNavigator}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'cog' : 'cog-outline'} label="Setelan" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'bell' : 'bell-outline'} label="Notifikasi" focused={focused} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: Platform.OS === 'ios' ? 88 : 70,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -2 },
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: 60, 
    },
    tabLabel: {
        fontFamily: FontFamily.bodyMedium,
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
});

// Tab navigator bawah dengan icon bounce animation
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Shadow } from '../constants/theme';
import type { TabParamList } from '../types/navigation';

// Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TransactionStackNavigator } from './TransactionStackNavigator';
import { SavingStackNavigator } from './SavingStackNavigator';
import { ReportScreen } from '../screens/report/ReportScreen';
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

    React.useEffect(() => {
        if (focused) {
            scale.value = withSpring(1.1, { damping: 8, stiffness: 200 }, () => {
                scale.value = withSpring(1, { damping: 12 });
            });
        }
    }, [focused]);

    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View style={[styles.tabItem, animStyle]}>
            <MaterialCommunityIcons
                name={name as any}
                size={24}
                color={color}
                accessibilityElementsHidden={true}
            />
            <Text
                style={[styles.tabLabel, { color }]}
                allowFontScaling={false}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Animated.View>
    );
}

export function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarButton: (props) => (
                    <Pressable
                        {...props}
                        accessible={true}
                        accessibilityRole="tab"
                        style={({ pressed }) => [props.style as any, pressed && { opacity: 0.8 }]}
                    />
                ),
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarAccessibilityLabel: 'Dashboard, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'home' : 'home-outline'} label="Dashboard" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Transaksi, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'swap-horizontal-bold' : 'swap-horizontal'} label="Transaksi" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Savings"
                component={SavingStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Tabungan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'piggy-bank' : 'piggy-bank-outline'} label="Tabungan" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Report"
                component={ReportScreen}
                options={{
                    tabBarAccessibilityLabel: 'Laporan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'chart-bar' : 'chart-bar'} label="Laporan" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Pengaturan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'cog' : 'cog-outline'} label="Profil" focused={focused} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 72,
        paddingBottom: 12,
        paddingTop: 8,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        ...Shadow.md,
    },
    tabItem: {
        alignItems: 'center',
        gap: 3,
        minWidth: 48,
        minHeight: 48,
        justifyContent: 'center',
    },
    tabLabel: {
        fontFamily: FontFamily.body,
        fontSize: 10,
    },
});

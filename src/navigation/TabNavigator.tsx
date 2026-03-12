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
    const translateY = useSharedValue(0);

    React.useEffect(() => {
        if (focused) {
            scale.value = withSpring(1.2, { damping: 10, stiffness: 200 });
            translateY.value = withSpring(-2, { damping: 10 });
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
                size={26}
                color={color}
                accessibilityElementsHidden={true}
            />
            {focused && (
                <Text
                    style={[styles.tabLabel, { color }]}
                    allowFontScaling={false}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            )}
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
                        ref={props.ref as any}
                        accessible={true}
                        accessibilityRole="tab"
                        onPress={(e) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            props.onPress?.(e);
                        }}
                        style={({ pressed }) => [
                            props.style as any,
                            styles.tabButton,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                        ]}
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
                        <TabIcon name={focused ? 'home' : 'home-outline'} label="Home" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Transaksi, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'swap-horizontal-bold' : 'swap-horizontal'} label="Trans" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Savings"
                component={SavingStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Tabungan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'piggy-bank' : 'piggy-bank-outline'} label="Save" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Report"
                component={ReportScreen}
                options={{
                    tabBarAccessibilityLabel: 'Laporan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'chart-bar' : 'chart-bar'} label="Report" focused={focused} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsStackNavigator}
                options={{
                    tabBarAccessibilityLabel: 'Pengaturan, tab',
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? 'cog' : 'cog-outline'} label="Setting" focused={focused} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderTopWidth: 0,
        ...Shadow.lg,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        paddingBottom: 0, 
        paddingTop: 0,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    tabLabel: {
        fontFamily: FontFamily.bold,
        fontSize: 10,
        marginTop: 2,
    },
});

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { withScreenErrorBoundary } from '../components/common/AppErrorBoundary';

import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';
import { CategoryManagementScreen } from '../screens/category/CategoryManagementScreen';
import { ExportDataScreen } from '../screens/settings/ExportDataScreen';

// Di-hoist ke module scope agar tipe komponen stabil (tidak remount tiap render).
const SettingsMain = withScreenErrorBoundary(SettingsScreen);
const Profile = withScreenErrorBoundary(ProfileScreen);
const Notifications = withScreenErrorBoundary(NotificationScreen);
const CategoryManagement = withScreenErrorBoundary(CategoryManagementScreen);
const ExportData = withScreenErrorBoundary(ExportDataScreen);

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
    return (
        <Stack.Navigator initialRouteName="SettingsMain" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SettingsMain" component={SettingsMain} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="CategoryManagement" component={CategoryManagement} />
            <Stack.Screen name="ExportData" component={ExportData} />
            {/* Wallet routes hanya didaftarkan di WalletStackNavigator.
                Dari Settings gunakan cross-tab navigation:
                navigation.navigate('Wallet', { screen: 'WalletList' }) */}
        </Stack.Navigator>
    );
}

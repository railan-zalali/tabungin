// Tipe navigasi React Navigation untuk Tabungin
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Wallet } from '../database/walletQueries';

// Stack Navigator Root
export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    AuthCallback: undefined;
    ResetPassword: { access_token?: string; refresh_token?: string; type?: string; error_description?: string } | undefined;
    Main: NavigatorScreenParams<TabParamList>;
    Budget: undefined;
    Savings: NavigatorScreenParams<SavingStackParamList>;
};

export type WalletRouteParams = { wallet?: Wallet } | undefined;

// Bottom Tab Navigator
export type TabParamList = {
    Dashboard: undefined;
    Transactions: NavigatorScreenParams<TransactionStackParamList>;
    Wallet: NavigatorScreenParams<WalletStackParamList>;
    Report: undefined;
    Settings: NavigatorScreenParams<SettingsStackParamList>;
};

// Transaction Stack
export type TransactionStackParamList = {
    TransactionList: undefined;
    AddTransaction: { editId?: string; type?: 'income' | 'expense' } | undefined;
    TransactionDetail: { transactionId: string };
    RecurringTransaction: undefined;
};

// Saving Stack
export type SavingStackParamList = {
    SavingList: undefined;
    AddSavingGoal: { editId?: string } | undefined;
    SavingDetail: { goalId: string };
};

// Wallet Stack
export type WalletStackParamList = {
    WalletList: undefined;
    AddWallet: WalletRouteParams;
    QRScanner: undefined;
    JoinWallet: { walletId: string };
};

// Settings Stack
export type SettingsStackParamList = {
    SettingsMain: undefined;
    Profile: undefined;
    Notifications: undefined;
    CategoryManagement: undefined;
    ExportData: undefined;
    WalletList: undefined;
    AddWallet: WalletRouteParams;
    QRScanner: undefined;
    JoinWallet: { walletId: string };
};

export type DashboardNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Dashboard'>,
    NativeStackNavigationProp<RootStackParamList>
>;

export type SettingsNavigationProp = CompositeNavigationProp<
    NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>,
    CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Settings'>,
        NativeStackNavigationProp<RootStackParamList>
    >
>;

export type SettingsChildNavigationProp<Screen extends keyof SettingsStackParamList> = CompositeNavigationProp<
    NativeStackNavigationProp<SettingsStackParamList, Screen>,
    CompositeNavigationProp<
        BottomTabNavigationProp<TabParamList, 'Settings'>,
        NativeStackNavigationProp<RootStackParamList>
    >
>;

export type WalletFlowNavigationProp = CompositeNavigationProp<
    NativeStackNavigationProp<WalletStackParamList, 'WalletList'>,
    NativeStackNavigationProp<SettingsStackParamList>
>;

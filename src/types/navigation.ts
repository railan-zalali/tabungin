// Tipe navigasi React Navigation untuk Tabungin
import type { NavigatorScreenParams } from '@react-navigation/native';

// Stack Navigator Root
export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    AuthCallback: undefined;
    Main: NavigatorScreenParams<TabParamList>;
    Budget: undefined;
    Savings: NavigatorScreenParams<SavingStackParamList>;
};

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
    AddWallet: { wallet?: any } | undefined;
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
    AddWallet: { wallet?: any } | undefined;
    QRScanner: undefined;
    JoinWallet: { walletId: string };
};

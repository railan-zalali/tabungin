// Tipe navigasi React Navigation untuk Tabungin


// Stack Navigator Root
export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: undefined;
    Main: undefined;
    Budget: undefined;
    Savings: undefined; // Moved here
};

// Bottom Tab Navigator
export type TabParamList = {
    Dashboard: undefined;
    Transactions: undefined;
    Wallet: undefined; // Replaced Savings
    Report: undefined;
    Settings: undefined;
};

// Transaction Stack
export type TransactionStackParamList = {
    TransactionList: undefined;
    AddTransaction: { editId?: string; type?: 'income' | 'expense' } | undefined;
    TransactionDetail: { transactionId: string };
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
    WalletList: undefined;
    AddWallet: { wallet?: any } | undefined;
};

// Tipe navigasi React Navigation untuk Tabungin


// Stack Navigator Root
export type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
    Register: undefined;
    Main: undefined;
    Budget: undefined;
};

// Bottom Tab Navigator
export type TabParamList = {
    Dashboard: undefined;
    Transactions: undefined;
    Savings: undefined;
    Report: undefined;
    Settings: undefined;
};

// Transaction Stack
export type TransactionStackParamList = {
    TransactionList: undefined;
    AddTransaction: { editId?: string } | undefined;
    TransactionDetail: { transactionId: string };
};

// Saving Stack
export type SavingStackParamList = {
    SavingList: undefined;
    AddSavingGoal: { editId?: string } | undefined;
    SavingDetail: { goalId: string };
};

// Settings Stack
export type SettingsStackParamList = {
    SettingsMain: undefined;
    Profile: undefined;
};

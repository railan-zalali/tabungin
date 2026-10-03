export const linking = {
    prefixes: ['tabungin://'],
    config: {
        screens: {
            Onboarding: 'onboarding',
            Login: 'login',
            Register: 'register',
            ForgotPassword: 'forgot-password',
            Main: {
                screens: {
                    Dashboard: 'dashboard',
                    Transactions: 'transactions',
                    Wallet: {
                        screens: {
                            WalletList: 'my-wallets',
                            AddWallet: 'wallets/edit/:walletId',
                            QRScanner: 'wallets/qr-scan',
                            JoinWallet: 'wallets/join/:walletId',
                        },
                    },
                    Settings: {
                        screens: {
                            SettingsMain: 'settings',
                            Profile: 'profile',
                        },
                    },
                },
            },
            Budget: 'budget',
            Savings: {
                screens: {
                    SavingList: 'savings',
                    AddSavingGoal: 'savings/add',
                    SavingDetail: 'savings/:goalId',
                },
            },
            NotFound: '*',
        },
    },
};

import * as Linking from 'expo-linking';

export const linking = {
  prefixes: ['tabungin://'],
  config: {
    screens: {
      // Auth Screens (Available when not logged in)
      Onboarding: 'onboarding',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',

      // Main App (Available when logged in)
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Transactions: 'transactions',

          // Wallet Tab — includes QR Scanner & Join Wallet
          // URL format: tabungin://wallets/join/:walletId  ← QR code format
          // URL format: tabungin://wallets/qr-scan         ← scanner screen
          Wallet: {
            screens: {
              WalletList: 'my-wallets',
              AddWallet: 'wallets/edit/:walletId',
              QRScanner: 'wallets/qr-scan',
              JoinWallet: 'wallets/join/:walletId',
            },
          },

          // Settings Tab — separate copy for settings-originated deep links
          Settings: {
            screens: {
              SettingsMain: 'settings',
              Profile: 'profile',
              WalletList: 'wallets',
              AddWallet: 'wallet/:walletId',
            },
          },
        },
      },

      // Other Stacks
      Budget: 'budget',
      Savings: {
        screens: {
          SavingList: 'savings',
          AddSavingGoal: 'savings/add',
          SavingDetail: 'savings/:goalId',
        },
      },

      // Catch all
      NotFound: '*',
    },
  },
};

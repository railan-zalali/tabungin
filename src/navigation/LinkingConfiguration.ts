import * as Linking from 'expo-linking';

export const linking = {
  prefixes: [Linking.createURL('/'), 'tabungin://'],
  config: {
    screens: {
      // Auth Screens (Available when not logged in)
      Onboarding: 'onboarding',
      Login: 'login',
      Register: 'register',
      
      // Main App (Available when logged in)
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Transactions: 'transactions',
          // Wallet Tab
          Wallet: {
            screens: {
              WalletList: 'my-wallets',
              JoinWallet: 'invite/:walletId',
            },
          },
          // Settings Tab
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
        }
      },
      
      // Catch all
      NotFound: '*',
    },
  },
};

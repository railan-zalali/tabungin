import fs from 'fs';
import path from 'path';

const screenFiles = [
  'src/screens/dashboard/DashboardScreen.tsx',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/report/ReportScreen.tsx',
  'src/screens/budget/BudgetScreen.tsx',
  'src/screens/category/CategoryManagementScreen.tsx',
  'src/screens/settings/AppUpdateScreen.tsx',
  'src/screens/settings/ExportDataScreen.tsx',
  'src/screens/settings/ImportDataScreen.tsx',
  'src/screens/settings/ReminderCenterScreen.tsx',
  'src/screens/notification/NotificationScreen.tsx',
  'src/screens/settings/SettingsScreen.tsx',
  'src/screens/settings/WalletListScreen.tsx',
  'src/screens/settings/ProfileScreen.tsx',
  'src/screens/settings/AddWalletScreen.tsx',
  'src/screens/transaction/AddTransactionScreen.tsx',
  'src/screens/transaction/RecurringTransactionScreen.tsx',
  'src/screens/transaction/TransactionListScreen.tsx',
  'src/screens/transaction/TransactionDetailScreen.tsx',
  'src/screens/wallet/JoinWalletScreen.tsx',
  'src/screens/saving/AddSavingGoalScreen.tsx',
  'src/screens/saving/SavingDetailScreen.tsx',
  'src/screens/saving/SavingListScreen.tsx',
];

function readFile(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('ui consistency guardrails', () => {
  it('keeps all priority screens on the shared shell and header primitives', () => {
    for (const file of screenFiles) {
      const source = readFile(file);
      expect(source).toContain('ScreenShell');
      if (!file.includes('LoginScreen')) {
        expect(source).toContain('AppScreenHeader');
      }
      expect(source).not.toContain('SafeAreaView');
    }
  });

  it('uses the shared section and action primitives for form/detail flows', () => {
    const formHeavyScreens = [
      'src/screens/budget/BudgetScreen.tsx',
      'src/screens/category/CategoryManagementScreen.tsx',
      'src/screens/settings/ProfileScreen.tsx',
      'src/screens/settings/AddWalletScreen.tsx',
      'src/screens/transaction/AddTransactionScreen.tsx',
      'src/screens/transaction/RecurringTransactionScreen.tsx',
      'src/screens/transaction/TransactionDetailScreen.tsx',
      'src/screens/saving/AddSavingGoalScreen.tsx',
      'src/screens/saving/SavingDetailScreen.tsx',
    ];

    for (const file of formHeavyScreens) {
      const source = readFile(file);
      expect(source).toContain('FormSection');
    }

    for (const file of [
      'src/screens/budget/BudgetScreen.tsx',
      'src/screens/settings/ProfileScreen.tsx',
      'src/screens/settings/AddWalletScreen.tsx',
      'src/screens/transaction/AddTransactionScreen.tsx',
      'src/screens/transaction/TransactionDetailScreen.tsx',
      'src/screens/saving/AddSavingGoalScreen.tsx',
      'src/screens/saving/SavingDetailScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).toContain('PrimaryActionBar');
    }
  });

  it('routes spacing through responsive metrics instead of per-screen tab offsets', () => {
    for (const file of screenFiles) {
      const source = readFile(file);
      if (file.includes('LoginScreen')) {
        continue;
      }
      expect(source).toContain('useResponsiveMetrics');
      expect(source).not.toContain('TAB_BAR_OVERLAY_OFFSET');
    }
  });

  it('keeps auth and onboarding flows on responsive mobile spacing instead of fixed paddings', () => {
    for (const file of [
      'src/screens/auth/AuthCallbackScreen.tsx',
      'src/screens/auth/ForgotPasswordScreen.tsx',
      'src/screens/auth/LoginScreen.tsx',
      'src/screens/auth/OnboardingScreen.tsx',
      'src/screens/auth/RegisterScreen.tsx',
      'src/screens/auth/GuestDataMergeScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).toContain('useResponsiveMetrics');
      expect(source).not.toContain('paddingTop: 72');
      expect(source).not.toContain('paddingHorizontal: 20');
    }
  });

  it('keeps sticky action screens on shared floating action clearances', () => {
    for (const file of [
      'src/screens/budget/BudgetScreen.tsx',
      'src/screens/settings/AddWalletScreen.tsx',
      'src/screens/settings/ProfileScreen.tsx',
      'src/screens/saving/AddSavingGoalScreen.tsx',
      'src/screens/saving/SavingDetailScreen.tsx',
      'src/screens/transaction/AddTransactionScreen.tsx',
      'src/screens/transaction/TransactionDetailScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).toContain('floatingActionClearance');
      expect(source).toContain('bottomInset={metrics.tabBarClearance}');
      expect(source).not.toContain('bottomActionInset');
    }
  });

  it('keeps tab navigation on brand accents instead of semantic status colors', () => {
    const source = readFile('src/navigation/TabNavigator.tsx');
    expect(source).not.toContain("accent: 'success'");
    expect(source).not.toContain("accent: 'warning'");
    expect(source).not.toContain("accent: 'info'");
    expect(source).toContain('return colors.primary;');
  });

  it('routes picker palettes through the shared accent palette', () => {
    for (const file of [
      'src/components/profile/ProfileSwitcher.tsx',
      'src/screens/settings/AddWalletScreen.tsx',
      'src/constants/categories.ts',
    ]) {
      const source = readFile(file);
      expect(source).toContain('AppAccentPalette');
      expect(source).not.toContain('#1DB954');
    }
  });

  it('derives icon contrast from dynamic color surfaces', () => {
    for (const file of [
      'src/components/profile/ProfileSwitcher.tsx',
      'src/screens/settings/AddWalletScreen.tsx',
      'src/screens/settings/WalletListScreen.tsx',
      'src/screens/saving/AddSavingGoalScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).toContain('getReadableTextColor');
    }
  });

  it('keeps settings copy free from mojibake bullet artifacts', () => {
    for (const file of [
      'App.tsx',
      'src/screens/settings/AppUpdateScreen.tsx',
      'src/screens/settings/ExportDataScreen.tsx',
      'src/screens/settings/ImportDataScreen.tsx',
      'src/screens/settings/ReminderCenterScreen.tsx',
      'src/screens/notification/NotificationScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).not.toContain('\u00e2\u20ac\u00a2');
      expect(source).not.toContain('\u00f0\u0178');
    }
  });

  it('keeps legacy brand color out of schema defaults and redesigned screen code', () => {
    for (const file of [
      'app.json',
      'App.tsx',
      'src/database/schema.ts',
      'src/screens/dashboard/DashboardScreen.tsx',
      'src/screens/report/ReportScreen.tsx',
      'src/screens/settings/SettingsScreen.tsx',
      'src/screens/transaction/AddTransactionScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).not.toContain('#1DB954');
    }
  });

  it('loads icon fonts in the app shell so web icons render correctly', () => {
    const source = readFile('App.tsx');
    expect(source).toContain('MaterialCommunityIcons');
    expect(source).toContain('...MaterialCommunityIcons.font');
  });

  it('routes redesigned core screens through the new premium primitives', () => {
    const sourceMap = {
      'src/screens/dashboard/DashboardScreen.tsx': ['ActionTile', 'MetricCard'],
      'src/screens/report/ReportScreen.tsx': ['MetricCard', 'StatStrip'],
      'src/screens/settings/AppUpdateScreen.tsx': ['MetricCard', 'InlineNotice'],
      'src/screens/settings/ExportDataScreen.tsx': ['SelectionChip', 'MetricCard', 'InlineNotice'],
      'src/screens/settings/ImportDataScreen.tsx': ['MetricCard', 'InlineNotice'],
      'src/screens/settings/AddWalletScreen.tsx': ['SelectionChip', 'StatStrip', 'InlineNotice'],
      'src/screens/settings/ReminderCenterScreen.tsx': ['MetricCard', 'SelectionChip', 'InlineNotice'],
      'src/screens/settings/SettingsScreen.tsx': ['SettingsGroup', 'InlineNotice'],
      'src/screens/transaction/AddTransactionScreen.tsx': ['SelectionChip', 'InfoRow'],
      'src/screens/transaction/RecurringTransactionScreen.tsx': ['SelectionChip', 'StatStrip', 'InlineNotice'],
      'src/screens/transaction/TransactionListScreen.tsx': ['StatStrip'],
      'src/screens/notification/NotificationScreen.tsx': ['StatStrip', 'InlineNotice'],
      'src/screens/settings/WalletListScreen.tsx': ['StatStrip'],
      'src/screens/wallet/JoinWalletScreen.tsx': ['InfoRow', 'StatStrip', 'InlineNotice'],
      'src/screens/saving/SavingListScreen.tsx': ['StatStrip'],
    } as const;

    for (const [file, primitives] of Object.entries(sourceMap)) {
      const source = readFile(file);
      for (const primitive of primitives) {
        expect(source).toContain(primitive);
      }
    }
  });
});

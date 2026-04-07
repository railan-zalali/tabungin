import fs from 'fs';
import path from 'path';

const screenFiles = [
  'src/screens/budget/BudgetScreen.tsx',
  'src/screens/category/CategoryManagementScreen.tsx',
  'src/screens/settings/AppUpdateScreen.tsx',
  'src/screens/settings/ExportDataScreen.tsx',
  'src/screens/settings/ImportDataScreen.tsx',
  'src/screens/settings/ReminderCenterScreen.tsx',
  'src/screens/settings/SettingsScreen.tsx',
  'src/screens/settings/WalletListScreen.tsx',
  'src/screens/settings/ProfileScreen.tsx',
  'src/screens/transaction/AddTransactionScreen.tsx',
  'src/screens/transaction/TransactionDetailScreen.tsx',
  'src/screens/saving/AddSavingGoalScreen.tsx',
  'src/screens/saving/SavingDetailScreen.tsx',
];

function readFile(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('ui consistency guardrails', () => {
  it('keeps all priority screens on the shared shell and header primitives', () => {
    for (const file of screenFiles) {
      const source = readFile(file);
      expect(source).toContain('ScreenShell');
      expect(source).toContain('AppScreenHeader');
      expect(source).not.toContain('SafeAreaView');
    }
  });

  it('uses the shared section and action primitives for form/detail flows', () => {
    const formHeavyScreens = [
      'src/screens/budget/BudgetScreen.tsx',
      'src/screens/category/CategoryManagementScreen.tsx',
      'src/screens/settings/ProfileScreen.tsx',
      'src/screens/transaction/AddTransactionScreen.tsx',
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
      expect(source).toContain('useResponsiveMetrics');
      expect(source).not.toContain('TAB_BAR_OVERLAY_OFFSET');
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
      'src/screens/wallet/JoinWalletScreen.tsx',
      'src/screens/settings/WalletListScreen.tsx',
      'src/screens/saving/AddSavingGoalScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).toContain('getReadableTextColor');
    }
  });

  it('keeps settings copy free from mojibake bullet artifacts', () => {
    for (const file of [
      'src/screens/settings/AppUpdateScreen.tsx',
      'src/screens/settings/ExportDataScreen.tsx',
      'src/screens/settings/ReminderCenterScreen.tsx',
    ]) {
      const source = readFile(file);
      expect(source).not.toContain('\u00e2\u20ac\u00a2');
      expect(source).not.toContain('\u00f0\u0178');
    }
  });
});

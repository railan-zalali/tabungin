import fs from 'fs';
import path from 'path';

const screenFiles = [
  'src/screens/budget/BudgetScreen.tsx',
  'src/screens/category/CategoryManagementScreen.tsx',
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
});

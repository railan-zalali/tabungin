import fs from 'fs';
import path from 'path';

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('access visibility contracts', () => {
  it('requires active wallet membership before shared wallets contribute to local visibility', () => {
    const walletQueries = readSource('src/database/walletQueries.ts');
    const savingQueries = readSource('src/database/savingQueries.ts');

    expect(walletQueries).toContain("COALESCE(status, 'active') = 'active'");
    expect(savingQueries).toContain("COALESCE(status, 'active') = 'active'");
    expect(savingQueries).toContain("COALESCE(wm.status, 'active') = 'active'");
  });

  it('scopes remote sync to wallets the authenticated user can actually access', () => {
    const syncSource = readSource('src/database/sync.ts');

    expect(syncSource).toContain('fetchAccessibleRemoteWalletIds');
    expect(syncSource).toContain('query = query.in("id", [...accessibleWalletIds])');
    expect(syncSource).toContain('query = query.in("wallet_id", [...accessibleWalletIds])');
  });

  it('uses contrast-aware icon colors in wallet and saving hotspots', () => {
    const addGoalSource = readSource('src/screens/saving/AddSavingGoalScreen.tsx');
    const addTransactionSource = readSource('src/screens/transaction/AddTransactionScreen.tsx');
    const joinWalletSource = readSource('src/screens/wallet/JoinWalletScreen.tsx');
    const savingDetailSource = readSource('src/screens/saving/SavingDetailScreen.tsx');

    expect(addGoalSource).toContain('walletIconColor');
    expect(addGoalSource).toContain('getReadableTextColor(wallet.color');
    expect(addTransactionSource).toContain('walletIconColor');
    expect(addTransactionSource).toContain('getReadableTextColor(wallet.color');
    expect(joinWalletSource).toContain('walletIconColor');
    expect(savingDetailSource).toContain('goalAccentColor');
  });
});

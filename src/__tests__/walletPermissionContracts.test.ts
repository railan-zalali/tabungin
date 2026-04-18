import fs from 'fs';
import path from 'path';

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('wallet permission contracts', () => {
  it('classifies wallet sync rows before choosing upsert vs update', () => {
    const syncSource = readSource('src/database/sync.ts');

    expect(syncSource).toContain('type WalletPushMode = "owned_upsert" | "shared_update" | "skip_stale"');
    expect(syncSource).toContain('function classifyWalletPushMode');
    expect(syncSource).toContain('updateRemoteRecordById');
    expect(syncSource).toContain('mode=${walletClassification.pushMode}');
    expect(syncSource).toContain('syncAccessibleWalletsFromServer');
  });

  it('keeps wallet and transaction UI wired to shared capability helpers', () => {
    const walletListSource = readSource('src/screens/settings/WalletListScreen.tsx');
    const addWalletSource = readSource('src/screens/settings/AddWalletScreen.tsx');
    const addTransactionSource = readSource('src/screens/transaction/AddTransactionScreen.tsx');
    const transactionListSource = readSource('src/screens/transaction/TransactionListScreen.tsx');

    expect(walletListSource).toContain('getWalletCapabilities');
    expect(walletListSource).toContain('membershipRole={walletRoles[item.id] ?? null}');
    expect(addWalletSource).toContain('currentUserRole={walletCapabilities.resolvedRole');
    expect(addWalletSource).toContain('canInvite={walletCapabilities.canInviteMember}');
    expect(addTransactionSource).toContain('transactionReadOnly');
    expect(transactionListSource).toContain('canManage={!wallet || walletCapabilities.canManageTransactions}');
  });

  it('adds migration coverage for writable wallet permissions and sharing activity repair', () => {
    const migrationSource = readSource('supabase/migrations/202604090001_wallet_permission_alignment.sql');

    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.can_manage_wallet');
    expect(migrationSource).toContain('Members can manage accessible wallets');
    expect(migrationSource).toContain('Users can update writable transactions');
    expect(migrationSource).toContain('Wallet owners and editors can insert sharing activity');
    expect(migrationSource).toContain('Wallet owners and editors can insert shared goals');
  });
});

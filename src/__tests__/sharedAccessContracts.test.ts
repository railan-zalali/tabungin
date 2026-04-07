import fs from 'fs';
import path from 'path';

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf8');
}

describe('shared access contracts', () => {
  it('requires active membership before exposing shared wallets and goals locally', () => {
    const walletQuerySource = readProjectFile('src/database/walletQueries.ts');
    const savingQuerySource = readProjectFile('src/database/savingQueries.ts');

    expect(walletQuerySource).toContain("COALESCE(status, 'active') = 'active'");
    expect(savingQuerySource).toContain("COALESCE(status, 'active') = 'active'");
  });

  it('prunes stale shared wallet goals and logs when remote wallet access disappears', () => {
    const sharingServiceSource = readProjectFile('src/database/walletSharingService.ts');

    expect(sharingServiceSource).toContain('DELETE FROM saving_logs WHERE goal_id IN');
    expect(sharingServiceSource).toContain('DELETE FROM saving_goals WHERE id IN');
  });

  it('keeps Supabase migration aligned with shared-wallet saving and budget sync', () => {
    const migrationSource = readProjectFile('supabase/migrations/202604060002_sync_shared_goal_budget_alignment.sql');

    expect(migrationSource).toContain('ADD COLUMN IF NOT EXISTS deadline_at BIGINT');
    expect(migrationSource).toContain('Shared owners and editors can insert budgets');
    expect(migrationSource).toContain('Shared owners and editors can insert saving goals');
    expect(migrationSource).toContain('Shared owners and editors can insert saving logs');
  });
});

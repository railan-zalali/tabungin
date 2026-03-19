import { fetchWalletMembersForDisplay } from "../src/database/walletSharingService";
import { getDatabase } from "../src/database/schema";
import { supabase } from "../src/lib/supabase";

jest.mock("../src/database/schema", () => ({
  getDatabase: jest.fn(),
}));

jest.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock("../src/store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({
      user: {
        email: "",
      },
    }),
  },
}));

describe("walletSharingService", () => {
  let mockDb: any;
  let mockRunAsync: jest.Mock;
  let mockWithTransactionAsync: jest.Mock;

  beforeEach(() => {
    mockRunAsync = jest.fn().mockResolvedValue(undefined);
    mockWithTransactionAsync = jest.fn(async (callback) => callback());
    mockDb = {
      runAsync: mockRunAsync,
      withTransactionAsync: mockWithTransactionAsync,
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
  });

  it("loads remote members, lowercases email, and mirrors them locally", async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: "member-1",
            wallet_id: "wallet-1",
            user_email: "Friend@Email.com",
            role: "editor",
            status: "pending",
            created_at: 1,
            updated_at: 2,
          },
        ],
        error: null,
      }),
    };

    (supabase.from as jest.Mock).mockReturnValue(query);

    const members = await fetchWalletMembersForDisplay("wallet-1");

    expect(members).toEqual([
      {
        id: "member-1",
        wallet_id: "wallet-1",
        user_email: "friend@email.com",
        role: "editor",
        status: "pending",
        created_at: 1,
      },
    ]);

    expect(mockRunAsync).toHaveBeenCalledWith(
      "DELETE FROM wallet_members WHERE wallet_id = ? AND sync_status = 'synced'",
      ["wallet-1"],
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO wallet_members"),
      expect.arrayContaining(["friend@email.com"]),
    );
  });
});

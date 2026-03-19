import { fetchTransactions, insertTransaction } from "../src/database/transactionQueries";
import { getDatabase } from "../src/database/schema";

jest.mock("../src/database/schema", () => ({
  getDatabase: jest.fn(),
}));

describe("transactionQueries shared wallet behavior", () => {
  let mockDb: any;
  let mockRunAsync: jest.Mock;
  let mockGetFirstAsync: jest.Mock;
  let mockGetAllAsync: jest.Mock;
  let mockWithTransactionAsync: jest.Mock;

  beforeEach(() => {
    mockRunAsync = jest.fn();
    mockGetFirstAsync = jest.fn();
    mockGetAllAsync = jest.fn().mockResolvedValue([]);
    mockWithTransactionAsync = jest.fn(async (callback) => callback());

    mockDb = {
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
      withTransactionAsync: mockWithTransactionAsync,
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  it("uses the selected wallet profile_id when inserting a shared-wallet transaction", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ profile_id: "owner_profile_id" });

    await insertTransaction({
      type: "expense",
      amount: 75000,
      category: "food",
      note: "Makan malam",
      date: 1710000000000,
      wallet_id: "wallet_shared",
      profile_id: "member_profile_id",
    });

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO transactions"),
      expect.arrayContaining(["wallet_shared", "owner_profile_id"]),
    );
  });

  it("filters transactions through accessible wallets instead of raw membership only", async () => {
    await fetchTransactions({
      profile_id: "owner_profile_id",
      userEmail: "member@example.com",
      type: "all",
    });

    expect(mockGetAllAsync).toHaveBeenCalledTimes(1);
    const [query, params] = mockGetAllAsync.mock.calls[0];

    expect(query).toContain("wallet_id IN (");
    expect(query).toContain("SELECT id");
    expect(query).toContain("FROM wallets");
    expect(query).toContain("lower(user_email) = lower(?)");
    expect(params).toEqual(["owner_profile_id", "member@example.com", "owner_profile_id"]);
  });
});

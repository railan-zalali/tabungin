jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock("expo-linking", () => ({
  getInitialURL: jest.fn(),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("../src/database/schema", () => ({
  clearAllData: jest.fn(),
}));

jest.mock("../src/database/sync", () => ({
  syncDatabase: jest.fn(),
}));

jest.mock("../src/lib/supabase", () => ({
  oauthRedirectUrl: "tabungin://auth/callback",
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signUp: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { clearAllData } from "../src/database/schema";
import { syncDatabase } from "../src/database/sync";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/store/useAuthStore";

describe("useAuthStore OAuth flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    useAuthStore.setState({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      authError: null,
      isDarkMode: false,
      textSize: "normal",
      hapticEnabled: true,
    });
  });

  it("completes Google login from PKCE code callback", async () => {
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.com",
            user_metadata: { name: "User One", avatar_color: "#123456" },
          },
        },
      },
      error: null,
    });

    const ok = await useAuthStore.getState().completeOAuthSession(
      "tabungin://auth/callback?code=pkce-code-123",
    );

    expect(ok).toBe(true);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code-123");
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User One",
      avatarColor: "#123456",
    });
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it("completes Google login from token callback", async () => {
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-2",
            email: "token@example.com",
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    const ok = await useAuthStore.getState().completeOAuthSession(
      "tabungin://auth/callback#access_token=access-123&refresh_token=refresh-123",
    );

    expect(ok).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access-123",
      refresh_token: "refresh-123",
    });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual({
      id: "user-2",
      email: "token@example.com",
      name: "Pengguna",
      avatarColor: "#1DB954",
    });
  });

  it("ignores non-auth initial deep links during session load", async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue("tabungin://wallets/join/wallet-123");

    await useAuthStore.getState().loadSession();

    expect(useAuthStore.getState().authError).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it("starts Google OAuth in browser and completes returned callback", async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize" },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "tabungin://auth/callback?code=browser-code",
    });
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-3",
            email: "browser@example.com",
            user_metadata: { name: "Browser User" },
          },
        },
      },
      error: null,
    });

    const ok = await useAuthStore.getState().loginWithGoogle();

    expect(ok).toBe(true);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "tabungin://auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/authorize",
      "tabungin://auth/callback",
    );
  });

  it("clears local data on logout", async () => {
    await useAuthStore.getState().logout();

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(clearAllData).toHaveBeenCalled();
  });
});

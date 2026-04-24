import { AppState } from "react-native";
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "placeholder_anon_key";

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

const hasPlaceholderUrl =
  rawSupabaseUrl.length === 0 ||
  rawSupabaseUrl === PLACEHOLDER_SUPABASE_URL ||
  rawSupabaseUrl.includes("placeholder.supabase.co");
const hasPlaceholderAnonKey =
  rawSupabaseAnonKey.length === 0 ||
  rawSupabaseAnonKey === PLACEHOLDER_SUPABASE_ANON_KEY ||
  rawSupabaseAnonKey.includes("placeholder_anon_key");

export const isSupabaseConfigured =
  /^https?:\/\/.+/i.test(rawSupabaseUrl) && !hasPlaceholderUrl && !hasPlaceholderAnonKey;

const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : PLACEHOLDER_SUPABASE_URL;
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : PLACEHOLDER_SUPABASE_ANON_KEY;

let hasWarnedAboutSupabaseConfig = false;

export function getSupabaseUnavailableMessage(feature: string = "Fitur online"): string {
  return `${feature} belum aktif karena EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY belum diisi.`;
}

export function warnIfSupabaseUnavailable(context?: string): void {
  if (isSupabaseConfigured || hasWarnedAboutSupabaseConfig) {
    return;
  }

  hasWarnedAboutSupabaseConfig = true;
  const suffix = context ? ` (${context})` : "";
  console.warn(
    `[Supabase] ${getSupabaseUnavailableMessage()} Tambahkan kedua env tersebut di file .env lalu restart Expo${suffix}.`,
  );
}

export function isSupabaseNetworkError(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  return message.includes("Network request failed") || message.includes("Failed to fetch");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (isSupabaseConfigured) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
} else {
  warnIfSupabaseUnavailable("startup");
}

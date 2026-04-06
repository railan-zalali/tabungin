import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const LAST_UPDATE_CHECK_KEY = 'tabungin_last_update_check_at';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface AppRelease {
    id: string;
    platform: 'android' | 'ios' | 'all';
    channel: string;
    version: string;
    build_number: number | null;
    min_supported_version: string | null;
    release_notes: string | null;
    download_url: string | null;
    is_active: boolean;
    created_at: number;
}

export interface AppUpdateStatus {
    currentVersion: string;
    currentBuildNumber: number;
    latestRelease: AppRelease | null;
    hasUpdate: boolean;
    isForceUpdate: boolean;
}

function parseVersion(value: string): number[] {
    return value.split('.').map((segment) => Number(segment) || 0);
}

export function compareVersions(current: string, target: string): number {
    const currentParts = parseVersion(current);
    const targetParts = parseVersion(target);
    const maxLength = Math.max(currentParts.length, targetParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const a = currentParts[index] ?? 0;
        const b = targetParts[index] ?? 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }

    return 0;
}

export function getCurrentAppVersion() {
    return {
        version: Constants.expoConfig?.version ?? '1.0.0',
        buildNumber: Number(Constants.expoConfig?.android?.versionCode ?? 0),
    };
}

export async function fetchLatestRelease(channel = 'production'): Promise<AppRelease | null> {
    const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .eq('is_active', true)
        .in('platform', [Platform.OS, 'all'])
        .eq('channel', channel)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[Update] Failed to fetch latest release:', error);
        return null;
    }

    return data as AppRelease | null;
}

export async function checkForAppUpdate(
    options?: { channel?: string; ignoreInterval?: boolean }
): Promise<AppUpdateStatus> {
    const { version, buildNumber } = getCurrentAppVersion();
    const channel = options?.channel ?? 'production';

    if (!options?.ignoreInterval) {
        const lastCheckRaw = await AsyncStorage.getItem(LAST_UPDATE_CHECK_KEY);
        const lastCheck = Number(lastCheckRaw || 0);
        if (lastCheck && Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
            return {
                currentVersion: version,
                currentBuildNumber: buildNumber,
                latestRelease: null,
                hasUpdate: false,
                isForceUpdate: false,
            };
        }
    }

    await AsyncStorage.setItem(LAST_UPDATE_CHECK_KEY, String(Date.now()));
    const latestRelease = await fetchLatestRelease(channel);
    if (!latestRelease) {
        return {
            currentVersion: version,
            currentBuildNumber: buildNumber,
            latestRelease: null,
            hasUpdate: false,
            isForceUpdate: false,
        };
    }

    const versionComparison = compareVersions(version, latestRelease.version);
    const buildComparison =
        latestRelease.build_number && latestRelease.build_number > 0
            ? buildNumber < latestRelease.build_number
            : false;
    const hasUpdate = versionComparison < 0 || (versionComparison === 0 && buildComparison);
    const isForceUpdate = Boolean(
        latestRelease.min_supported_version &&
            compareVersions(version, latestRelease.min_supported_version) < 0,
    );

    return {
        currentVersion: version,
        currentBuildNumber: buildNumber,
        latestRelease,
        hasUpdate,
        isForceUpdate,
    };
}

export async function openReleaseDownload(url: string | null): Promise<boolean> {
    if (!url) return false;
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
}

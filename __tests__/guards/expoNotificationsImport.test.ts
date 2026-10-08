// Guard impor `expo-notifications` (bug runtime Expo Go Android, SDK 53+).
//
// Di Android + Expo Go, `expo-notifications/build/warnOfExpoGoPushUsage.js`
// melempar Error begitu dipanggil. Yang memanggilnya di scope modul adalah
// DevicePushTokenAutoRegistration.fx (addPushTokenListener), dan modul itu
// diimpor oleh dua tempat:
//
//   1. barrel `expo-notifications` (build/index.js)
//   2. `expo-notifications/build/getExpoPushTokenAsync.js`
//
// Efeknya: satu import (1) membuat app crash sebelum kode kita sempat jalan.
// Impor (2) aman HANYA kalau dipanggil lazy setelah guard isRunningInExpoGo().
//
// Test ini memindai seluruh src dan gagal bila ada yang mengimpor barrel atau
// mem-require getExpoPushTokenAsync di scope modul.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = join(__dirname, '..', '..');
const SCAN_DIRS = ['src'];
const EXTENSIONS = ['.ts', '.tsx'];

// Baris yang MENCIRIimpor barrel. Import bertipe `import type` juga dilarang:
// type di-strip Babel, tapi bentuk kesalahannya persis sama dan konfusinya
// tidak sebanding dengan hematnya.
const BARREL_IMPORT =
    /^\s*import\s+(?!type\b)(?:[\s\S]*?\s+from\s+)?['"]expo-notifications['"]/;
// `require('expo-notifications')` atau require subpath di luar lazy require.
const REQUIRE_LINE = /\brequire\s*\(\s*['"](expo-notifications[^'"]*)['"]\s*\)/;

// Subpath yang aman: tidak menyentuh DevicePushTokenAutoRegistration.
const SAFE_SUBPATHS = [
    'expo-notifications/build/NotificationPermissions',
    'expo-notifications/build/NotificationsHandler',
    'expo-notifications/build/setNotificationChannelAsync',
    'expo-notifications/build/scheduleNotificationAsync',
    'expo-notifications/build/cancelScheduledNotificationAsync',
    'expo-notifications/build/getAllScheduledNotificationsAsync',
    'expo-notifications/build/NotificationChannelManager.types',
    // Pengecualian: aman HANYA kalau di-require di dalam fungsi (lazy),
    // setelah guard isRunningInExpoGo(). Sifat "lazy"-nya yang dicek test
    // kedua — import di scope modul akan membuat crash kembali muncul.
    'expo-notifications/build/getExpoPushTokenAsync',
];

function collectFiles(dir: string): string[] {
    const files: string[] = [];

    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...collectFiles(full));
        } else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) {
            files.push(full);
        }
    }

    return files;
}

function toPosix(path: string): string {
    return relative(ROOT, path).split(sep).join('/');
}

/**
 * Cek satu file: barrel dilarang, dan require hanya boleh menunjuk subpath aman.
 * Baris komentar diabaikan supaya catatan penjelasan di dalam kode tidak
 * ikut terperangkap.
 */
function checkFile(file: string): string[] {
    const relPath = toPosix(file);
    const violations: string[] = [];

    readFileSync(file, 'utf8')
        .split('\n')
        .forEach((rawLine, index) => {
            const line = rawLine.trim();
            if (!line || line.startsWith('//') || line.startsWith('*')) return;

            if (BARREL_IMPORT.test(line)) {
                violations.push(
                    `${relPath}:${index + 1} — barrel "expo-notifications" melempar error di Expo Go Android: ${line}`
                );
                return;
            }

            const required = line.match(REQUIRE_LINE)?.[1];
            if (required && !SAFE_SUBPATHS.includes(required)) {
                violations.push(
                    `${relPath}:${index + 1} — require subpath tidak aman "${required}": ${line}`
                );
            }
        });

    return violations;
}

describe('guard impor expo-notifications', () => {
    it('tidak ada src yang mengimpor barrel atau subpath yang melempar error di Expo Go', () => {
        const violations = SCAN_DIRS.flatMap((dir) =>
            collectFiles(join(ROOT, dir)).flatMap(checkFile)
        );

        expect(violations).toEqual([]);
    });

    it('getExpoPushTokenAsync tetap lazy (di dalam fungsi, setelah guard Expo Go)', () => {
        // Guard ini hilang kalau file dihapus: tanpa isRunningInExpoGo() di
        // jalur ambil token, modul yang melempar itu dieksekusi lagi.
        const content = readFileSync(
            join(ROOT, 'src/hooks/usePushNotifications.ts'),
            'utf8'
        );

        expect(content).toMatch(/if \(isRunningInExpoGo\(\)\)/);
        expect(content).toMatch(
            /require\('expo-notifications\/build\/getExpoPushTokenAsync'\)/
        );
        // Impor statis (bukan require) = crash, jadi harus tetap nol.
        expect(content).not.toMatch(
            /^import .*from 'expo-notifications\/build\/getExpoPushTokenAsync'/m
        );
    });
});

/**
 * Konfigurasi Metro Tabungin.
 *
 * Satu tujuan: memangkas bundle (P3-04 / §6.2 roadmap).
 *
 * `@expo/vector-icons` mengekspor 19 set ikon dari satu barrel, jadi Metro
 * ikut menyeret seluruh font ikonnya — 3,9 MB hanya untuk satu set yang
 * benar-benar dipakai. Modul dialihkan ke `src/lib/vectorIcons.ts` yang hanya
 * mengekspor MaterialCommunityIcons.
 *
 * Catatan chaining: sesuai dokumentasi Metro, resolver kustom wajib
 * mengembalikan `context.resolveRequest(...)` untuk modul yang tidak
 * disentuhnya — di situ letak resolver bawaan (dan resolver milik Expo).
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const VECTOR_ICONS_SHIM = path.resolve(__dirname, 'src/lib/vectorIcons.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '@expo/vector-icons') {
        return { type: 'sourceFile', filePath: VECTOR_ICONS_SHIM };
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

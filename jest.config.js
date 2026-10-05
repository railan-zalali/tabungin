/** Jest configuration for Tabungin React Native (Expo) project */
module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@supabase/.*|nativewind|react-native-qrcode-svg|victory-native|d3-.*|react-native-worklets|@shopify/react-native-skia|uuid|zustand)',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        // Catatan: 'react-native-reanimated' sengaja TIDAK dipetakan di sini.
        // Jest mock-nya didefinisikan di jest.setup.ts; mapper + jest.mock
        // untuk path yang sama menyebabkan factory memanggil dirinya sendiri
        // (infinite recursion / maximum call stack size exceeded).
    },
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
    // Cakupan dihitung untuk SELURUH src (bukan hanya utils/store/components)
    // agar angka coverage mewakili kesehatan sebenarnya — screens & query layer
    // ikut terukur. File tipe murni dikecualikan karena tidak punya eksekusi.
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/types/**',
        '!**/*.d.ts',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'clover'],
    // Angka per Okt 2026: 30% statements (1605/5340, 134 file). Threshold
    // dipasang DI BAWAH angka itu — tujuannya MEMBLOCKIR regresi, bukan
    // mengejar target. Angka naik → threshold ikut dinaikkan.
    // Target roadmap §8.3: 50% (Fase 2) → 80% (Fase 4).
    //
    // PERHATIAN (jangan ditambahi tanpa membaca ini): di Jest, file yang cocok
    // dengan group threshold SELAIN 'global' DIKELUARKAN dari pool 'global'
    // (lihat CoverageReporter.js → coveredFilesSortedIntoThresholdGroup).
    // Menambah glob di sini akan menurunkan angka 'global' secara artifisial —
    // seperti yang terjadi saat 'src/utils/**' dicoba: global anjlok 30% → 19%.
    coverageThreshold: {
        global: { statements: 29, branches: 27, functions: 26, lines: 29 },
    },
};

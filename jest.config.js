/** Jest configuration for Tabungin React Native (Expo) project */
module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@supabase/.*|nativewind|react-native-qrcode-svg|victory-native|d3-.*|react-native-worklets|@shopify/react-native-skia|uuid|zustand)',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^react-native-reanimated$': 'react-native-reanimated/mock',
    },
    testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
    collectCoverageFrom: [
        'src/utils/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        'src/database/syncQueue.ts',
        'src/components/**/*.{ts,tsx}',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'clover'],
};

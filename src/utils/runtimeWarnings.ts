const SAFE_AREA_DEPRECATION_WARNING =
    "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.";

const originalWarn = console.warn.bind(console);

console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(SAFE_AREA_DEPRECATION_WARNING)) {
        return;
    }

    originalWarn(...args);
};

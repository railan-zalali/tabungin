// Jest setup — mock untuk modul Expo dan Supabase
import 'react-native-gesture-handler/jestSetup';

// Mock expo modules
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn().mockResolvedValue({
        execAsync: jest.fn().mockResolvedValue(undefined),
        runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
        getFirstAsync: jest.fn().mockResolvedValue(null),
        getAllAsync: jest.fn().mockResolvedValue([]),
        withTransactionAsync: jest.fn((fn) => fn()),
    }),
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-crypto', () => ({
    digestStringAsync: jest.fn().mockResolvedValue('mocked-hash'),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
}));

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
    notificationAsync: jest.fn(),
    NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('expo-linear-gradient', () => ({
    LinearGradient: 'LinearGradient',
}));

jest.mock('expo-font', () => ({
    useFonts: jest.fn().mockReturnValue([true, null]),
    isLoaded: jest.fn().mockReturnValue(true),
}));

jest.mock('expo-status-bar', () => ({
    StatusBar: 'StatusBar',
}));

jest.mock('expo-notifications', () => ({
    scheduleNotificationAsync: jest.fn().mockResolvedValue('mocked-id'),
    cancelScheduledNotificationAsync: jest.fn(),
    getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(),
    removeNotificationSubscription: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
    launchImageLibraryAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-camera', () => ({
    Camera: 'Camera',
    CameraType: { back: 'back', front: 'front' },
}));

jest.mock('expo-linking', () => ({
    createURL: jest.fn((path) => `tabungin://${path}`),
    parse: jest.fn(),
    openURL: jest.fn(),
}));

jest.mock('expo-device', () => ({
    isDevice: true,
}));

jest.mock('expo-sharing', () => ({
    shareAsync: jest.fn(),
    isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-print', () => ({
    print: jest.fn(),
    printToFileAsync: jest.fn().mockResolvedValue({ uri: 'mocked-uri' }),
}));

jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn().mockResolvedValue(true),
    authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
    supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([]),
}));

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            updateUser: jest.fn(),
            resetPasswordForEmail: jest.fn(),
            onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
        channel: jest.fn(() => ({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn().mockReturnThis(),
            unsubscribe: jest.fn(),
        })),
        removeChannel: jest.fn(),
        getChannels: jest.fn().mockReturnValue([]),
        rpc: jest.fn(),
    })),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
    const inset = { top: 0, right: 0, bottom: 0, left: 0 };
    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
        SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
        useSafeAreaInsets: () => inset,
    };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
    MaterialCommunityIcons: 'MaterialCommunityIcons',
    Ionicons: 'Ionicons',
    Feather: 'Feather',
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid-v4'),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => 'QRCodeSVG');

// Suppress console.warn for known harmless warnings in test environment
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('Animated: `useNativeDriver`')) return;
    if (message.includes('componentWillReceiveProps')) return;
    originalWarn(...args);
};

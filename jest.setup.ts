// Jest setup — mock untuk modul Expo dan Supabase
import 'react-native-gesture-handler/jestSetup';
import type { ReactNode } from 'react';

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
    loadAsync: jest.fn().mockResolvedValue(undefined),
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

// Native datetimepicker dipakai AddTransactionScreen / AddDebtScreen.
jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const MockDateTimePicker = () => React.createElement('DateTimePicker', null);
    MockDateTimePicker.displayName = 'DateTimePicker';
    return { __esModule: true, default: MockDateTimePicker };
});

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

// Mock react-native-worklets — native module tidak tersedia di jest.
// Diminta oleh react-native-reanimated (via runtime/init).
jest.mock('react-native-worklets', () => ({
    createSerializable: (fn: unknown) => fn,
    serializableMappingCache: {
        set: () => {},
        get: () => undefined,
        clear: () => {},
    },
    runOnUI: (fn: unknown) => fn,
    runOnRuntime: (fn: unknown) => fn,
    createWorklet: (fn: unknown) => fn,
    scheduleOnRN: (fn: unknown) => fn,
}));

// Mock react-native-reanimated — mock mandiri, TIDAK memakai
// 'react-native-reanimated/mock' karena modul itu me-require src/index.ts
// yang menarik native runtime worklets (gagal di jest).
// Jangan tambahkan moduleNameMapper untuk path ini di jest.config.js:
// mapper + jest.mock pada path sama = factory require dirinya sendiri.
jest.mock('react-native-reanimated', () => {
    const React = require('react');
    const { View, Text, ScrollView, Image } = require('react-native');

    const createAnimatedComponent = (Component: unknown) => Component;

    const Animated = {
        View,
        Text,
        ScrollView,
        Image,
        createAnimatedComponent,
        // default callable shape: Animated.View sudah cukup untuk codebase ini
    };

    // Entering/exiting layout animations dipakai sebagai prop `entering={FadeInDown}`.
    // Return objek berantai (delay/springify/duration/...) agar pola
    // `FadeInDown.delay(x).springify()` di komponen ikut ter-render di test.
    const layoutAnimation = (): Record<string, unknown> => {
        const animation: Record<string, unknown> = {};
        const chain = () => animation;
        animation.delay = chain;
        animation.springify = chain;
        animation.duration = chain;
        animation.damping = chain;
        animation.mass = chain;
        animation.stiffness = chain;
        animation.initialVelocity = chain;
        animation.withCallback = chain;
        return animation;
    };

    const sharedValue = (initial: unknown) => ({ value: initial });

    return {
        __esModule: true,
        default: Animated,
        Animated,
        useSharedValue: sharedValue,
        useAnimatedStyle: (fn: () => unknown) => {
            // Panggil sekali agar style tereksekusi di test (catch error runtime)
            try {
                return typeof fn === 'function' ? fn() : {};
            } catch {
                return {};
            }
        },
        withSpring: (toValue: unknown) => toValue,
        withTiming: (toValue: unknown) => toValue,
        withDelay: (_delay: unknown, animation: unknown) => animation,
        withRepeat: (animation: unknown) => animation,
        withSequence: (...animations: unknown[]) => animations[0],
        runOnJS: (fn: unknown) => fn,
        runOnUI: (fn: unknown) => fn,
        Easing: {
            linear: (t: number) => t,
            ease: (t: number) => t,
            quad: (t: number) => t,
            cubic: (t: number) => t,
            bezier: () => (t: number) => t,
            in: (fn: (t: number) => number) => fn,
            out: (fn: (t: number) => number) => fn,
            inOut: (fn: (t: number) => number) => fn,
        },
        Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
        interpolate: (value: number) => value,
        FadeInDown: layoutAnimation(),
        FadeInUp: layoutAnimation(),
        FadeIn: layoutAnimation(),
        FadeOut: layoutAnimation(),
        Layout: layoutAnimation(),
        SlideInDown: layoutAnimation(),
        // no-op untuk API yang tidak dipakai tapi mungkin di-import
        useFrameCallback: () => ({}),
        useAnimatedRef: () => ({ current: null }),
        measure: () => null,
        useDerivedValue: (fn: unknown) => fn,
        cancelAnimation: () => {},
        JsRuntime: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    const inset = { top: 0, right: 0, bottom: 0, left: 0 };
    const frame = { x: 0, y: 0, width: 390, height: 844 };

    // @react-navigation/elements memakai context eksplisit (SafeAreaInsetsContext /
    // SafeAreaFrameContext); tanpa context yang valid useContext() melempar.
    const SafeAreaInsetsContext = React.createContext(inset);
    const SafeAreaFrameContext = React.createContext(frame);

    return {
        SafeAreaProvider: ({ children }: { children?: ReactNode }) => children ?? null,
        SafeAreaView: ({ children }: { children?: ReactNode }) => children ?? null,
        SafeAreaConsumer: ({ children }: { children: (value: typeof inset) => ReactNode }) =>
            children(inset),
        useSafeAreaInsets: () => inset,
        useSafeAreaFrame: () => frame,
        SafeAreaInsetsContext,
        SafeAreaFrameContext,
        initialWindowMetrics: null,
    };
});

// Mock @expo/vector-icons — sertakan glyphMap asli agar resolveMaterialIcon valid
jest.mock('@expo/vector-icons', () => {
    const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
    const Icon = () => null;
    Icon.glyphMap = glyphMap;
    return {
        MaterialCommunityIcons: Icon,
        Ionicons: Icon,
        Feather: Icon,
    };
});

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

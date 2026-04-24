// Palet warna utama Tabungin
// Berdasarkan UI/UX Revision Plan (Tailwind-like tokens)
export const Colors = {
    // Brand anchor
    primary: '#0EAD69',
    primaryDark: '#0A6E44',
    primaryLight: '#D7F8E9',
    primaryBg: '#F1FFF8',

    // Premium calm neutrals
    neutral950: '#09120E',
    neutral900: '#11211A',
    neutral800: '#21322A',
    neutral700: '#384A41',
    neutral600: '#54675E',
    neutral500: '#72857C',
    neutral400: '#A2B3AB',
    neutral300: '#C6D1CB',
    neutral200: '#DEE8E3',
    neutral100: '#EEF4F0',
    neutral50: '#F7FBF8',

    // Semantic / Status
    success: '#18A957',
    successBg: '#D8F6E2',
    warning: '#FF9F1C',
    warningBg: '#FFF0D3',
    danger: '#E5533D',
    dangerBg: '#FFE1DB',
    info: '#2F80ED',
    infoBg: '#DDEBFF',

    // Background & surface
    background: '#F5FBF7',
    backgroundAlt: '#ECF5EF',
    backgroundCanvas: '#E3F0E8',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F9F5',
    surfaceElevated: '#FFFFFF',
    surfaceCard: '#FBFFFC',
    surfaceGlass: 'rgba(255,255,255,0.86)',
    surfaceInset: '#E7F0EA',
    surfaceMuted: '#DBE7E0',

    // Text hierarchy
    textPrimary: '#0D1813',
    textSecondary: '#4E6359',
    textTertiary: '#72867B',
    textInverse: '#FFFFFF',
    textDisabled: '#9EB1A7',

    // Border & divider
    border: '#D3E0D8',
    borderStrong: '#AFC0B7',
    divider: '#E7F0EA',

    // Overlay & transparency
    overlay: 'rgba(9, 18, 14, 0.52)',
    overlayLight: 'rgba(9, 18, 14, 0.14)',

    transparent: 'transparent',

    // Semantic surfaces
    dangerLight: '#FFD5CC',
    successLight: '#BFF0D1',
    warningLight: '#FFE0A6',
    infoLight: '#D0E2FF',

    // Legacy compatibility
    secondary: '#FF9F1C',
    secondaryLight: '#FFE8BF',

    // Dark mode tokens
    dark: {
        background: '#07110C',
        backgroundAlt: '#0C1914',
        backgroundCanvas: '#10211A',
        surface: '#10201A',
        surfaceAlt: '#152720',
        surfaceElevated: '#193028',
        surfaceCard: '#13251E',
        surfaceGlass: 'rgba(16,32,26,0.88)',
        surfaceInset: '#0A1611',
        surfaceMuted: '#173028',
        textPrimary: '#F3FCF7',
        textSecondary: '#A2B8AD',
        textTertiary: '#7F9589',
        textDisabled: '#637B70',
        textInverse: '#F3FCF7',
        border: '#214239',
        borderStrong: '#2F5C4F',
        divider: '#163027',
        overlay: 'rgba(2, 6, 4, 0.76)',
        overlayLight: 'rgba(2, 6, 4, 0.32)',
        primaryLight: 'rgba(14, 173, 105, 0.24)',
        primaryBg: 'rgba(14, 173, 105, 0.16)',
        successBg: 'rgba(24, 169, 87, 0.2)',
        warningBg: 'rgba(255, 159, 28, 0.18)',
        dangerBg: 'rgba(229, 83, 61, 0.18)',
        infoBg: 'rgba(47, 128, 237, 0.18)',
    },
} as const;

// Warna kategori transaksi
export const CategoryColors: Record<string, string> = {
    'Makan & Minum': '#F59E0B',
    Transport: '#3B82F6',
    Belanja: '#8B5CF6',
    Hiburan: '#EC4899',
    Kesehatan: '#10B981',
    Pendidikan: '#06B6D4',
    Tagihan: '#EF4444',
    Lainnya: '#6B7280',
    Gaji: '#16A34A',
    Freelance: '#F5A623',
    Bisnis: '#0EA5E9',
    Investasi: '#7C3AED',
    Hadiah: '#F472B6',
};

// Palet warna utama Tabungin
// Berdasarkan UI/UX Revision Plan (Tailwind-like tokens)
export const Colors = {
    // Brand anchor
    primary: '#1D7D53',
    primaryDark: '#14563A',
    primaryLight: '#D9F0E2',
    primaryBg: '#F3FAF6',

    // Neubrutalism foundation
    brutalInk: '#111111',
    brutalPaper: '#FFF8E7',
    brutalPaperAlt: '#F4E8C8',
    brutalWhite: '#FFFFFF',
    brutalLime: '#B6FF3B',
    brutalYellow: '#FFD84D',
    brutalRed: '#FF4D4D',
    brutalBlue: '#3B82F6',
    brutalGreen: '#00A86B',
    brutalPink: '#FF7AB6',
    brutalPurple: '#8B5CF6',
    brutalGray: '#D9D9D9',

    // Premium calm neutrals
    neutral950: '#0F1714',
    neutral900: '#17211D',
    neutral800: '#2A3732',
    neutral700: '#42514A',
    neutral600: '#5A6A63',
    neutral500: '#74847C',
    neutral400: '#A9B7B0',
    neutral300: '#C8D2CD',
    neutral200: '#DEE6E1',
    neutral100: '#EDF2EE',
    neutral50: '#F6F8F5',

    // Semantic / Status
    success: '#1D8A5B',
    successBg: '#DFF3E7',
    warning: '#C58A1E',
    warningBg: '#F8EED6',
    danger: '#C95A63',
    dangerBg: '#F8E2E5',
    info: '#3A79C9',
    infoBg: '#DEEAFB',

    // Background & surface
    background: '#F4F7F2',
    backgroundAlt: '#EBF0EA',
    backgroundCanvas: '#E6EDE6',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F6F1',
    surfaceElevated: '#FFFFFF',
    surfaceCard: '#FAFCF9',
    surfaceGlass: 'rgba(255,255,255,0.82)',
    surfaceInset: '#E7EDE7',
    surfaceMuted: '#DEE6E0',

    // Text hierarchy
    textPrimary: '#13201B',
    textSecondary: '#5B6A64',
    textTertiary: '#7A8983',
    textInverse: '#FFFFFF',
    textDisabled: '#A5B2AB',

    // Border & divider
    border: '#D8E2DC',
    borderStrong: '#B8C5BE',
    divider: '#EAF0EA',

    // Overlay & transparency
    overlay: 'rgba(15, 23, 20, 0.48)',
    overlayLight: 'rgba(15, 23, 20, 0.14)',
    
    transparent: 'transparent',

    // Semantic surfaces
    dangerLight: '#F6D5D9',
    successLight: '#CDEBD8',
    warningLight: '#F3E3B9',
    infoLight: '#D2E2FB',

    // Legacy compatibility
    secondary: '#D3992D',
    secondaryLight: '#FDF1D8',
    
    // Dark mode tokens
    dark: {
        background: '#0C1613',
        backgroundAlt: '#11201C',
        backgroundCanvas: '#162721',
        surface: '#13211D',
        surfaceAlt: '#1D2D27',
        surfaceElevated: '#22332D',
        surfaceCard: '#1A2924',
        surfaceGlass: 'rgba(19,33,29,0.82)',
        surfaceInset: '#0E1A17',
        surfaceMuted: '#1A2A24',
        textPrimary: '#F2F7F3',
        textSecondary: '#A1B3AA',
        textTertiary: '#7F9289',
        textDisabled: '#667871',
        border: '#283A34',
        borderStrong: '#365048',
        divider: '#1B2A25',
        overlay: 'rgba(5, 10, 8, 0.74)',
        overlayLight: 'rgba(5, 10, 8, 0.3)',
        primaryLight: 'rgba(30, 140, 92, 0.22)',
        primaryBg: 'rgba(30, 140, 92, 0.14)',
        successBg: 'rgba(29, 138, 91, 0.18)',
        warningBg: 'rgba(197, 138, 30, 0.18)',
        dangerBg: 'rgba(201, 90, 99, 0.18)',
        infoBg: 'rgba(58, 121, 201, 0.18)',
        brutalInk: '#F6F1E3',
        brutalPaper: '#181818',
        brutalPaperAlt: '#242015',
        brutalWhite: '#202020',
        brutalGray: '#3A3A3A',
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

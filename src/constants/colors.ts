// Palet warna utama Tabungin
export const Colors = {
    // Primary
    primary: '#1DB954',
    primaryDark: '#158A3E',
    primaryLight: '#E8F8EE',

    // Secondary
    secondary: '#F5A623',
    secondaryLight: '#FEF3DC',

    // Background & Surface
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F4F8',

    // Text
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Status
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',

    // Border & Divider
    border: '#E5E7EB',
    divider: '#F3F4F6',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',

    // Dark mode (digunakan lewat theme context)
    dark: {
        background: '#0F172A',
        surface: '#1E293B',
        surfaceElevated: '#334155',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: '#334155',
        divider: '#1E293B',
    },

    // Transparan
    transparent: 'transparent',
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
    Gaji: '#1DB954',
    Freelance: '#F5A623',
    Bisnis: '#0EA5E9',
    Investasi: '#7C3AED',
    Hadiah: '#F472B6',
};

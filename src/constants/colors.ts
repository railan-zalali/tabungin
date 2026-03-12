// Palet warna utama Tabungin
// Berdasarkan UI/UX Revision Plan (Tailwind-like tokens)
export const Colors = {
    // Primary (Green)
    primary: '#16A34A', // Green 600
    primaryDark: '#15803D', // Green 700
    primaryLight: '#DCFCE7', // Green 100
    primaryBg: '#F0FDF4', // Green 50

    // Neutral (Grayscale)
    neutral900: '#111827', // Text Primary
    neutral700: '#374151', // Text Secondary
    neutral500: '#6B7280', // Text Disabled / Icon
    neutral300: '#9CA3AF', // Border
    neutral100: '#E5E7EB', // Divider
    neutral50: '#F9FAFB',  // Background Alt

    // Semantic / Status
    success: '#16A34A',
    successBg: '#DCFCE7',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    info: '#2563EB',
    infoBg: '#DBEAFE',

    // Background & Surface
    background: '#FFFFFF', // Clean White
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6', // Light Gray for cards/sections

    // Text Aliases
    textPrimary: '#111827',
    textSecondary: '#374151',
    textTertiary: '#6B7280',
    textInverse: '#FFFFFF',

    // Border & Divider Aliases
    border: '#E5E7EB',
    divider: '#F3F4F6',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Transparent
    transparent: 'transparent',

    // --- LEGACY COMPATIBILITY ---
    // Keep these to prevent breaking existing components while migrating
    secondary: '#F5A623', // Deprecated: Use 'warning' or specific color
    secondaryLight: '#FEF3DC',
    
    // Dark mode tokens (Legacy)
    dark: {
        background: '#0F172A',
        surface: '#1E293B',
        surfaceElevated: '#334155',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: '#334155',
        divider: '#1E293B',
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

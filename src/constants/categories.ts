// Kategori transaksi Tabungin
export interface CategoryItem {
    id: string;
    name: string;
    icon: string; // MaterialCommunityIcons name
    color: string;
    type: 'expense' | 'income' | 'both';
}

export const EXPENSE_CATEGORIES: CategoryItem[] = [
    { id: 'food', name: 'Makan & Minum', icon: 'food', color: '#F59E0B', type: 'expense' },
    { id: 'transport', name: 'Transport', icon: 'car', color: '#3B82F6', type: 'expense' },
    { id: 'shopping', name: 'Belanja', icon: 'shopping', color: '#8B5CF6', type: 'expense' },
    { id: 'entertainment', name: 'Hiburan', icon: 'gamepad-variant', color: '#EC4899', type: 'expense' },
    { id: 'health', name: 'Kesehatan', icon: 'hospital-box', color: '#10B981', type: 'expense' },
    { id: 'education', name: 'Pendidikan', icon: 'school', color: '#06B6D4', type: 'expense' },
    { id: 'bills', name: 'Tagihan', icon: 'lightning-bolt', color: '#EF4444', type: 'expense' },
    { id: 'other_expense', name: 'Lainnya', icon: 'dots-horizontal-circle', color: '#6B7280', type: 'expense' },
];

export const INCOME_CATEGORIES: CategoryItem[] = [
    { id: 'salary', name: 'Gaji', icon: 'briefcase', color: '#1DB954', type: 'income' },
    { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#F5A623', type: 'income' },
    { id: 'business', name: 'Bisnis', icon: 'store', color: '#0EA5E9', type: 'income' },
    { id: 'investment', name: 'Investasi', icon: 'trending-up', color: '#7C3AED', type: 'income' },
    { id: 'gift', name: 'Hadiah', icon: 'gift', color: '#F472B6', type: 'income' },
    { id: 'other_income', name: 'Lainnya', icon: 'dots-horizontal-circle', color: '#6B7280', type: 'income' },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(id: string): CategoryItem | undefined {
    return ALL_CATEGORIES.find((c) => c.id === id);
}

// Warna pilihan untuk saving goal
export const GOAL_COLORS = [
    '#1DB954', // hijau
    '#F5A623', // kuning
    '#3B82F6', // biru
    '#EF4444', // merah
    '#8B5CF6', // ungu
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F59E0B', // amber
];

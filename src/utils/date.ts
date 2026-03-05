// Utilitas format tanggal Indonesia

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_PANJANG = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const BULAN_SINGKAT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Format tanggal lengkap: "Senin, 5 Maret 2025"
 */
export function formatDateLong(timestamp: number): string {
    const date = new Date(timestamp);
    const hari = HARI[date.getDay()];
    const tanggal = date.getDate();
    const bulan = BULAN_PANJANG[date.getMonth()];
    const tahun = date.getFullYear();
    return `${hari}, ${tanggal} ${bulan} ${tahun}`;
}

/**
 * Format tanggal singkat: "5 Mar 2025"
 */
export function formatDateShort(timestamp: number): string {
    const date = new Date(timestamp);
    const tanggal = date.getDate();
    const bulan = BULAN_SINGKAT[date.getMonth()];
    const tahun = date.getFullYear();
    return `${tanggal} ${bulan} ${tahun}`;
}

/**
 * Format tanggal untuk header grup: "Hari ini" | "Kemarin" | "5 Mar 2025"
 */
export function formatDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'Hari ini';
    if (isSameDay(date, yesterday)) return 'Kemarin';
    return formatDateShort(timestamp);
}

/**
 * Format waktu: "14:30"
 */
export function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const jam = date.getHours().toString().padStart(2, '0');
    const menit = date.getMinutes().toString().padStart(2, '0');
    return `${jam}:${menit}`;
}

/**
 * Format bulan dan tahun: "Maret 2025"
 */
export function formatMonthYear(timestamp: number): string {
    const date = new Date(timestamp);
    return `${BULAN_PANJANG[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format estimasi tanggal: "5 Maret 2025"
 */
export function formatEstimatedDate(date: Date): string {
    const tanggal = date.getDate();
    const bulan = BULAN_PANJANG[date.getMonth()];
    const tahun = date.getFullYear();
    return `${tanggal} ${bulan} ${tahun}`;
}

/**
 * Cek apakah dua tanggal merupakan hari yang sama
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
}

/**
 * Dapatkan awal hari (00:00:00)
 */
export function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Dapatkan akhir hari (23:59:59)
 */
export function endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Dapatkan awal bulan ini
 */
export function startOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Hitung berapa hari dari sekarang
 */
export function daysFromNow(targetTimestamp: number): number {
    const now = Date.now();
    const diff = targetTimestamp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format durasi relatif: "3 hari lagi", "2 minggu lagi", "1 bulan lagi"
 */
export function formatRelativeDays(days: number): string {
    if (days <= 0) return 'Selesai';
    if (days === 1) return '1 hari lagi';
    if (days < 7) return `${days} hari lagi`;
    if (days < 14) return '1 minggu lagi';
    if (days < 30) return `${Math.floor(days / 7)} minggu lagi`;
    if (days < 60) return '1 bulan lagi';
    return `${Math.floor(days / 30)} bulan lagi`;
}

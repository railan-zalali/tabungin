// Penjelasan tiap insight untuk layar Insight Detail (roadmap §5.1 P2-06
// tahap 1, task IN-1).
//
// InsightEngine hanya menghasilkan `title` + `description` (narasi singkat).
// Layar detail butuh dua hal tambahan yang tidak boleh dikarang di komponen:
//   - `meaning`: angka/metode apa yang mendasari insight itu muncul;
//   - `action` : langkah konkret yang bisa diambil pengguna.
//
// Pemetaan dipisah dari layar supaya murni dan bisa diuji tanpa render.

import type { InsightId } from './insightEngine';

export interface InsightExplanation {
    /** Angka dan metode di balik insight — kenapa ini bisa muncul. */
    meaning: string;
    /** Langkah konkret yang bisa diambil pengguna. */
    action: string;
}

export const INSIGHT_EXPLANATIONS: Record<InsightId, InsightExplanation> = {
    'unusual-spend': {
        meaning:
            'Nominal transaksi dibandingkan dengan rata-rata pengeluaran pada kategori yang sama selama 6 bulan terakhir. Jauh di atas pola biasa berarti ditandai sebagai tidak lazim.',
        action:
            'Cek apakah ini kejadian sekali atau kebutuhan rutin yang belum tercatat. Bila tidak sesuai rencana, geser pagu kategori terkait.',
    },
    'savings-rate': {
        meaning:
            'Rasio tabungan = (pemasukan − pengeluaran) ÷ pemasukan. Panduan umum menargetkan minimal 20% tersisih sebagai dana darurat dan investasi.',
        action:
            'Kalau masih di bawah 20%, tekan satu kategori konsumtif dulu — bukan kebutuhan pokok — lalu ukur lagi bulan depan.',
    },
    'spending-trend': {
        meaning:
            'Membandingkan total pengeluaran periode berjalan dengan periode sebelumnya berdurasi sama, lalu memakai selisih persentasenya.',
        action:
            'Bila naik beruntun dua periode, buka laporan dan lihat kategori mana yang paling menaikkan angka sebelum menekan total.',
    },
    'category-shift': {
        meaning:
            'Melihat kategori yang porsinya terhadap total pengeluaran paling besar naik atau turun dibanding periode sebelumnya.',
        action:
            'Sesuaikan pagu kategori tersebut supaya anggaran tetap realistis mengikuti kebiasaan belanja terbaru.',
    },
    forecast: {
        meaning:
            'Perkiraan sederhana dari rata-rata pengeluaran beberapa bulan terakhir. Ini pola lanjutan, bukan angka pasti.',
        action:
            'Pakai sebagai patokan menyisihkan dana di awal bulan, lalu evaluasi lagi setelah transaksi bulan berjalan lengkap.',
    },
    'top-category': {
        meaning:
            'Kategori dengan akumulasi pengeluaran terbesar pada jendela 6 bulan terakhir — sumber dampak terbesar ke total.',
        action:
            'Kunci kategori ini lebih dulu saat menekan pengeluaran; penghematannya paling terasa dibanding kategori kecil.',
    },
};

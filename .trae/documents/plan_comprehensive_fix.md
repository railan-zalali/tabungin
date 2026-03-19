# Rencana Perbaikan Bug, Logika, dan Peningkatan UI/UX

## Ringkasan

Analisis menunjukkan beberapa bug potensial (seperti validasi nama, penanganan tanggal) dan kekurangan UI/UX (seperti tidak adanya Date Picker, feedback visual yang kurang). Rencana ini mencakup perbaikan di layar-layar utama: Dashboard, Transaksi, Tambah Transaksi, dan Login.

## Fase 1: Instalasi Dependensi (Wajib)

Aplikasi keuangan memerlukan pemilihan tanggal yang akurat. Saat ini, user tidak bisa mengubah tanggal transaksi (selalu hari ini).

* **Tindakan:** Install `@react-native-community/datetimepicker`.

## Fase 2: Perbaikan Bug & Logika

### 1. `DashboardScreen.tsx`

* **Bug:** Ekstraksi nama (`user.name.split`) berisiko crash jika nama kosong.

* **Logika:** Tambahkan `RefreshControl` agar user bisa memuat ulang data secara manual.

* **UI:** Perbaiki styling kartu ringkasan (Summary Card) agar lebih modern dan informatif.

### 2. `TransactionListScreen.tsx`

* **Logika:** Tambahkan *debounce* pada pencarian agar tidak membebani performa saat mengetik.

* **Logika:** Perbaiki tipe data (`as any`) yang tidak aman.

* **UX:** Aktifkan *Sticky Headers* (tanggal menempel di atas saat scroll).

* **UX:** Tambahkan dialog konfirmasi sebelum menghapus transaksi.

### 3. `AddTransactionScreen.tsx` (KRITIKAL)

* **Fitur Baru:** Implementasikan **Date Picker** agar user bisa mencatat transaksi masa lalu.

* **Logika:** Jangan reset nominal saat mengganti tipe transaksi (Pemasukan <-> Pengeluaran) kecuali diminta.

* **UI:** Sesuaikan ukuran font input nominal agar tidak terpotong jika angkanya besar.

### 4. `LoginScreen.tsx`

* **Logika:** Tambahkan `.trim()` pada input email untuk mencegah kegagalan login karena spasi tidak sengaja.

* **Logika:** Pastikan *error handling* tertangani dengan baik (try-catch) agar aplikasi tidak hang.

* **UI:** Perbaiki masalah keyboard yang menutupi tombol login (KeyboardAvoidingView).

## Fase 3: Peningkatan UI/UX Global

* Menyeragamkan warna error/sukses menggunakan konstanta `Colors`.

* Menambahkan indikator loading yang konsisten.

* Memastikan navigasi antar layar terasa mulus.

## Verifikasi

Setelah implementasi, verifikasi hal berikut:

1. Bisa memilih tanggal transaksi selain hari ini.
2. Search transaksi berjalan lancar tanpa lag.
3. Login dengan spasi di email tetap berhasil.
4. Pull-to-refresh di dashboard berfungsi.


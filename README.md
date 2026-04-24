# Tabungin

Tabungin adalah aplikasi pencatatan keuangan berbasis Expo dan React Native dengan arsitektur local-first. Data utama disimpan di SQLite untuk pengalaman cepat dan tetap usable saat offline, lalu disinkronkan ke Supabase untuk backup dan multi-device support.

## Sorotan

- Dashboard, transaksi, dompet, target tabungan, laporan, dan pengaturan dalam satu aplikasi.
- Fokus Android Expo dengan UI yang lebih tegas, responsif, dan aman untuk layar kecil.
- State management memakai Zustand, persistence lokal memakai Expo SQLite, dan backend sync memakai Supabase.

## Stack

- Expo 55
- React Native 0.83
- TypeScript
- React Navigation
- Zustand
- Expo SQLite
- Supabase

## Menjalankan proyek

```bash
npm install
npm run start
```

Sebelum login, register, sync, atau fitur berbasis cloud dipakai, isi environment Supabase terlebih dulu:

```bash
copy .env.example .env
```

Lalu isi:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

`npm run start` hanya menjalankan Metro bundler. Kalau ingin langsung membuka app ke Android lewat `npm run android` atau `npx expo start -a`, mesin harus sudah punya Android SDK dan `adb`.

Script penting:

- `npm run start` untuk menjalankan Expo dev server
- `npm run android` untuk membuka app di Android
- `npm run typecheck` untuk verifikasi TypeScript
- `npm run verify` untuk verifikasi statis cepat

## Setup Android di Windows

Error seperti `Failed to resolve the Android SDK path` dan `'adb' is not recognized` berarti Android SDK belum terpasang atau belum masuk ke environment variable.

1. Install Android Studio.
2. Buka Android Studio lalu install komponen SDK berikut dari `SDK Manager`:
   - `Android SDK Platform`
   - `Android SDK Platform-Tools`
   - `Android SDK Command-line Tools`
3. Pastikan folder SDK ada, biasanya di `C:\Users\USER\AppData\Local\Android\Sdk`.
4. Set environment variable Windows:

```powershell
$Sdk = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $Sdk, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $Sdk, "User")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$needed = @("$Sdk\platform-tools", "$Sdk\emulator") | Where-Object { $userPath -notlike "*$_*" }
if ($needed) {
  [Environment]::SetEnvironmentVariable(
    "Path",
    (($userPath.TrimEnd(';') + ';' + ($needed -join ';')).Trim(';')),
    "User"
  )
}
```

5. Tutup terminal lama lalu buka terminal baru.
6. Verifikasi dengan:

```bash
adb version
```

7. Jalankan ulang:

```bash
npm run start
npm run android
```

Kalau belum ingin memasang Android Studio, jalankan `npm run start` saja lalu buka app dari Expo Go di perangkat fisik. Untuk jaringan yang rumit, pakai `npx expo start --tunnel`.

Catatan Windows:

- Di PowerShell dengan execution policy ketat, gunakan `npm.cmd` dan `npx.cmd` jika `npm` atau `npx` diblokir.

## Struktur utama

```text
src/
  components/   reusable UI
  constants/    tokens tema, warna, layout, tipografi
  database/     schema SQLite, query, sync
  navigation/   tab dan stack navigator
  screens/      layar aplikasi
  store/        Zustand stores
  types/        tipe TypeScript
  utils/        helper dan service
```

## Catatan

- Artefak testing lama dan integrasi TestSprite yang usang sudah dibersihkan dari repo.
- Simpan secret dan API key di environment yang aman, bukan di file project.

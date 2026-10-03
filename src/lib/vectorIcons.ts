// Pintasan bundle untuk @expo/vector-icons (lihat metro.config.js).
//
// Paket aslinya mengekspor 19 set ikon lewat satu barrel, sehingga Metro
// menarik seluruh font ikonnya (±3,9 MB) hanya karena app memakai satu set.
// Modul ini menggantikan barrel itu saat proses bundling dan hanya
// mengekspor MaterialCommunityIcons — satu-satunya set yang dipakai app.
//
// __tests__/utils/bundleImports.test.ts menjaga agar tidak ada file yang
// mengimpor set ikon lain.
export { default as MaterialCommunityIcons } from '@expo/vector-icons/build/MaterialCommunityIcons';

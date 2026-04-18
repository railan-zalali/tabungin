# PRD Next Phase: Hardening Setelah Closure Inti

## Ringkasan Eksekutif
Fase 1 menutup gap PRD paling material: mode guest/offline, deadline target tabungan, transfer saldo wallet ke saving goal yang atomic, baseline accessibility, dan performa daftar transaksi. Fase berikutnya harus fokus pada hardening perilaku inti ini agar konsisten di seluruh alur lokal, shared wallet, dan sinkronisasi cloud.

Tujuan dokumen ini adalah memastikan sistem tidak berhenti di level "fitur sudah ada", tetapi naik ke level "fitur aman, konsisten, bisa diprediksi, dan siap diskalakan".

## Problem Statement
Sistem sudah lebih dekat ke PRD inti, tetapi masih punya area yang perlu diperdalam:

1. Guest mode sudah ada, namun transisi guest -> akun, migrasi data lokal, dan edukasi capability belum tuntas.
2. Saving goal sudah punya `deadline_at`, tetapi analitik target planning dan nudging belum membantu user memperbaiki ritme tabungan.
3. Transfer wallet -> goal sudah atomic, tetapi reversal/edit/delete saving contribution belum punya kontrak penuh.
4. Sync conflict handling masih minimal dan belum terdokumentasi lengkap per entitas penting.
5. Accessibility dan performance sudah membaik di jalur utama, tetapi belum diaudit menyeluruh untuk seluruh screen dan state edge case.

## Goals
1. Menyelesaikan hardening seluruh flow inti guest, wallet, transaksi, dan saving goal.
2. Menetapkan aturan konflik data yang eksplisit dan bisa diuji.
3. Menyempurnakan UX agar deadline, saldo, dan capability cloud terasa jelas bagi user.
4. Menyiapkan fondasi stabil untuk fase ekspansi berikutnya tanpa mengorbankan reliabilitas inti.

## Non-Goals
1. Deployment, observability production, dan app store release.
2. Internasionalisasi penuh.
3. Fitur ekspansi besar baru seperti investasi, AI coach, atau marketplace finansial.

## Scope Prioritas

### 1. Guest to Account Upgrade
- Sediakan flow untuk menghubungkan sesi guest ke akun tanpa kehilangan data lokal.
- Definisikan strategi merge saat user guest login ke akun yang sudah punya data cloud.
- Tampilkan capability matrix yang jelas: lokal-only, sync aktif, shared wallet aktif.

### 2. Saving Goal Planning UX
- Tambahkan indikator "on track / behind schedule / ahead of schedule".
- Tambahkan rekomendasi nominal per periode agar target sesuai deadline.
- Tampilkan dampak perubahan nominal tabungan terhadap estimasi sistem secara real-time.

### 3. Saving Contribution Lifecycle
- Tambahkan dukungan edit dan hapus saving contribution dengan reversal saldo wallet yang benar.
- Tambahkan audit trail yang lebih eksplisit untuk kontribusi, rollback, dan koreksi manual.
- Pastikan invariant saldo tidak rusak saat ada operasi offline, retry sync, atau konflik remote.

### 4. Sync and Conflict Resolution
- Dokumentasikan conflict rules minimum:
  - local dirty record tidak ditimpa realtime payload,
  - wallet balance harus konsisten dengan mutation log,
  - saving contribution tidak boleh menghasilkan double-apply,
  - delete vs update harus punya prioritas yang jelas.
- Tambahkan test kontrak untuk conflict resolution pada `wallets`, `transactions`, `saving_goals`, dan `saving_logs`.

### 5. Accessibility and Performance Hardening
- Audit seluruh screen inti dan state kritikal: loading, empty, error, success, destructive confirmation.
- Pastikan seluruh aksi penting punya `accessibilityRole`, `accessibilityLabel`, dan copy yang deskriptif.
- Lanjutkan optimasi daftar besar pada saving goals, reports, notification center, dan shared activity feeds.

## Functional Requirements

### Guest Session
1. User guest bisa membuat data lokal, keluar dari sesi, lalu masuk lagi ke mode guest tanpa kehilangan data lokal.
2. User guest bisa upgrade ke akun melalui flow terarah dari settings dan screen cloud-only.
3. Saat upgrade, sistem harus meminta keputusan merge bila data lokal dan cloud sama-sama ada.

### Saving Goal
1. Goal harus menampilkan deadline user dan estimasi sistem secara konsisten di seluruh screen relevan.
2. Sistem harus menandai bila ritme tabungan tidak cukup untuk memenuhi deadline.
3. User harus bisa memperbaiki kontribusi saving log tanpa menyebabkan saldo wallet menjadi salah.

### Wallet Consistency
1. Setiap perubahan saving contribution harus punya pasangan mutation di wallet balance.
2. Reversal atau delete saving contribution harus mengembalikan saldo wallet dengan jumlah yang benar.
3. Insufficient balance harus ditolak sebelum mutation apa pun ditulis.

### Sync
1. Guest mode tidak boleh membuat subscription realtime atau remote sync request.
2. Sync engine harus memahami field `deadline_at`.
3. Conflict handling untuk saving transfer harus deterministic dan terdokumentasi.

## Dampak Teknis
- `useAuthStore` perlu mendukung state upgrade guest -> authenticated.
- Query layer saving perlu mutation log atau minimal aturan reversal yang eksplisit.
- Sync layer perlu tabel/marker tambahan bila audit trail mutation ingin diperkuat.
- UI settings/profile perlu capability messaging yang lebih sistematis.
- Test suite perlu ditambah untuk lifecycle saving contribution dan merge guest session.

## KPI dan Acceptance Criteria
1. 0 kasus saldo wallet negatif akibat saving contribution di test kontrak.
2. 100% jalur guest/cloud-only menampilkan state yang jelas, bukan error mentah.
3. Upgrade dari guest ke akun mempertahankan data lokal pada skenario happy path.
4. Sync tidak membuat duplikasi saving contribution setelah retry atau reconnect.
5. Screen inti tetap usable pada text scaling besar dan x-large.

## Phasing

### Phase 2A: Hardening Inti
- Guest -> akun upgrade
- Reversal/edit/delete saving contribution
- Conflict rule documentation dan contract tests

### Phase 2B: UX Planning
- On-track indicator
- Suggested saving pace
- Capability matrix yang lebih jelas di settings dan screen cloud-only

### Phase 2C: Stabilization
- Accessibility audit penuh
- Performance pass lanjutan untuk list besar
- Final cleanup terhadap edge case sync

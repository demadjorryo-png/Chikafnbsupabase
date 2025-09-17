# Dokumentasi Alur dan Fungsi Aplikasi Bekupon Basecamp

Dokumen ini memberikan gambaran menyeluruh tentang arsitektur, alur data, dan fungsionalitas utama dari aplikasi POS & CRM "Bekupon Basecamp".

## 1. Ikhtisar dan Tumpukan Teknologi

- **Tujuan**: Aplikasi web internal untuk "Bekupon Vape Store" guna mengelola penjualan (Point of Sale), inventaris, pelanggan, karyawan, dan mendapatkan rekomendasi bisnis berbasis AI.
- **Tumpukan Teknologi**:
  - **Frontend**: Next.js (App Router), React, TypeScript
  - **UI**: shadcn/ui, Tailwind CSS, Lucide React (ikon), Recharts (grafik)
  - **Backend & Database**: Firebase (Firestore untuk database, Firebase Auth untuk autentikasi)
  - **AI**: Genkit (Google AI)

## 2. Alur Autentikasi dan Sesi

Alur ini krusial untuk memahami bagaimana aplikasi mengidentifikasi pengguna dan toko yang aktif.

### a. Halaman Login (`/login`)
- **Fungsi**: Titik masuk utama untuk semua pengguna (Admin dan Kasir).
- **Proses**:
  1. Pengguna **wajib** memilih **Toko** dari dropdown.
  2. Pengguna memasukkan **User ID** dan **Password**.
  3. Saat tombol "Masuk" diklik, fungsi `handleLogin` dieksekusi.
  4. **Login Kasir**: Menggunakan `signInWithEmailAndPassword` dari Firebase Auth. User ID diubah menjadi format email (`<userId>@era5758.co.id`).
  5. **Login Admin (Offline)**: Untuk `Pradana01`, login divalidasi secara lokal terhadap data di `src/lib/data.ts` tanpa memanggil Firebase Auth.
  6. **Penanganan Status**: Setelah login berhasil, aplikasi memeriksa status pengguna di Firestore. Jika statusnya `'inactive'`, login dibatalkan dan notifikasi muncul.
  7. **Redirect ke Dashboard**: Jika berhasil, pengguna diarahkan ke `/dashboard` dengan membawa dua parameter URL krusial:
     - `userId`: ID unik pengguna dari database (e.g., `admin001`, `Y1ps...`).
     - `storeId`: ID toko yang **dipilih di halaman login** (e.g., `store_tpg`, `store_swj`).

### b. Pengelolaan Sesi
- Aplikasi ini **tidak menggunakan cookie sesi tradisional**. Status login dan konteks (pengguna dan toko aktif) dikelola sepenuhnya melalui **parameter URL (`userId` dan `storeId`)**.
- Kehadiran `userId` dan `storeId` di URL adalah **satu-satunya sumber kebenaran (`single source of truth`)** yang menentukan data apa yang harus ditampilkan di seluruh aplikasi dashboard.

## 3. Struktur Dashboard

### a. `src/app/dashboard/page.tsx` (Komponen Inti)
- **Fungsi**: Komponen ini adalah "otak" dari seluruh dashboard.
- **Alur Kerja**:
  1. **Membaca Parameter URL**: Mengambil `view`, `userId`, dan `storeId` dari URL menggunakan `useSearchParams`.
  2. **Pengambilan Data (`fetchAllData`)**: Melakukan pemanggilan ke Firestore untuk mengambil semua data mentah yang diperlukan: `stores`, `products`, `customers`, `transactions`, `users`, `pendingOrders`, `redemptionOptions`, dan data pengaturan (`feeSettings`, `pradanaTokenBalance`).
  3. **Menetapkan Konteks Pengguna**: Menemukan `currentUser` dan `activeStore` dari data yang sudah diambil berdasarkan `userId` dan `storeId` dari URL.
  4. **Routing Tampilan (View)**: Berdasarkan nilai parameter `view` di URL, komponen ini akan merender "view" yang sesuai (misalnya, `Overview`, `POS`, `Products`, dll.).
  5. **Meneruskan Data**: Meneruskan data yang relevan (misalnya, `products`, `customers`, `currentUser`, `activeStore`) sebagai *props* ke komponen "view" yang aktif.
  6. **Manajemen Loading & Error**: Menampilkan `DashboardSkeleton` saat data sedang dimuat dan `toast` error jika pengambilan data gagal.

### b. `src/app/dashboard/main-sidebar.tsx`
- **Fungsi**: Menyediakan navigasi utama.
- **Logika**:
  - Menerima `currentUser` untuk menentukan menu mana yang boleh ditampilkan berdasarkan peran (`admin` atau `kasir`).
  - Mengarahkan pengguna ke "view" yang berbeda dengan mengubah parameter `view` di URL.

## 4. Rincian Fungsi per "View"

### a. Point of Sale (`pos.tsx`)
- **Fungsi**: Melakukan transaksi penjualan.
- **Alur Checkout (`handleCheckout`)**:
  1. **Validasi Awal**: Memastikan keranjang tidak kosong dan `currentUser` serta `activeStore` (diterima dari *props*) valid.
  2. **Memulai Transaksi Firestore (`runTransaction`)**: Semua operasi database dibungkus dalam satu transaksi atomik untuk memastikan integritas data.
  3. **Iterasi Keranjang**:
     - **Untuk Produk Manual**: Jika `productId` diawali dengan `manual-`, logika pengecekan dan pengurangan stok **dilewati**.
     - **Untuk Produk Asli**: Mengambil dokumen produk, memvalidasi stok di `activeStore`, dan mengurangi stok menggunakan `transaction.update`. Jika stok tidak cukup, seluruh transaksi dibatalkan.
  4. **Update Poin Pelanggan**: Jika ada `selectedCustomer`, poin loyalitasnya diperbarui (poin didapat - poin ditukar).
  5. **Membuat Catatan Transaksi**: Membuat dokumen baru di koleksi `transactions` dengan semua detail penjualan.
  6. **Menampilkan Struk**: Jika berhasil, dialog struk (`CheckoutReceiptDialog`) akan muncul.

### b. Overview (`overview.tsx` & `admin-overview.tsx`)
- **Fungsi**: Menampilkan ringkasan data dan metrik kinerja.
- **`overview.tsx` (Kasir)**: Menampilkan data yang relevan untuk `storeId` yang sedang aktif, seperti penjualan harian/bulanan pribadi dan papan peringkat karyawan di toko tersebut.
- **`admin-overview.tsx` (Admin)**: Menampilkan data agregat dari **semua toko**, termasuk total pendapatan, perbandingan produk terlaris/kurang laris, dan yang terpenting, memanggil *flow* AI `getAdminRecommendations` untuk memberikan saran bisnis mingguan dan bulanan.

### c. Products (`products.tsx`)
- **Fungsi**: Mengelola inventaris produk.
- **Fitur**:
  - Menampilkan daftar semua produk dengan stok di setiap toko.
  - Filter berdasarkan kategori dan pencarian berdasarkan nama.
  - **Admin**: Dapat menambah, mengedit, dan menghapus produk.
  - **Kasir**: Hanya dapat melihat produk.
  - Stok ditampilkan sebagai angka saja (fungsi edit langsung telah dihapus untuk mencegah kesalahan).

### d. Customers (`customers.tsx`)
- **Fungsi**: Mengelola database pelanggan.
- **Fitur**:
  - Menampilkan daftar pelanggan.
  - Menambah pelanggan baru dengan validasi umur (minimal 21 tahun).
  - Melihat detail pelanggan.

### e. Pending Orders (`pending-orders.tsx`)
- **Fungsi**: Mencatat permintaan produk yang stoknya habis.
- **Fitur**:
  - Menampilkan produk yang stoknya kosong di toko yang aktif.
  - Memungkinkan penambahan "item manual" yang tidak ada di database.
  - Memilih pelanggan dan membuat catatan "pesanan tertunda" (`pendingOrders`) di Firestore.

## 5. Alur Fungsi AI (Genkit Flows)

Semua *flow* AI berada di `src/ai/flows/` dan diekspor sebagai fungsi asinkron yang dapat dipanggil dari komponen React.

- **`admin-recommendation.ts`**: Menganalisis data penjualan (produk terlaris/kurang laris, pendapatan) dan menghasilkan rekomendasi strategis mingguan & bulanan untuk admin. Digunakan di `admin-overview.tsx`.
- **`birthday-follow-up.ts`**: Menerima nama pelanggan dan tanggal lahir, lalu membuat pesan ucapan selamat ulang tahun yang dipersonalisasi dengan fakta zodiak dan penawaran diskon. Digunakan di `overview.tsx`.
- **`challenge-generator.ts`**: Membuat tantangan penjualan berjenjang untuk karyawan berdasarkan anggaran dan periode waktu yang ditentukan. Digunakan di `challenges.tsx`.
- **`loyalty-point-recommendation.ts`**: Memberikan saran kepada kasir tentang cara terbaik bagi pelanggan untuk menukarkan poin mereka saat transaksi. Digunakan di komponen `LoyaltyRecommendation` di dalam `pos.tsx`.
- **`pending-order-follow-up.ts`**: Membuat pesan notifikasi saat produk yang dipesan kembali tersedia. Digunakan di dialog "Follow Up" di `overview.tsx` dan `admin-overview.tsx`.
- **`promotion-recommendation.ts`**: Menganalisis data promo saat ini dan data penjualan untuk menyarankan promo baru yang menarik. Digunakan di `promotions.tsx`.
- **`receipt-promo-generator.ts`**: Membuat satu baris teks promo yang menarik untuk dicetak di bagian bawah struk belanja. Digunakan di `receipt-settings.tsx`.

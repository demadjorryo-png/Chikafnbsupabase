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
  3. Saat tombol "Masuk" diklik, fungsi `login` dari `AuthContext` dieksekusi.
  4. **Login**: Menggunakan `signInWithEmailAndPassword` dari Firebase Auth. User ID diubah menjadi format email (`<userId>@era5758.co.id`).
  5. **Penanganan Status**: Setelah login berhasil, aplikasi memeriksa status pengguna di Firestore. Jika statusnya `'inactive'`, login dibatalkan dan notifikasi muncul.
  6. **Penyimpanan Sesi**: Jika berhasil, ID toko yang dipilih (`storeId`) disimpan di `sessionStorage` browser.
  7. **Redirect ke Dashboard**: Pengguna diarahkan ke `/dashboard`.

### b. Pengelolaan Sesi (`AuthContext`)
- Aplikasi mengelola sesi menggunakan kombinasi Firebase Auth dan `sessionStorage`.
- **`AuthContext`**: Ini adalah "otak" dari sesi. Saat aplikasi dimuat, ia melakukan:
  1. **Cek Firebase Auth**: Memeriksa apakah ada pengguna yang sudah terautentikasi di Firebase.
  2. **Cek `sessionStorage`**: Jika ada pengguna, ia akan memeriksa `sessionStorage` untuk mengambil `storeId` yang terakhir kali dipilih.
  3. **Validasi Sesi**:
     - Jika pengguna terautentikasi **dan** `storeId` ditemukan, sesi dianggap valid. Data pengguna (`currentUser`) dan data toko (`activeStore`) dimuat, dan pengguna dapat mengakses dashboard.
     - Jika pengguna terautentikasi tetapi `storeId` **tidak ditemukan** (misalnya, `sessionStorage` dihapus), sesi dianggap tidak konsisten. Pengguna akan secara otomatis di-logout dan diarahkan kembali ke halaman login untuk memilih toko lagi.
  4. **Single Source of Truth**: Konteks dari `AuthContext` (`currentUser` dan `activeStore`) menjadi `single source of truth` yang menentukan data apa yang harus ditampilkan di seluruh aplikasi.

## 3. Struktur Dashboard

### a. `src/app/dashboard/page.tsx` (Komponen Inti)
- **Fungsi**: Komponen ini adalah "otak" dari seluruh dashboard.
- **Alur Kerja**:
  1. **Membaca Parameter URL**: Mengambil parameter `view` dari URL untuk menentukan tampilan mana yang harus dirender (misalnya, `overview`, `pos`, `products`).
  2. **Menggunakan Konteks**: Mengambil `currentUser` dan `activeStore` dari `AuthContext`.
  3. **Pengambilan Data (`fetchAllData`)**: Melakukan pemanggilan ke Firestore untuk mengambil semua data yang relevan dengan `activeStore` yang aktif, termasuk: `products`, `transactions`, `pendingOrders`, dll. Data global seperti `customers`, `users`, dan `stores` juga diambil.
  4. **Pengambilan Pengaturan**: Mengambil pengaturan dinamis seperti `feeSettings` (biaya token) dan `pradanaTokenBalance` dari Firestore.
  5. **Routing Tampilan (View)**: Berdasarkan nilai `view`, komponen ini akan merender "view" yang sesuai. Ia juga secara cerdas memilih antara `AdminOverview` dan `Overview` berdasarkan peran pengguna.
  6. **Meneruskan Data**: Meneruskan data yang relevan (misalnya, `products`, `customers`, `feeSettings`) sebagai *props* ke komponen "view" yang aktif.
  7. **Manajemen Loading & Error**: Menampilkan `DashboardSkeleton` saat data sedang dimuat dan `toast` error jika pengambilan data gagal.

### b. `src/app/dashboard/main-sidebar.tsx`
- **Fungsi**: Menyediakan navigasi utama.
- **Logika**:
  - Menerima `currentUser` untuk menentukan menu mana yang boleh ditampilkan berdasarkan peran (`admin` atau `kasir`).
  - Mengarahkan pengguna ke "view" yang berbeda dengan mengubah parameter `view` di URL.

## 4. Rincian Fungsi per "View"

### a. Point of Sale (`pos.tsx`)
- **Fungsi**: Melakukan transaksi penjualan.
- **Alur Checkout (`handleCheckout`)**:
  1. **Validasi Awal**: Memastikan keranjang tidak kosong dan `currentUser` serta `activeStore` valid.
  2. **Cek & Potong Token (Admin)**: Jika yang melakukan checkout adalah `admin`, sistem akan memeriksa `pradanaTokenBalance`. Jika saldo tidak cukup untuk membayar biaya transaksi (`transactionFee`), checkout dibatalkan. Jika cukup, saldo akan dipotong.
  3. **Memulai Transaksi Firestore (`runTransaction`)**: Semua operasi database dibungkus dalam satu transaksi atomik untuk memastikan integritas data.
  4. **Iterasi Keranjang**:
     - **Pengurangan Stok**: Mengambil dokumen produk, memvalidasi stok di `activeStore`, dan mengurangi stok menggunakan `transaction.update`. Jika stok tidak cukup, seluruh transaksi dibatalkan.
  5. **Update Poin Pelanggan**: Jika ada `selectedCustomer`, poin loyalitasnya diperbarui (poin didapat - poin ditukar).
  6. **Membuat Catatan Transaksi**: Membuat dokumen baru di koleksi `transactions`.
  7. **Menampilkan Struk**: Jika berhasil, dialog struk (`CheckoutReceiptDialog`) akan muncul.

### b. Overview (`overview.tsx` & `admin-overview.tsx`)
- **Fungsi**: Menampilkan ringkasan data dan metrik kinerja untuk `activeStore`.
- **`overview.tsx` (Kasir)**: Menampilkan data relevan seperti penjualan harian/bulanan pribadi dan papan peringkat karyawan di toko tersebut.
- **`admin-overview.tsx` (Admin)**: Menampilkan data yang lebih mendalam untuk toko yang dipilih, termasuk total pendapatan, laba kotor, dan yang terpenting, memanggil *flow* AI `getAdminRecommendations` untuk memberikan saran bisnis.

### c. Products (`products.tsx`)
- **Fungsi**: Mengelola inventaris produk di toko yang dipilih.
- **Fitur**:
  - Menampilkan daftar semua produk dengan stok di `activeStore`.
  - Filter berdasarkan kategori dan pencarian berdasarkan nama.
  - **Admin**: Dapat menambah, mengedit, menghapus, dan menyesuaikan stok produk secara langsung dari tabel.
  - **Kasir**: Hanya dapat melihat produk dan stoknya.

### d. Promotions (`promotions.tsx`)
- **Fungsi**: Mengelola promosi penukaran poin.
- **Fitur Admin**:
  - **Pengaturan Poin**: Mengatur berapa Rupiah belanja yang diperlukan untuk mendapatkan 1 poin.
  - **Rekomendasi AI**: Memanggil AI untuk memberikan ide promosi baru berdasarkan data penjualan.
  - **CRUD Promo**: Menambah, mengedit, menonaktifkan, dan menghapus opsi penukaran poin.
- **Fitur Kasir**: Hanya dapat melihat promo yang sedang aktif.

### e. Receipt Settings (`receipt-settings.tsx`)
- **Fungsi**: Khusus admin untuk mengatur tampilan struk **per-toko**.
- **Fitur**:
  - Mengubah header, footer, dan teks promo yang akan dicetak di struk.
  - **Generator Promo AI**: Memanggil AI untuk membuat teks promo yang menarik untuk struk.
  - Pengaturan disimpan di dokumen Firestore milik `activeStore`, memastikan setiap toko bisa memiliki template struk yang berbeda.

## 5. Pradana Token & Pengaturan Dinamis

- **Dokumen Pengaturan**: Konfigurasi biaya disimpan di Firestore dalam dokumen `appSettings/transactionFees`. Ini mencakup:
  - `tokenValueRp`: Nilai 1 token dalam Rupiah.
  - `feePercentage`: Persentase biaya per transaksi penjualan.
  - `minFeeRp`: Biaya minimum per transaksi.
  - `aiUsageFee`: Biaya token untuk setiap penggunaan fitur AI.
- **Alur Biaya**:
  1. **Biaya Transaksi**: Hanya berlaku untuk `admin`. Setiap checkout di `pos.tsx` akan memotong saldo token.
  2. **Biaya AI**: Berlaku untuk `admin`. Setiap kali tombol "Generate with Chika AI" diklik di mana pun, saldo token akan diperiksa dan dipotong. Kasir dapat menggunakan fitur AI gratis.
- **Keuntungan**: Admin dapat mengubah aturan bisnis ini kapan saja langsung dari Firebase Console tanpa perlu mengubah kode aplikasi.

## 6. Alur Fungsi AI (Genkit Flows)

Semua *flow* AI berada di `src/ai/flows/` dan diekspor sebagai fungsi asinkron yang dapat dipanggil dari komponen React. Setiap pemanggilan oleh `admin` akan dikenakan biaya `aiUsageFee`.

- **`admin-recommendation.ts`**: Menganalisis data penjualan toko yang aktif dan menghasilkan rekomendasi strategis untuk admin. Digunakan di `admin-overview.tsx`.
- **`birthday-follow-up.ts`**: Membuat pesan ucapan selamat ulang tahun yang dipersonalisasi. Digunakan di `overview.tsx`.
- **`challenge-generator.ts`**: Membuat tantangan penjualan berjenjang untuk karyawan. Digunakan di `challenges.tsx`.
- **`loyalty-point-recommendation.ts`**: Memberikan saran penukaran poin terbaik kepada kasir saat transaksi. Digunakan di `pos.tsx`.
- **`pending-order-follow-up.ts`**: Membuat pesan notifikasi saat produk yang dipesan kembali tersedia. Digunakan di dialog "Follow Up".
- **`promotion-recommendation.ts`**: Menganalisis data promo dan penjualan untuk menyarankan promo baru. Digunakan di `promotions.tsx`.
- **`receipt-promo-generator.ts`**: Membuat satu baris teks promo untuk struk. Digunakan di `receipt-settings.tsx`.

# Admin Panel

Project ini adalah aplikasi Admin Panel sederhana untuk manajemen data kategori dan produk yang dibangun menggunakan **NestJS**, **TypeORM**, dan **HBS** sebagai template engine. Aplikasi ini dibuat untuk memenuhi tantangan Fullstack Developer di DOT Indonesia.

## Fitur-Fitur
* **Autentikasi**: Login dan logout admin dengan proteksi session.
* **CRUD 2 Tabel**: Manajemen lengkap untuk data Kategori dan Produk untuk menambah, menampilkan, mengedit, dan menghapus data tersebut
* **Fitur Pencarian**: Mencari produk dan kategori berdasarkan nama.

---

## 📊 Desain Database (ERD)
Berikut adalah struktur tabel yang digunakan dalam aplikasi ini, dengan relasi kategori dan produk adalah one-to-many:

![Desain Database](./Images/Screenshot%2026-11-08%203025.png)

---

## Screenshot Aplikasi

### 1. Halaman Login
Halaman awal untuk autentikasi admin sebelum masuk ke dashboard.

![Halaman Login](./Images/Screenshot%2026-11-08%165900.png)


### 2. Dashboard
Tampilan utama yang menampilkan list kategori, list produk, dan fitur pencarian.

![Admin Panel Dashboard 1](./Images/Screenshot%2026-11-08%165915.png)
![Admin Panel Dashboard 2](./Images/Screenshot%2026-11-08%170021.png)

### 3. Modal tambah kategori dan produk
Tampilan modal saat ingin menambah kategori dan produk

![Modal Add Category](./Images/Screenshot%2026-11-08%165932.png)
![Modal Add Product](./Images/Screenshot%2026-11-08%165942.png)

## Dependency
* **Framework**: [NestJS](https://nestjs.com/)
* **Bahasa**: TypeScript
* **Database**: MySQL
* **ORM**: TypeORM
* **Template Engine**: HBS
* **Session Management**: express-session

---

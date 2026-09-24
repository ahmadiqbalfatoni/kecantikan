# Environment & Project Convention Guide

Dokumen ini menjelaskan konfigurasi environment (.env), standar keamanan key, serta konvensi struktur project yang WAJIB diikuti.

# Environment Variables

Semua variabel di bawah WAJIB diisi dan tidak boleh dikosongkan.
Gunakan nilai random yang kuat untuk key/secret.

# Authentication & Security
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000/

NEXTAUTH_SECRET=random
TOKEN_SECRET=random

USER_KEY=random
USER_PAS_KEY=random
USER_SECRET=random


Penjelasan:

NEXTAUTH_SECRET
Digunakan oleh NextAuth untuk signing session & token.

TOKEN_SECRET
Digunakan untuk enkripsi / validasi token aplikasi.

USER_KEY, USER_PAS_KEY, USER_SECRET
Digunakan untuk proses enkripsi, autentikasi user, dan komunikasi data sensitif.

# Penting:
Semua value di atas HARUS random, tidak boleh hardcoded, dan berbeda tiap environment (dev / staging / production).

# API & Networking
API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_URL_API=http://localhost:8000/api/v1

ALLOWED_ORIGIN=http://127.0.0.1:3000


Penjelasan:

API_URL
Endpoint backend utama.

NEXT_PUBLIC_URL_API
Endpoint API yang dapat diakses di sisi client.

ALLOWED_ORIGIN
Origin yang diizinkan untuk CORS.

API Interceptor Path
NEXT_PUBLIC_API_DIR_PATH=/api/interceptor
NEXT_PUBLIC_API_DIR_FORMDATA_PATH=/api/interceptor_formdata
NEXT_PUBLIC_API_DIR_DOWNLOAD_PATH=/api/interceptor_download


Digunakan untuk:

Interceptor request standar

Upload FormData

Download file

Public Asset
PUBLIC_ASSET_ORG=http://127.0.0.1:8000


Digunakan untuk mengakses asset publik dari backend (gambar, file, dll).

# Key & Encryption Policy
Public Key (RSA)
Lokasi:
/lib/key

Public key WAJIB sama dengan public key yang digunakan di backend.

Menggunakan RSA minimal 2048 bit.

Generate RSA Key via Terminal
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem


Atau bisa generate via website penyedia RSA key generator.

# Catatan Keamanan:

Public key boleh disimpan di frontend

Private key TIDAK BOLEH masuk frontend

 Project Structure Convention
 Routing & Page

Semua routing page WAJIB menggunakan underscore (_)

Contoh:

user_profile
reset_password
order_detail


# Tidak diperbolehkan:

user-profile
UserProfile

# Main Page Structure

Halaman utama WAJIB berada di:

app/(main)


Contoh:

app/
 ├─ (main)/
 │   ├─ page.tsx
 │   ├─ layout.tsx
 │   └─ dashboard/
 │       └─ page.tsx

# Global Types & Interface

Untuk interface atau type yang digunakan secara global:

/types

Import dan gunakan di seluruh project untuk menjaga konsistensi tipe data.
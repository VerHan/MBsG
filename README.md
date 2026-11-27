# RIFTBOUND: SLAYER CORPS (PWA Educational Edition)

2D Pixel Art Hack-and-Slash Action Platformer PWA dengan integrasi 24 soal Informatika, 3 mode permainan (*Traverse 4 Area*, *Survival Timer*, *Hold The Fort*), kontrol PC & layar sentuh HP, serta pencatatan progres siswa via **Firebase Firestore** + fallback **LocalStorage**.

## Jalankan Lokal
```bash
npm install
npm run dev
```

## Deploy ke Vercel
1. Push folder `riftbound-slayer-corps` ke repository GitHub Anda (atau import langsung lewat Vercel CLI `npx vercel`).
2. Di **Vercel Dashboard → Project Settings**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Tambahkan **Environment Variables** (jika menggunakan Firebase):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Klik **Deploy**. Setelah live di HTTPS Vercel, tombol **Install PWA** otomatis aktif di Chrome Android, Desktop, dan Safari iOS (*Add to Home Screen*).

## Contoh Rules Firestore (Mode Kelas / Sekolah)
Di Firebase Console → Firestore Database → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{studentId} {
      allow read, write: if true;
    }
  }
}
```
> Catatan: Untuk lingkungan produksi sekolah publik, Anda dapat membatasi field atau mengaktifkan Firebase Anonymous Auth sebelum rilis ke siswa luas.

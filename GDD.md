# GAME DESIGN DOCUMENT & TECHNICAL SPECIFICATION — v2.0
**Working Title:** RIFTBOUND: SLAYER CORPS  
**Genre:** 2D Pixel Art Hack-and-Slash Action Platformer + Modular Educational Integration  
**Core Ratio:** 70% Multi-Mode Combat & Exploration / 30% Educational Puzzles  
**Target Platform:** Web Browser / PWA (Desktop PC / Laptop, Keyboard + Mouse, 60 FPS)  

---

## 1. STORY, LORE & WORLDBUILDING

### 1.1 The Cataclysm (200 Tahun Lalu)
Dua ratus tahun lalu, pertempuran dahsyat antara **Makhluk Kuno (*Ancient Beings*)** dan sang **Hero** berakhir dengan kematian keduanya. Benturan kekuatan terakhir mereka merobek realitas dan membuka ratusan **Rift** (celah antar-dimensi) di permukaan bumi.

### 1.2 The Mana Contamination
Dari Rift tersebut, **Mana murni** terus bocor tanpa henti ke permukaan dunia. Mana menumpuk secara ekstrem, menjadi racun atmosferik yang memutasikan fauna serta reruntuhan teknologi kuno menjadi monster buas.

### 1.3 Sky Sanctuary vs. The Surface
Umat manusia yang selamat membangun peradaban di atas **Pulau-Pulau Terbang (*Floating Islands*)**. Seiring generasi berganti, kaum di dunia atas menjadi sombong dan menutup akses naik karena takut overpopulasi akan membuat pulau terbang jatuh.

### 1.4 Protagonist & The Slayer Corps
* **Latar Belakang MC:** Lahir di dunia bawah. Ibunya **menukarkan jiwanya** dalam ritual terlarang agar MC bisa naik ke Pulau Terbang.
* **Status Sosial:** Tumbuh di dunia atas tanpa status, diperlakukan sebagai warga kelas bawah.
* **Slayer Corps:** MC bergabung dengan **Slayer Corps** — pasukan buangan yang diturunkan ke permukaan untuk mengamankan perimeter, menjarah teknologi kuno, dan membasmi makhluk terkorupsi Mana.

### 1.5 Integrasi Lore ke Mekanik Game
* **Armor Full-Helmet (DOOM-Style):** Helm tertutup rapat karena atmosfer dunia bawah beracun.
* **Encrypted Puzzle Chests:** Senjata dan zirah peninggalan era Ancient Tech dikunci segel kognitif — Slayer harus memecahkan teka-teki lewat terminal helmnya.
* **Rift Seal Defense:** Slayer wajib menjaga Ancient Seal Pylon agar Rift tidak melebar dan membanjiri area dengan monster.
* **Survival Extraction:** Kadang sinyal evakuasi membutuhkan waktu — Slayer harus bertahan hidup sambil menunggu pesawat penjemput.

---

## 2. ART DIRECTION & VISUAL ARCHITECTURE

### 2.1 Visual Style
* **Gaya Grafis:** Modern 16-bit / 32-bit Pixel Art (`image-rendering: pixelated`).
* **Tema Visual:** **Dark Fantasy + Ancient Tech** — reruntuhan batu gothic, menara logam berkarat, kabut beracun, kristal & Rift bercahaya neon.
* **Combat Readability:** Background gelap/redup, karakter & efek aksi warna kontras tinggi + *glow*.

### 2.2 Color Palette
| Elemen | Hex Reference | Penggunaan |
| :--- | :--- | :--- |
| Deep Abyss / Sky | `#0B0D14`, `#161B29` | Langit mendung & siluet jauh |
| Ancient Stone & Rust | `#2B2F3A`, `#4A3F35` | Platform, dinding, struktur mesin |
| Toxic Mana Glow | `#00F0FF`, `#A855F7` | Rift, kristal, serangan musuh terkorupsi |
| Slayer Tech Accent | `#F97316`, `#EF4444` | Visor helm, efek tebasan/tembakan |
| Loot / Chest Gold | `#FACC15`, `#22C55E` | Peti puzzle, item langka, berhasil dekripsi |
| Danger / Timer | `#FF3B3B`, `#FF6B35` | Timer survival, indikator bahaya critical |

### 2.3 Level Structure & Seamless Looping Parallax
* **Tipe Peta:** **Semi-Linear Multi-Tiered Stage** (kiri-ke-kanan) dengan percabangan vertikal.
* **4-Layer Seamless Horizontal Looping Parallax:**
  1. `Layer 0 (Far - 0.05x)`: Langit gelap, retakan Rift, siluet pulau terbang.
  2. `Layer 1 (Mid-Far - 0.2x)`: Siluet menara Ancient Tech & tebing.
  3. `Layer 2 (Mid-Near - 0.5x)`: Pilar batu kuno, rantai besi, pipa berkabut Mana.
  4. `Layer 3 (Playable - 1.0x)`: Tileset platform, jebakan, musuh, Chest, NPC.
* **Vertical Camera Clamping:** Kamera halus dengan batas atas/bawah.

---

## 3. CORE GAMEPLAY, CONTROLS & COMBAT

### 3.1 Movement (Silksong-Inspired Agility)
Gerakan cepat, responsif, dan akrobatik:
* **Move:** `A / D` atau `← / →`
* **Variable Jump & Double Jump:** `Space` / `W`
* **Air/Ground Dash:** `Shift` (i-frames + afterimage)
* **Wall Slide & Wall Jump:** Menempel & lompat dari dinding vertikal
* **Pogo-Slash:** `S` + Melee di udara → memantul ke atas
* **Drop-Through Platform:** `S` pada thin platform → MC jatuh menembus ke bawah

### 3.2 Dual-Slot Combat Loop
MC membawa **1 Melee** + **1 Ranged** bersamaan:
* **Melee (`J` / LMB):** Combo cepat, **mengisi ulang Energy Cell** saat mengenai musuh
* **Ranged (`K` / RMB):** Konsumsi Energy Cell untuk tembakan jarak jauh
* **Interact (`E`):** Buka Chest, bicara Merchant, aktivasi Checkpoint/Pylon
* **Heal (`Q`):** Gunakan Nano-Vial
* **Inventory (`I` / `Tab`):** Equip senjata & armor

### 3.3 Combo Style Rank System ★ (SARAN BARU — DMC-Inspired)
Setiap tindakan ofensif mengisi **Style Meter** yang naik dari **D → C → B → A → S → SS → SSS**:
* **Naik:** Variasi serangan (mix melee + ranged + dash-attack + pogo), hit tanpa terkena, membunuh musuh cepat berturut-turut.
* **Turun:** Terkena damage, diam terlalu lama, mengulang serangan yang sama terus-menerus.
* **Reward:** Rank tinggi → bonus **Aether Shards** saat membunuh musuh (1x di D, hingga 3x di SSS).
* **Visual:** Huruf rank muncul besar di layar dengan efek glow & screen-flash setiap naik tier.
* **Hold-the-Fort Bonus:** Style Rank juga mempengaruhi kecepatan regen HP Pylon saat mode defense.

### 3.4 Adrenaline Burst ★ (SARAN BARU)
* Meter **Adrenaline** terisi saat melakukan combo tanpa terkena hit.
* Saat penuh (100%), tekan `F` untuk **Adrenaline Burst** (8 detik):
  * +50% Attack Speed, +30% Movement Speed
  * Efek visual: MC meninggalkan afterimage merah-oranye, screen tint keemasan
  * Semua musuh yang terbunuh selama Burst memberikan 2x Aether Shards
* Cocok digunakan saat momen kritis di **Survival Timer** atau **Hold-the-Fort** wave terakhir.

---

## 4. GAME MODE SYSTEM ★ (ARSITEKTUR BARU)

Setiap Stage **BUKAN** monoton hack-and-slash dari awal sampai akhir. Stage terdiri dari **Segment** berbeda yang divariasikan:

### 4.1 Mode: TRAVERSE (Silksong-Style Exploration)
> *"Jelajahi, lompat, temukan rahasia, dan habisi musuh di perjalanan."*
* **Deskripsi:** Pergerakan semi-linear kiri→kanan dengan percabangan vertikal. Ini mode utama Silksong-style.
* **Konten:** Platform, jebakan, musuh patroli, **Encrypted Chests** (puzzle untuk loot), ruang rahasia, Merchant.
* **Trigger Puzzle:** Saat buka Chest (tekan `E`) → modal Decryption Terminal muncul.
* **Transisi:** Saat mencapai ujung segment, bisa masuk gate ke segment berikutnya (bisa mode berbeda).

### 4.2 Mode: SURVIVAL TIMER ★ (BARU)
> *"Sinyal evakuasi dikirim. Bertahan hidup selama countdown selesai!"*
* **Lore:** MC mengaktifkan beacon sinyal untuk pesawat penjemput / membuka Blast Door yang butuh waktu booting. Sementara menunggu, gelombang musuh terus berdatangan.
* **Mekanik:**
  * **Timer** besar di atas layar: 60/90/120 detik (sesuai difficulty segment).
  * **Wave System:** Musuh muncul dari **Spawn Portal** di kiri & kanan arena setiap 10-15 detik, makin banyak seiring waktu.
  * **Arena:** Ruangan tertutup dengan beberapa platform bertingkat untuk bermanuver.
  * **Survive = Win:** Jika HP MC masih > 0 saat timer habis, lanjut ke segment berikutnya.
  * **Bonus Objective:** Jika MC membunuh semua musuh di wave tertentu sebelum wave berikutnya spawn → bonus Aether Shards + Nano-Vial.
* **Puzzle Integration:** Di tengah arena ada 1-2 **Emergency Terminal** — menjawab soal benar → memunculkan *Mana Shield Bubble* (3 detik invincibility) atau meledakkan semua musuh di layar.
* **Visual:** Sirene merah berkedip, timer angka digital neon, partikel percikan api dari dinding.

### 4.3 Mode: HOLD THE FORT / RIFT DEFENSE ★ (BARU)
> *"Jaga Ancient Seal Pylon. Jika Pylon hancur, Rift melebar dan game over!"*
* **Lore:** MC menemukan **Ancient Seal Pylon** — perangkat kuno yang menahan Rift agar tidak melebar. Pylon sedang proses reactivation dan butuh dilindungi dari gelombang musuh yang ingin menghancurkannya.
* **Mekanik:**
  * **Pylon HP Bar** di atas layar (terpisah dari HP MC). Pylon punya 500 HP.
  * **Wave System:** 3-5 wave musuh datang dari spawn portal di berbagai sisi arena. Musuh **memprioritaskan menyerang Pylon**, bukan MC. MC harus intercept.
  * **Pylon Repair Terminal (Puzzle):** 2-3 **Repair Terminal** tersebar di arena. Tekan `E` → muncul soal puzzle. Jawab benar → **Pylon HP +100** dan memunculkan **Mana Turret** otomatis selama 15 detik yang membantu menembaki musuh.
  * **Fail Condition:** Pylon HP 0 → Rift meledak, **Game Over** (harus restart dari checkpoint terakhir).
  * **Win Condition:** Semua wave musuh dikalahkan & Pylon masih hidup → Pylon reactivation selesai → Rift menyusut → segment clear + bonus besar.
* **Strategi Tambahan ★:**
  * **Barricade Nodes:** MC bisa mengaktifkan 2 titik penghalang di arena (tekan `E` tanpa puzzle) untuk memperlambat musuh dari arah tertentu selama 15 detik.
  * **Priority Management:** Musuh terbang mengabaikan Barricade — butuh Ranged weapon. Musuh berperisai lambat tapi damage tinggi ke Pylon — butuh Axe/Shotgun.
* **Visual:** Pylon bercahaya biru-cyan pulsating, Rift merah di belakang makin terang jika HP rendah.

### 4.4 Mode: GAUNTLET RUN ★ (SARAN BARU)
> *"Lorong menuju boss. Lari, lawan, jangan berhenti!"*
* **Deskripsi:** Koridor panjang auto-scrolling (layar terus bergerak ke kanan). MC harus tetap berlari, melompat obstacle, dan melawan mini-wave musuh sambil menghindari jebakan.
* **Gagal:** Jika MC terlalu lambat dan terdorong ke sisi kiri layar → **crushed** (insta-death, respawn dari awal gauntlet).
* **Speed Modulation:** Kecepatan scroll naik-turun — saat ada mini-wave, scroll melambat sebentar. Saat jebakan banyak, scroll stabil.
* **Puzzle:** 1-2 **Quick-Decrypt Gate** di sepanjang gauntlet — dinding penghalang yang hanya terbuka jika menjawab soal cepat (10 detik timer). Jika gagal/timeout, ada jalur alternatif yang lebih berbahaya (lebih banyak jebakan).
* **Reward:** Finishing tanpa mati → bonus besar.
* **Kapan Digunakan:** Biasanya segment terakhir sebelum Boss Arena sebagai *build-up* tension.

### 4.5 Mode: BOSS ARENA
> *"Lawan penjaga kuno yang terkorupsi Mana berlebih."*
* Ruangan besar tertutup, 1 Boss kuat.
* Boss punya **Phase System** (berubah pattern setiap 25-50% HP berkurang).
* **Puzzle Phase:** Boss mengaktifkan perisai → MC bisa menjawab Runic Pillar untuk insta-break shield + 4 detik stun, ATAU terus menyerang sampai shield pecah secara manual.
* Detail boss per stage ada di Section 6.

### 4.6 Segment Flow per Stage (Contoh)
```
STAGE 1: The Fallen Perimeter
├── Segment A: TRAVERSE (intro, tutorial, 2 Chests)
├── Segment B: SURVIVAL TIMER (60s, learning combat under pressure)
├── Segment C: TRAVERSE (exploration, Merchant, 1 Chest)
└── Segment D: BOSS ARENA (Mana Colossus)

STAGE 2: The Sunken Foundry  
├── Segment A: TRAVERSE (vertical platforming, wall-jump heavy, 2 Chests)
├── Segment B: HOLD THE FORT (Pylon defense, 3 waves)
├── Segment C: TRAVERSE (Puzzle Shrine reward room, Merchant, 1 Chest)
├── Segment D: SURVIVAL TIMER (90s, harder enemies)
└── Segment E: BOSS ARENA (Forge Titan)

STAGE 3: The Rift Scar
├── Segment A: TRAVERSE (floating ruins, 1 Chest)
├── Segment B: HOLD THE FORT (Pylon defense, 5 waves, hardest)
├── Segment C: GAUNTLET RUN (auto-scroll corridor menuju boss)
├── Segment D: TRAVERSE (final Merchant + Epic Chest)
└── Segment E: BOSS ARENA (Aetherion, The Corrupted Warden)
```

---

## 5. COMPLETE ARSENAL & ARMOR SYSTEM

### 5.1 Weapons (7 Tipe Senjata)
Semua senjata punya tier (Common → Rare → Epic) dari Puzzle Chest atau Upgrade di Merchant.

#### Melee Weapons (Slot 1)
| # | Tipe | Karakteristik | Base DMG | Speed | Special |
|---|------|---------------|----------|-------|---------|
| 1 | **Sword** | Seimbang, 3-hit combo | 20 | Fast | Stabil untuk pogo-slash |
| 2 | **Dual Sword** | Flurry slash super cepat | 12×2 | V. Fast | +15% Crit, dash CD -20% |
| 3 | **Axe** | Tebasan berat & lebar | 42 | Slow | Armor Break + knockback besar |

#### Ranged Weapons (Slot 2 — Energy Cell)
| # | Tipe | Karakteristik | Base DMG | Energy | Special |
|---|------|---------------|----------|--------|---------|
| 4 | **Pistol** | Tembakan presisi | 18 | 8 | Reload instan, range stabil |
| 5 | **Dual Pistol** | Burst cepat | 11 | 6/shot | Air-hover saat menembak |
| 6 | **Shotgun** | 5 peluru spread | 12×5 | 25 | Damage masif close-range + knockback |
| 7 | **Rifle** | Beam piercing | 35 | 18 | Menembus banyak musuh segaris |

#### Upgrade Tiers
| Tier | Damage Mult. | Visual Change | Cara Dapat |
|------|-------------|---------------|------------|
| Common | 1.0x | Warna default | Drop Chest / Start |
| Rare | 1.4x | Glow biru + partikel | Rare Chest / Merchant |
| Epic | 1.8x | Glow ungu + rune trail | Epic Chest / Merchant endgame |

### 5.2 Armor System (DOOM-Style Full Helmet)
| # | Nama | Visual | HP Bonus | DEF Bonus | Passive |
|---|------|--------|----------|-----------|---------|
| 1 | **Slayer Recruit Mk.I** | Baja kusam, visor oranye | +0 | +0% | Filter Mana dasar |
| 2 | **Vanguard Breach Plate** | Bahu lebar, T-visor hijau | +50 | +25% | Anti-knockback |
| 3 | **Rift-Stalker Carapace** | Ramping ungu-hitam, visor cyan | +20 | +10% | Dash CD -30%, energy -20% |
| 4 | **Aether-Forge Praetor** | Hitam-emas, rune glow | +80 | +35% | Kill = +1 HP, +15% DMG |

---

## 6. STAGE PROGRESSION, ENEMIES & BOSSES (MVP: 3 STAGES)

### 6.1 Enemy Bestiary
| Enemy | Type | HP | DMG | Behavior | Weakness |
|-------|------|----|----|----------|----------|
| **Mana Husk** | Ground Melee | 30 | 8 | Patrol kiri-kanan, charge saat dekat | Semua senjata |
| **Rift Drone** | Flying Ranged | 20 | 10 | Terbang stasioner, tembak orb lambat | Ranged weapons |
| **Corrupted Sentinel** | Shielded Melee | 60 | 15 | Perisai depan, charge lambat tapi kuat | Axe (Armor Break), Shotgun |
| **Void Spitter** | Turret | 25 | 12 | Diam, menembak rapid-fire 3 peluru | Pogo-slash (atas) |
| **Mana Stalker** | Agile Melee | 40 | 12 | Lompat-lompat, dash attack | Timing + Shotgun |
| **Rift Brute** | Heavy Melee | 80 | 20 | Lambat, slam attack AoE, sangat kuat | Dash dodge + sustained DPS |
| **Mana Wisp** | Suicide Bomber | 10 | 25 (AoE) | Terbang pelan ke MC, meledak | Ranged kill sebelum dekat |

### 6.2 Stage 1 — The Fallen Perimeter (Outskirts Ruins)
* **Atmosfer:** Hujan abu, reruntuhan gerbang kota tua, siluet pulau terbang di atas awan.
* **Segment A — TRAVERSE (Tutorial):** Jalur sederhana, mengajarkan movement dasar. 2 Encrypted Chests (drop: Dual Sword, Pistol). Tutorial prompt muncul kontekstual.
* **Segment B — SURVIVAL TIMER (60 detik):** Arena kecil, 4 wave Mana Husk + Rift Drone. 1 Emergency Terminal (puzzle → Mana Shield 3s). Cocok buat kenalkan mode survival.
* **Segment C — TRAVERSE:** Eksplorasi, jalur atas (1 Chest: Vanguard Armor). Merchant di dekat Checkpoint.
* **Segment D — BOSS: "MANA COLOSSUS":**
  * Golem besar dari reruntuhan yang dihidupkan Mana.
  * **Phase 1 (100-50% HP):** Slam Attack (AoE vertikal), Boulder Throw (proyektil lambat).
  * **Phase 2 (50-0% HP):** Core terekspos → tembak/tebas core. Tambahan: memanggil 2 Mana Husk per 20 detik. Runic Pillar tersedia untuk insta-stun.

### 6.3 Stage 2 — The Sunken Foundry (Ancient Tech Facility)
* **Atmosfer:** Pabrik kuno, kristal Mana ungu, jembatan besi bertingkat, jebakan duri energi.
* **Segment A — TRAVERSE:** Fokus wall-jump & pogo-slash. 2 Chests (drop: Axe, Dual Pistol).
* **Segment B — HOLD THE FORT (3 Waves):** Lindungi Ancient Seal Pylon. Wave: Sentinel + Stalker + Drone. 2 Repair Terminals (puzzle → Pylon +100 HP + spawn Mana Turret). 2 Barricade Nodes.
* **Segment C — TRAVERSE:** Puzzle Shrine (3 soal beruntun → Rift-Stalker Armor). Merchant.
* **Segment D — SURVIVAL TIMER (90 detik):** Arena lebih besar, semua tipe musuh Stage 1-2. 2 Emergency Terminal. Bonus: bunuh semua wave → Shotgun drop.
* **Segment E — BOSS: "FORGE TITAN":**
  * Mesin tempa raksasa yang menyatu dengan kristal Mana.
  * **Phase 1:** Flame Sweep (horizontal beam), Piston Slam (platform-destroyer — platform pecah lalu tumbuh kembali setelah 5s).
  * **Phase 2:** Memanggil 3 Corrupted Sentinel. Forge Titan menembak Mana Beam vertikal yang tracking MC. Runic Pillar untuk pecahkan perisai.
  * **Phase 3 (25% HP):** Enrage — semua serangan lebih cepat. Core terekspos permanen.

### 6.4 Stage 3 — The Rift Scar (Zero-Point Chasm)
* **Atmosfer:** Langit retak ungu-cyan, reruntuhan melayang, jurang Mana pekat.
* **Segment A — TRAVERSE:** Floating platforms, 1 Chest (Rifle).
* **Segment B — HOLD THE FORT (5 Waves):** Hardest defense. Wave termasuk Rift Brute + Mana Wisp. 3 Repair Terminals. Pylon HP hanya 400 (lebih rendah = lebih tegang).
* **Segment C — GAUNTLET RUN:** Auto-scroll corridor 45 detik. 2 Quick-Decrypt Gates (soal 10 detik). Obstacle: rotating laser beams, collapsing floor, Void Spitter turrets.
* **Segment D — TRAVERSE:** Merchant terakhir + Epic Chest (Aether-Forge Praetor Armor).
* **Segment E — BOSS: "AETHERION, THE CORRUPTED WARDEN":**
  * Ancient Being pelindung Rift yang bermutasi.
  * **Phase 1 (100-70%):** Dash Cleave (horizontal lunge), Mana Orb Barrage (5 orb pattern). Relatif mudah — learn patterns.
  * **Phase 2 (70-40%):** Rift Shockwave (wave lantai yang harus di-jump), Teleport Slash (vanish → reappear di belakang MC). Arena mulai retak — beberapa platform hilang.
  * **Phase 3 (40-0%):** **Mana Rain** (hujan proyektil acak dari atas). Memanggil 2 Mana Stalker. Mengaktifkan **Rift Barrier** (perisai regenerasi) → Runic Pillar untuk insta-break + 4s stun, atau brute force.
  * **Defeat:** Cutscene Rift Scar menutup. Mission Accomplished + Learning Report.

---

## 7. EDUCATIONAL INTEGRATION (MODULAR PUZZLE SYSTEM)

Semua soal disimpan di `src/data/puzzles.json`. Guru bisa mengganti mata pelajaran **tanpa menyentuh kode game**.

### 7.1 Lima Titik Interaksi Edukasi
| # | Trigger | Mode | Jumlah Soal | Reward Benar | Penalty Salah |
|---|---------|------|-------------|-------------|---------------|
| 1 | **Encrypted Chest** | Semua | 1 (Common/Rare) atau 2 (Epic) | Weapon/Armor + Shards | -10% HP, tampil penjelasan, retry |
| 2 | **Puzzle Shrine** | TRAVERSE | 3 soal beruntun | Shards besar + Armor/Vial | Hanya gagal bonus, bisa retry |
| 3 | **Merchant Haggle** | TRAVERSE | 1 soal opsional | Diskon 30% / +30% sell price | Tidak ada penalty, harga normal |
| 4 | **Emergency Terminal** | SURVIVAL | 1 soal cepat | Mana Shield 3s / AoE explosion | Tidak ada penalty |
| 5 | **Repair Terminal** | HOLD THE FORT | 1 soal | Pylon +100 HP + Mana Turret 15s | Tidak ada penalty, terminal cooldown 30s |
| 6 | **Quick-Decrypt Gate** | GAUNTLET | 1 soal (10s timer) | Gate terbuka (jalur aman) | Jalur alternatif (lebih berbahaya) |
| 7 | **Runic Pillar** | BOSS | 1 soal (Hard) | Boss shield break + 4s stun | Tidak ada penalty, brute force perisai |

### 7.2 Modular Question Schema
```json
{
  "id": "q_001",
  "difficulty": "easy",
  "category": "Logika",
  "question": "Teks pertanyaan...",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 1,
  "explanation": "Penjelasan singkat.",
  "usedIn": ["chest", "shrine", "terminal", "gate", "pillar", "merchant"]
}
```
File `puzzles.json` berisi placeholder schema — **user akan mengisi soal sendiri nanti**.

---

## 8. SARAN TAMBAHAN AGAR GAME LEBIH SERU ★

### 8.1 Environmental Kill Zones
* **Mana Pool:** Genangan Mana di lantai tertentu. MC aman (armor filter), tapi musuh tanpa armor menerima 5 DPS di Mana Pool. Strategi: knockback musuh ke pool.
* **Collapsing Platform:** Platform retak yang runtuh 1.5s setelah dipijak. MC bisa memanfaatkan timing untuk menjatuhkan musuh yang mengejar.
* **Mana Crystal Trap:** Kristal yang meledak jika ditembak → AoE damage 30. Bisa digunakan untuk merusak gerombolan musuh.

### 8.2 Rift Anomaly Event (Random Mini-Event)
* Selama mode TRAVERSE, ada **5% chance per 30 detik** muncul portal kecil — rift mini yang memuntahkan 3-5 musuh kuat selama 20 detik.
* **Jika MC membunuh semua sebelum waktu habis:** Drop bonus besar (Aether Shards + Nano-Vial).
* **Jika MC mengabaikan / gagal:** Musuh menghilang tanpa penalty.
* **Efek:** Menambah unpredictability dan excitement di mode eksplorasi.

### 8.3 Score Multiplier & End-Stage Grading
* Setiap stage berakhir dengan **Grade** berdasarkan:
  * **Combat Score:** Kill count × Style Rank average
  * **Puzzle Accuracy:** Jumlah jawaban benar / total soal yang dicoba
  * **Time Bonus:** Semakin cepat selesai, semakin tinggi bonus
  * **Survival Bonus:** HP tersisa saat clear
  * **Pylon Health:** (Hold-the-Fort only) HP Pylon tersisa
* **Grade:** F → D → C → B → A → S
* **S-Rank Reward:** Exclusive cosmetic visor color untuk armor helm MC.

### 8.4 New Game+ ★
* Setelah mengalahkan Aetherion, unlock **New Game+**:
  * Semua musuh +50% HP dan +30% DMG
  * Survival Timer lebih pendek (-15 detik)
  * Hold-the-Fort Pylon HP lebih rendah (350)
  * Soal puzzle **hanya medium dan hard**
  * Reward: Exclusive **"Rift Commander"** armor skin (merah-hitam, visor api)

---

## 9. TECHNICAL ARCHITECTURE

### 9.1 Tech Stack
* **Framework:** Vite + React + TypeScript + PWA
* **Game Loop:** Custom 2D Canvas (`requestAnimationFrame`, fixed-timestep, 60 FPS, `imageSmoothingEnabled = false`)
* **UI Overlay:** React + Tailwind CSS (HUD, Modals, Menus)
* **Audio:** Web Audio API (procedural retro SFX, zero external mp3)
* **Persistence:** `localStorage` (progress, loadout, scores)

### 9.2 Directory Structure (Updated)
```text
public/
├── favicon.svg
├── manifest.json
└── sw.js
src/
├── main.tsx
├── index.css
├── App.tsx                         # State router (Title → Lore → Playing → StageClear → Victory)
├── types/
│   └── index.ts                    # Shared TypeScript interfaces & types
├── data/
│   ├── weapons.ts                  # 7 weapon definitions + upgrade tiers
│   ├── armors.ts                   # 4 DOOM-style armor sets
│   ├── enemies.ts                  # Enemy bestiary definitions
│   ├── puzzles.json                # Modular question bank (user fills this)
│   └── stages.ts                   # Stage layout: segment list per stage + mode configs
├── engine/
│   ├── GameEngine.ts               # Core loop, physics, collision, camera, mode manager
│   ├── InputManager.ts             # Keyboard + Mouse
│   ├── ParallaxRenderer.ts         # 4-layer seamless horizontal loop
│   ├── PixelSpriteRenderer.ts      # Procedural pixel-art MC, weapons, enemies, props
│   ├── ParticleSystem.ts           # Slash trails, muzzle flash, mana dust, explosions
│   ├── SoundManager.ts             # Web Audio API retro SFX
│   └── ModeManager.ts              # ★ Handles TRAVERSE/SURVIVAL/DEFENSE/GAUNTLET/BOSS transitions
├── entities/
│   ├── Player.ts                   # Movement, combat, stats, style rank, adrenaline
│   ├── Enemy.ts                    # AI: patrol, chase, ranged, shield, suicide, boss phases
│   ├── Projectile.ts               # Bullet types: single, spread, piercing, orb
│   ├── Interactables.ts            # Chest, Shrine, Merchant, Checkpoint, Terminal, Pylon, Barricade, Gate
│   └── Boss.ts                     # ★ Dedicated boss logic (Colossus, Forge Titan, Aetherion)
└── components/
    ├── TitleScreen.tsx              # Main menu + start game
    ├── LoreIntro.tsx                # Animated lore crawl (skippable)
    ├── GameCanvas.tsx               # Canvas wrapper + game loop bridge
    ├── HUD.tsx                      # HP, Energy, Weapon, Shards, Stage, Style Rank, Adrenaline
    ├── TimerOverlay.tsx             # ★ Survival countdown + Hold-the-Fort Pylon HP bar
    ├── PuzzleModal.tsx              # Decryption Terminal (all puzzle trigger points)
    ├── InventoryModal.tsx           # Equip weapons & armor
    ├── MerchantModal.tsx            # Buy/Sell/Upgrade + Haggle
    ├── PauseMenu.tsx                # Pause + controls guide
    ├── StageClearScreen.tsx         # ★ Grade display (Combat + Puzzle + Time + Style)
    └── LearningReportModal.tsx      # Full educational accuracy breakdown for teachers
```

### 9.3 ModeManager Architecture ★
```
ModeManager {
  currentMode: 'traverse' | 'survival' | 'defense' | 'gauntlet' | 'boss'
  
  onEnterTraverse()   → normal camera, enable exploration, spawn interactables
  onEnterSurvival()   → lock arena, start timer, enable wave spawner, show TimerOverlay
  onEnterDefense()    → lock arena, spawn Pylon, enable wave spawner, show Pylon HP
  onEnterGauntlet()   → enable auto-scroll, disable backtrack, show speed indicator
  onEnterBoss()       → lock arena, spawn boss, start boss music, disable Merchant/Chest
  
  onExitMode()        → cleanup spawners, unlock gates, show segment rewards
  
  checkWinCondition() → per-mode:
    traverse:  MC reaches exit gate
    survival:  timer == 0 && MC alive
    defense:   all waves cleared && pylon.hp > 0
    gauntlet:  MC reaches end without being crushed
    boss:      boss.hp == 0
}
```

### 9.4 Quality & Polish Checklist
* **Game Feel:** Hitstop (30-50ms), screen shake (Shotgun, damage taken), damage numbers, afterimage dash
* **Pause on Modal:** Fisika & AI freeze saat Puzzle/Merchant/Inventory terbuka
* **Control Guide:** Tampil di pause menu + tutorial prompts di Stage 1
* **Lore Intro:** Animated text crawl (skippable)
* **Responsive Canvas:** Scale to fit viewport, maintain 16:9 aspect ratio
* **PWA Offline:** Full game playable offline setelah first load

---

## 10. BUILD ROADMAP (STEP-BY-STEP)
1. ✅ **Phase 1 — PWA Foundation:** Vite + React + TS + Tailwind + PWA shell
2. 🔨 **Phase 2 — Data & Types:** `types/index.ts`, `weapons.ts`, `armors.ts`, `enemies.ts`, `puzzles.json`, `stages.ts`
3. ⬜ **Phase 3 — Core Engine:** `InputManager`, `SoundManager`, `PixelSpriteRenderer`, `ParallaxRenderer`, `ParticleSystem`, `GameEngine`, `ModeManager`
4. ⬜ **Phase 4 — Entities:** `Player` (all movement + combat + style rank), `Enemy` (all types), `Boss` (3 bosses), `Projectile`, `Interactables` (Chest, Pylon, Terminal, Barricade, Gate, etc.)
5. ⬜ **Phase 5 — UI & Integration:** All React components (Title, Lore, HUD, Timer, Puzzle, Inventory, Merchant, Pause, StageClear, LearningReport)
6. ⬜ **Phase 6 — Polish & Verification:** Persistence, juice tuning, offline PWA check, full playtest

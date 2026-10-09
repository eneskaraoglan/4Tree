# Mimari

## 1. Genel bakış
4Tree, kullanıcıların koşu veya yürüyüş yaparak gerçek hayatta ağaç dikilmesini sağladığı bir mobil uygulamadır.
Kat edilen mesafe başına ağaç dikilir; dikimler STK'lar (TEMA, Eden Reforestation vb.) aracılığıyla yapılır.
Kullanıcı kaç ağaç dikilmesini sağladığını uygulama içinde şeffaf biçimde görür.
Mesafe GPS veya adım sayma ile ölçülür. Teşvik için başarımlar, feed, ağaç animasyonu sayfası ve kulüp/grup özellikleri vardır.

Ana kullanıcı akışları:
1. Aktivite kaydı: koşu/yürüyüş başlat, GPS rotası + hız/tempo/mesafe/süre, bitince özet.
2. Dönüşüm: mesafe/adım -> sanal birim (Tohum/Damla/Enerji) -> ağaç.
3. Orman panosu: kişisel ağaç sayısı, CO2 dengeleme, sertifikalar, dikim bölgesi haritası.
4. Oyunlaştırma: seviye, rozet, görev, liderlik tablosu.
5. Sosyal: feed (alkış/su verme, yorum), paylaşım görselleri, takım ve kulüpler.
6. Gelir: premium üyelik, ödüllü reklam, mağaza (ağaç hediye etme).
7. Gizlilik: gizlilik bölgeleri, profil görünürlüğü.

Proje kapsamı: Cem ile birlikte SADECE mobil UI/UX yapılır (ekranlar, navigasyon, tema, animasyon, cihaz sensörleri). Backend (Supabase) Cem'in tarafıdır; arayüz şimdilik mock veriyle çalışır, servis katmanı sayesinde backend sonra takılır.

Kapsam notu: Sertifikalar, dikim konumu ve sponsor gösterimi şimdilik TEMSİLİ (sahte/örnek veriyle) yapılacak; gerçek STK ve marka entegrasyonu yok.

## 2. Sistem şeması
```
Mobil (React Native / Expo)
  |-- Konum (GPS) ve Pedometer (cihaz sensörleri)
  |-- Yerel depolama (rota ve kayıtlar, offline)
  |-- src/services (arayüz) --> mock implementasyon (şimdi)
                           --> Supabase implementasyonu (Cem, sonra)
```
Ödeme, reklam ve push bildirim ilk sürümde yok.

## 3. Teknoloji seçimleri
| Katman | Seçim | Neden |
|---|---|---|
| Mobil | React Native + Expo SDK 57 + TypeScript 6 | Tek kod tabanıyla iOS ve Android |
| Backend | Supabase (Cem yönetir) | Bu projede sadece mobil UI/UX; veri mock |
| Veri katmanı (mobil) | src/services arayüzleri + mock | Backend sonradan takılabilsin |
| Giriş | E-posta + Google (ekranlar; mock oturum) | Cem'in kararı, gerçek auth backend tarafında |
| Tema | Koyu tema, ana renk yeşil | Cem'in kararı |
| Dil | Türkçe (i18n altyapısı hazır tutulur) | İlk sürüm |
| Navigasyon | expo-router (öneri, onay bekliyor) | Expo'nun standart çözümü |
| Konum / harita | expo-location + expo-task-manager (arka plan), react-native-maps (öneri, onay bekliyor) | Arka planda rota kaydı için |
| Adımsayar | expo-sensors Pedometer (öneri, onay bekliyor) | Cihazın yerleşik sayacı |
| Animasyon | react-native-reanimated + react-native-svg | Ağaç büyüme animasyonu, feed etkileşimleri |

Not: Arka planda GPS takibi için Expo Go yetmez, development build (EAS) gerekir.

## 4. Klasör yapısı ve katmanlar
### mobile/ (Expo SDK 57, TypeScript, yol takma adı `@/` = `src/`)
- `src/app/` expo-router ekranları; `(tabs)/` altında Koşu (index), Orman, Başarımlar, Feed, Profil
- `src/components/` ortak UI bileşenleri
- `src/features/` özellik bazlı klasörler (tracking, forest, gamification, feed, auth, privacy)
- `src/services/` arayüzler, `src/services/mock/` sahte veri
- `src/theme/` renk, tipografi, boşluk token'ları (koyu tema, yeşil ana renk)
- `src/types/` ortak tipler
- `src/i18n/` Türkçe metinler

## 5. Veri modeli
MOCK TİPLER olarak başlar (mobile/src/types). Gerçek şema Cem'in backend'inden gelince güncellenir. Ana varlıklar:
- profiles (kullanıcı, seviye, gizlilik ayarı, premium durumu)
- activities (tür: koşu/yürüyüş, mesafe, süre, kaynak: gps/pedometer, başlangıç zamanı)
- activity_routes (rota noktaları; gizlilik bölgesi kırpması uygulanmış hali)
- privacy_zones (kullanıcının gizlediği konumlar)
- tree_conversions / trees (mesafeden hesaplanan ağaç, sponsor, dikim bölgesi, sertifika; temsili)
- badges, user_badges
- challenges, challenge_participants
- posts, reactions, comments (feed)
- friendships
- teams, team_members
- purchases (hediye ağaç, abonelik)
Alanlar ve ilişkiler görev başlarken netleştirilir.

## 6. API sözleşmesi (servis arayüzleri)
Mobil `mobile/src/services/` arayüzlerine göre çalışır; şimdilik `mock/` implementasyonu bağlı. Backend bu arayüzlere uyacak şekilde yazılır.
- `useServices()` hook'u ve `<ServicesProvider services={...}>`: ekranlar servisi buradan alır; testlerde sahte servis verilir.
- `createMockServices({ scenario: 'default' | 'empty' | 'error', latencyMs })`: dolu, yeni kullanıcı (boş) ve hata senaryoları.
- Arayüzler: ProfileService, ActivityService, ForestService, BadgeService, FeedService, PrivacyService (hepsi Promise döner). Hatalar `ServiceError` (kodlar: network, not_found, invalid).
- FeedService tepkileri idempotent: `setClap(postId, value)`, `setWater(postId, value)`; güncel gönderiyi döner.
- Dönüşüm yardımcıları (`conversion.ts`): `KM_PER_TREE = 20`, `kmToTrees`, `kmToNextTree`, `progressToNextTree` (kayan nokta güvenli).
- Tipler: `mobile/src/types/`.
Backend notları (Cem'e): tepkiler sunucuda "kullanıcı + gönderi + tür" üzerinde upsert olmalı; seviye eşikleri (0/3/10/25 ağaç) varsayımdır, sunucudan gelmeli; rozet kazanma, seviye ve ağaç dönüşümü sunucuda hesaplanmalı; feed tepkileri ve gizlilik ayarları kalıcı olmalı.

## 7. Kimlik doğrulama ve yetkilendirme
Giriş yöntemleri: e-posta+şifre ve Google. Mobilde bu aşamada sadece ekranlar ve mock oturum vardır.
Gerçek auth backend (Supabase) tarafında Cem'in sorumluluğundadır. Oturum token'ı mobilde güvenli depolamada (expo-secure-store) tutulur.
Profil görünürlüğü (herkese açık / sadece arkadaşlar / gizli) için backend tarafında yetkilendirme gerekir; mobil sadece ayarı gösterir.

## 8. Güvenlik ilkeleri
- Yetkilendirme backend tarafında yapılır (Cem); mobil istemciye güvenilmez.
- Mobil uygulamada gizli anahtar bulunmaz; sadece herkese açık anahtarlar ortam değişkeninden gelir.
- Hassas veri (token, oturum) expo-secure-store'da tutulur, AsyncStorage'da değil.
- Log'lara şifre, token, konum ve kişisel veri yazılmaz.
- Konum ve sağlık verisi kişisel veridir; KVKK uyumu için açık rıza, aydınlatma metni ve silme hakkı sağlanır.
- Gizlilik bölgeleri (ev/iş) rota kaydedilirken/paylaşılırken kırpılır (UI: paylaşım/önizleme ekranında gizli bölge gösterilmez; kalıcı kırpma backend notu); ham rota gizli bölgeyi asla başkasına göstermez.
- Hile önlemi backend notudur (makul hız/mesafe kontrolü sunucuda).
- Bağımlılıklar eklenmeden önce gerekçesi belirtilir.

## 9. Kodlama standartları
Detaylar: .claude/rules/code-style.md ve testing.md.

## 10. Kararlar günlüğü
| Tarih | Karar | Gerekçe | Karar veren |
|---|---|---|---|
| 2026-10-10 | Mobil: React Native + Expo | Mobil için en uygun React çözümü | Cem |
| 2026-10-10 | Backend: Supabase | Ayrı backend yazmaya gerek yok | Cem |
| 2026-10-10 | Proje kapsamı sadece mobil UI/UX; backend Cem'de, veri mock | Rol ayrımı | Cem |
| 2026-10-10 | MVP: GPS/adımsayar takibi, dönüşüm, orman panosu, rozet/seviye, giriş. Feed de yapılabilirse eklenir | Öncelik | Cem |
| 2026-10-10 | Dönüşüm: 20 km = 1 ağaç; birim km (sanal para birimi yok) | Basitlik | Cem |
| 2026-10-10 | Platform: iOS ve Android birlikte (React Native) | Tek kod tabanı | Cem |
| 2026-10-10 | Giriş: e-posta + Google | | Cem |
| 2026-10-10 | Dil: sadece Türkçe (i18n altyapısıyla) | İlk sürüm | Cem |
| 2026-10-10 | Offline: rota yerelde tutulur, bağlantı gelince senkron (senkron kısmı backend) | Koşuda internet zayıf olabilir | Cem |
| 2026-10-10 | Tema: koyu, ana renk yeşil | | Cem |
| 2026-10-10 | Palet v1 (terk edildi, yapay zekâ klişesi): canvas #0A0F0C, #3ED67F | Koyu zeminde canlı ama doğal, spor markası volt'una benzemeyen yeşil | Claude (Cem yetki verdi) |
| 2026-10-10 | Tasarım v2: ağaç halkası imzası, doğal sıcak palet (canvas #0C1713, yaprak #8DBF6A, huş metin, kehribar), Bricolage Grotesque + Figtree, kartsız editoryal düzen; detay mobile/DESIGN.md | Cem 'çok AI gibi' dedi; neon+siyah+kart yığını klişesinden çıkış | Claude (Cem yetki verdi) |
| 2026-10-10 | Ağaç animasyonu: Reanimated + react-native-svg ile kodla çizim (Lottie yok) | Temaya uyar, hafif, her ağaç farklı, harici tasarım dosyası gerekmez | Claude (Cem yetki verdi) |
| 2026-10-10 | Alt menü: Koşu, Orman, Başarımlar, Feed, Profil | | Cem |
| 2026-10-10 | Sertifika, dikim konumu ve sponsor gösterimi temsili yapılacak | Gerçek STK/marka entegrasyonu şimdilik yok | Cem |

## 11. Açık sorular
- KARAR BEKLİYOR: harita sağlayıcısı (react-native-maps varsayılanı yeterli mi)
- KARAR BEKLİYOR: adım sayma modunda "günlük adım -> km" çevrimi (adım uzunluğu varsayımı)
- Backend notları (Cem'e): dönüşüm ve liderlik hesabı, premium, ödeme, reklam, hile önleme, rota senkronu

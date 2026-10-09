# 4Tree Tasarım Dili (v2)

## Fikir
Her koşu bir ağacın gövdesinde yeni bir halka olur. 4Tree'nin imzası **ağaç halkası** (dendrokronoloji kesiti): 20 km'lik ilerleme, elle çizilmiş gibi dalgalı, iç içe halkalar olarak büyür. Orman sayfası bu halkaların ağaca dönüşmüş hali: katmanlı tepeler, gün batımı ışığı, tek tek dikilmiş ağaçlar.
Karakter: sıcak, doğal, el yapımı; spor uygulaması soğukluğu yok. Bir tohum paketi, bir arazi defteri, bir orman pasaportu hissi.

Önceki sürümün sorunu: "siyaha yakın zemin + neon yeşil + aynı kartlar + hazır ikonlar + 'Yakında' kutuları" tam bir yapay zekâ şablonuydu. Bu sürümde bunların hepsi bilinçli olarak terk edildi (aşağıdaki "Yapma" listesine bak).

## Renk
Koyu ama siyah değil: gece ormanı. Yeşil ana renk olarak kalır, ama doğal, sıcak bir yeşil; ışığı sıcak "huş" beyazı ve kehribar verir.
| Token | Değer | Adı | Kullanım |
|---|---|---|---|
| canvas | `#0C1713` | Gece ormanı | Ekran zemini |
| surface | `#13251D` | Çam | Yüzeyler, sheet |
| surface2 | `#1D372B` | Yosun | Yükseltilmiş yüzey, input |
| divider | `#2A4739` | Dal | İnce çizgi (az kullan) |
| primary | `#8DBF6A` | Yaprak | Ana buton, aktif tab, ilerleme |
| primaryPressed | `#76A656` | | Basılı |
| primaryGlow | `rgba(141,191,106,0.28)` | | Sadece ana CTA/halka ışıması |
| onPrimary | `#0C1713` | | Yaprak üstü metin |
| text | `#EEE9DA` | Huş | Birincil metin (sıcak beyaz) |
| textSecondary | `#A9B8A8` | Adaçayı | İkincil metin |
| textTertiary | `#70857A` | Gölge | Yardımcı metin |
| gold | `#E3A857` | Kehribar | Rozet, seviye, gün ışığı, rekor |
| bark | `#A8754B` | Gövde | Gövde, halka çizgisi, toprak |
| water | `#7FB7C9` | Dere | "Su ver" tepkisi |
| danger | `#E5735F` | Kızıl | Hata |

İllüstrasyon paleti (tepeler, gökyüzü, ağaç yaprakları) `src/theme/illustration.ts` içinde ayrı tutulur: gün batımı gradyanı (`#2B4A43` > `#C9884A` ufukta), 4-5 kademe orman yeşili (`#1B3A2B`, `#245238`, `#2F6B45`, `#4C8B52`, `#8DBF6A`), sonbahar vurguları (`#D08A3C`, `#B5532E`).
Kurallar: tüm metin/zemin ikilileri WCAG AA. Aynı ekranda en fazla 1-2 parlak yeşil öğe. Saf siyah/beyaz yok.
Kullanım sınırı: `textTertiary` ve `bark` sadece `canvas` üzerinde metin olarak AA'dır (~4,6:1); `surface`/`surface2` üzerinde metin rengi olarak kullanılmaz (bark orada yalnız dekoratif çizgi/dolgu).
`danger` metin olarak `canvas` ve `surface` üstünde kullanılır, `surface2` üstünde değil.

## Tipografi
- **Başlık ve sayılar: Bricolage Grotesque** (700/800). Karakterli, hafif tuhaf, sıcak bir grotesk; büyük rakamlarda kimliği taşır. (`@expo-google-fonts/bricolage-grotesque`)
- **Metin: Figtree** (400/500/600). Temiz, okunaklı, yuvarlak. (`@expo-google-fonts/figtree`)
- İkisi de Latin-Extended destekler; ş ğ ı İ ö ü ç her ikisinde de doğrulanmalı (test ekranında).
- Ölçek: sayaç 76/80 (800), büyük sayı 44/48 (700), başlık1 30/36 (800), başlık2 22/28 (700), başlık3 18/24 (600), gövde 16/24 (400), ikincil 14/20 (400), küçük 12/16 (500).
- Büyük harf (ALL CAPS) etiket YOK. Cümle düzeni (sentence case). Harf aralığı sadece büyük rakamlarda hafif negatif (-0.5).
- Sayaçta rakamlar zıplamasın: font tabular değilse her rakam sabit genişlikte kutuda gösterilir.

## Biçim, boşluk, yüzey
- 4 pt grid. Yan boşluk 20 (önceki 16).
- Her şey aynı yuvarlaklıkta kart OLMAZ. Hiyerarşiye göre: büyük sahne alanları kenardan kenara (köşesiz), liste satırları kartsız (sadece boşluk), öne çıkan özetler büyük yarıçaplı (28) ya da doğal "yaprak/taş" biçimli.
- Gölge yok; derinlik katmanlı tepeler, renk geçişleri ve ışık halesiyle.
- Dokunma hedefi en az 44x44; ana CTA yüksekliği 60.
- Çizgi ve çerçeve az: ayırıcı yerine boşluk.
- İkonlar: `@expo/vector-icons` MaterialCommunityIcons (doğa/koşu setleri: shoe-sneaker, pine-tree, medal-outline, account-group-outline, account-outline, sprout). Aynı ekranda stil karışmasın, 1.75 çizgi kalınlığına yakın outline.

## Ekranlar (düzen kararları)
### Koşu (ana ekran)
```
Günaydın, Elif            (sol hizalı, sıcak selam)
[   büyük dalgalı AĞAÇ HALKASI  ]   <- ekranın ~45%'i, ortada büyük "7,6" (bu ağaç için yapılan km) ve "/ 20 km", altında "Ağacına 12,4 km kaldı."
  halkalar: tamamlanan km kadar dolu, elle çizilmiş gibi hafif düzensiz
Koşu · Yürüyüş            (altı çizili metin sekmeleri, hap değil)
[ Başla  ›››  ]           (geniş, 60 yüksek, solda etiket sağda ikon, yaprak yeşili, glow)
Son koşun                 (kartsız satır: mini rota çizgisi + 5,2 km · 31 dk)
```
Halka açılışta bir kez (≤900 ms) içten dışa çizilir. Aktif koşu görünümü sonraki görevde.

### Orman
Üstte kenardan kenara illüstrasyon sahnesi (yaklaşık ekranın %55'i): gün batımı gökyüzü, 4-5 katmanlı tepe, kullanıcının dikilmesini sağladığı ağaçlar farklı boy/türde, hafifçe sallanır. Altında sadece büyük iki sayı (ağaç, CO₂) ve dikim bölgeleri listesi (kartsız). Ağaca dokununca alt sheet: tür, dikim bölgesi, tarih, "Örnek sertifika" etiketi (TEMSİLİ).

### Başarımlar
"Orman pasaportu": üstte seviye yolu (Tohum, Fidan, Ağaç, Orman) yatay, bulunduğun aşamada gövde çizimi. Altında rozetler **posta pulu** biçiminde (tırtıklı kenar): kazanılanlar renkli ve tarihli "damga" ile, kazanılmayanlar soluk ve karanlık siluet. Izgara 2 sütun, pullar farklı yönlerde hafif eğik.

### Feed
Kartsız editoryal akış. Her gönderi: baştaki harfli organik avatar, ad, tek cümlelik özet, tam genişlik **rota çizimi** (topografik çizgi gibi, ince), altında kazanılan ağaç sayısı (küçük ağaç glifleri) ve iki tepki: Alkış, Su ver (metin + ikon). Gönderiler arası geniş boşluk, kutu yok.

### Profil
Karne gibi: ad ve seviye, 3-4 büyük sayı (toplam km, ağaç, aktif gün), gizlilik ayarları satır satır (yerel switch), gizlilik bölgeleri.

## Hareket (tek orkestre an + cevap veren hareket)
- İmza: ağaç halkası çizimi (Koşu açılışı) ve ağaç büyüme animasyonu (ağaç kazanma, Orman'a yeni ağaç).
- Orman'da ağaçların çok hafif sallanması (4-6 sn döngü).
- Dokunmaya cevap: butonlarda basınca ölçek, tepkilerde küçük sıçrama. Sayfa girişlerinde "aşağıdan kayarak gelen" süs animasyonu YOK.
- `Reduce Motion` açıksa tüm süs animasyonları statik.
- Haptics: başlat (Heavy), bitir/ağaç kazan (Success), rozet (Medium), tepki (Light).

## Metin tonu (Türkçe)
- Sıcak, somut, kısa. Cümle düzeni. Süslü slogan yok.
- Örnek: "Ağacına 12,4 km kaldı." "Bugün ilk koşun, başlayalım mı?" "Henüz ağacın yok, ilk 20 km'yi bekliyor."
- Boş durum bir sonraki adımı söyler. Buton etiketi eylemi söyler: "Başla", "Bitir", "Su ver", "Alkışla".
- Mock isimler gerçekçi ve yerel: Elif, Mert, Zeynep, Can, Defne; yerler: Belgrad Ormanı, Kaz Dağları, Ege kıyısı, Bolu.
- Temsili içerik (sertifika, dikim yeri, sponsor) küçük "Örnek" etiketiyle belirtilir.

## Yapma listesi (yapay zekâ izi)
- Neon vurgulu siyah ekran, hepsi aynı yarıçaplı ve aynı gölgeli kart yığını.
- ALL CAPS küçük etiketler, her başlığın üstüne etiket, "01/02/03" numaralandırma (içerik sıralı değilse).
- Cümlede tek kelimeyi renkli/italik yapmak.
- "Yakında" kutusu, boş dolgu metni, aynı ikon seti ile her şeyi doldurmak.
- Her bölüme "aşağıdan fade-in" animasyonu.
- Gradient süs lekeleri; gradyan sadece gökyüzü/ışık gibi anlam taşıyorsa.

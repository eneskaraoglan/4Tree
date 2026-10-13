/** Koşu ekranı metinleri. Bileşenlere metin gömülmez; hepsi buradan gelir. */
export const trRun = {
  greeting: {
    morning: 'Günaydın',
    day: 'İyi günler',
    evening: 'İyi akşamlar',
  },
  /** "Günaydın, Elif" ya da (isim yokken) "Günaydın". */
  greet: (salutation: string, name?: string) => (name ? `${salutation}, ${name}` : salutation),
  ring: {
    /** Halkanın ortasındaki küçük metin: "/ 20 km". */
    of: (total: string) => `/ ${total} km`,
    remaining: (km: string) => `Ağacına ${km} km kaldı.`,
    emptyTree: "Henüz ağacın yok, ilk 20 km'yi bekliyor.",
    a11y: (done: string, remaining: string) => `Bu ağaç için ${done} km yapıldı, ${remaining} km kaldı`,
    a11yEmpty: "Henüz ağacın yok, ilk 20 km'yi bekliyor",
    loading: 'Yükleniyor',
  },
  start: {
    label: 'Başla',
    a11y: 'Aktiviteyi başlat',
  },
  /** Başla'ya basınca konum izni yoksa açılan açıklama ve ret durumu. */
  permission: {
    rationale: {
      title: 'Konumunu neden istiyoruz?',
      body: 'Rotanı çizmek ve kat ettiğin mesafeyi doğru ölçmek için konumuna ihtiyaç var. Konum yalnızca aktivite sırasında kullanılır; koşu mu yürüyüş mü olduğunu hızından biz anlarız.',
      allow: 'İzin ver',
      later: 'Şimdi değil',
    },
    denied: {
      title: 'Konum izni kapalı',
      body: 'Konum izni olmadan aktiviteni kaydedemeyiz. Ayarlarda 4Tree için konumu "Uygulamayı kullanırken" olarak aç, sonra tekrar Başla\'ya bas.',
      openSettings: 'Ayarları aç',
      close: 'Tamam',
    },
    error: 'İzin istenirken bir sorun çıktı. Tekrar dene.',
  },
  last: {
    title: 'Son aktiviten',
    run: 'Koşu',
    walk: 'Yürüyüş',
    /** "Koşu · 6,2 km · 36 dk" */
    stats: (type: string, km: string, duration: string) => `${type} · ${km} km · ${duration}`,
    a11yRoute: 'Rota çizimi',
    nextStep: 'Bugün ilk aktiviten, başlayalım mı?',
  },
  /** Uygulama kapanınca yarım kalan aktivite. */
  recovery: {
    title: 'Yarım kalan aktivite var',
    /** "3,2 km · 24 dk" */
    stats: (km: string, duration: string) => `${km} km · ${duration}`,
    resume: 'Devam et',
    save: 'Kaydet',
    discard: 'Sil',
    discardConfirm: {
      title: 'Yarım kalan aktivite silinsin mi?',
      message: 'Rotası ve mesafesi silinir, geri alınamaz.',
      confirm: 'Sil',
      cancel: 'Geri dön',
    },
  },
  /** Kaydedilip gönderilemeyen aktiviteler (offline kuyruk). */
  pending: {
    one: 'Bir aktiviten bağlantı gelince gönderilecek.',
    many: (count: number) => `${count} aktiviten bağlantı gelince gönderilecek.`,
    sendNow: 'Şimdi gönder',
    sending: 'Gönderiliyor…',
    failed: 'Gönderilemedi, bağlantı gelince yine denenecek.',
    /** Birkaç denemeden sonra da gönderilemeyen aktiviteler. */
    stuckOne: 'Bir aktivite gönderilemedi.',
    stuckMany: (count: number) => `${count} aktivite gönderilemedi.`,
    retry: 'Yeniden dene',
    remove: 'Sil',
    removeConfirm: {
      title: 'Gönderilemeyen aktiviteler silinsin mi?',
      message: 'Rotaları ve mesafeleri silinir, geri alınamaz.',
      confirm: 'Sil',
      cancel: 'Geri dön',
    },
  },
  duration: {
    minutes: (m: number) => `${m} dk`,
    hoursMinutes: (h: number, m: number) => `${h} sa ${m} dk`,
  },
  relative: {
    today: 'bugün',
    yesterday: 'dün',
    daysAgo: (n: number) => `${n} gün önce`,
    weeksAgo: (n: number) => `${n} hafta önce`,
    monthsAgo: (n: number) => `${n} ay önce`,
  },
  error: {
    network: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    notFound: 'Bilgilerin bulunamadı. Biraz sonra tekrar dene.',
    invalid: 'Bilgilerin okunamadı. Biraz sonra tekrar dene.',
    generic: 'Bir şeyler ters gitti. Tekrar dene.',
    retry: 'Tekrar dene',
  },
} as const;

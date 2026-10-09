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
  tabs: {
    label: 'Aktivite türü',
    run: 'Koşu',
    walk: 'Yürüyüş',
  },
  start: {
    label: 'Başla',
    a11yRun: 'Koşuyu başlat',
    a11yWalk: 'Yürüyüşü başlat',
  },
  last: {
    run: 'Son koşun',
    walk: 'Son yürüyüşün',
    /** "6,2 km · 36 dk" */
    stats: (km: string, duration: string) => `${km} km · ${duration}`,
    a11yRoute: 'Rota çizimi',
    nextStepRun: 'Bugün ilk koşun, başlayalım mı?',
    nextStepWalk: 'Bugün ilk yürüyüşün, başlayalım mı?',
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

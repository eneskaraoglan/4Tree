/** Feed ekranı metinleri. Bileşenlere metin gömülmez; hepsi buradan gelir. */
export const trFeed = {
  tabs: {
    label: 'Akış kaynağı',
    friends: 'Arkadaşlar',
    everyone: 'Herkes',
  },
  loading: 'Yükleniyor',
  activity: {
    run: 'Koşu',
    walk: 'Yürüyüş',
  },
  /** "Koşu · 56 dk · Belgrad Ormanı" */
  meta: (activity: string, duration: string, place: string) => `${activity} · ${duration} · ${place}`,
  distance: (km: string) => `${km} km`,
  routeA11y: (km: string) => `${km} km rota çizimi`,
  duration: {
    minutes: (m: number) => `${m} dk`,
    hoursMinutes: (h: number, m: number) => `${h} sa ${m} dk`,
  },
  trees: {
    /** Ağaç glifleri ekran okuyucuya tek cümle olarak okunur. */
    a11y: (n: number) => `${n} ağaç kazandı`,
    more: (n: number) => `+${n}`,
  },
  reactions: {
    clap: {
      label: 'Alkışla',
      a11y: (count: number, selected: boolean) =>
        `Alkışla, ${count > 0 ? `${count} kişi alkışladı` : 'henüz kimse alkışlamadı'}${selected ? ', seçili' : ''}`,
      error: 'Alkış gönderilemedi. Tekrar dene.',
    },
    water: {
      label: 'Su ver',
      a11y: (count: number, selected: boolean) =>
        `Su ver, ${count > 0 ? `${count} kişi su verdi` : 'henüz kimse su vermedi'}${selected ? ', seçili' : ''}`,
      error: 'Su verilemedi. Tekrar dene.',
    },
  },
  comments: (n: number) => `${n} yorum`,
  time: {
    justNow: 'az önce',
    minutesAgo: (n: number) => `${n} dk önce`,
    hoursAgo: (n: number) => `${n} saat önce`,
    yesterday: 'dün',
    daysAgo: (n: number) => `${n} gün önce`,
    weeksAgo: (n: number) => `${n} hafta önce`,
    monthsAgo: (n: number) => `${n} ay önce`,
  },
  empty: {
    friends: 'Arkadaşların koşmaya başlayınca burada görünecek.',
    everyone: 'Koşular paylaşıldıkça burada görünecek. İlk koşuyu sen yap.',
  },
  error: {
    network: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    notFound: 'Akış bulunamadı. Biraz sonra tekrar dene.',
    invalid: 'Akış okunamadı. Biraz sonra tekrar dene.',
    generic: 'Bir şeyler ters gitti. Tekrar dene.',
    retry: 'Tekrar dene',
    refresh: 'Akış yenilenemedi. Biraz sonra tekrar dene.',
  },
} as const;

/** Orman ekranı metinleri. Bileşenlere metin gömülmez; hepsi buradan gelir. */
export const forestTr = {
  sceneEmptyLabel: 'Boş orman: gün batımında tepeler ve yeni bir fidan',
  sceneLoadingLabel: 'Orman yükleniyor',
  treeLabel: (species: string, region: string) => `${species}, ${region}`,
  stats: {
    trees: 'ağaç',
    co2: 'tahmini CO₂ (kg/yıl)',
    treesLabel: (count: string) => `${count} ağaç`,
    co2Label: (kg: string) => `tahmini karbondioksit, yılda ${kg} kilogram`,
  },
  regions: {
    title: 'Dikim bölgeleri',
    sample: 'Örnek',
    treeCount: (count: string) => `${count} ağaç`,
  },
  empty: 'Henüz ağacın yok, ilk 20 km\'yi bekliyor.',
  error: {
    message: 'Ormanına şu an ulaşamadık. Bağlantını kontrol edip tekrar dene.',
    retry: 'Tekrar dene',
  },
  sheet: {
    /** Tarih okunamazsa `date` boş gelir ve baştaki ayraç yazılmaz. */
    certificateLine: (date: string, certificateNo: string) =>
      date ? `${date} · Sertifika no ${certificateNo}` : `Sertifika no ${certificateNo}`,
    sampleCertificate: 'Örnek sertifika',
    sponsor: (name: string) => `Bu ağacın dikimini ${name} üstlendi`,
    close: 'Kapat',
    treeImage: (species: string) => `${species} ağacı çizimi`,
  },
  months: [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ],
} as const;

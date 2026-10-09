/** Başarımlar ("Orman pasaportu") ekranı metinleri. Bileşenlere metin gömülmez. */
export const achievements = {
  title: 'Orman pasaportu',
  levels: {
    seed: 'Tohum',
    sapling: 'Fidan',
    tree: 'Ağaç',
    forest: 'Orman',
  },
  path: {
    label: (current: string) => `Seviye yolu: Tohum, Fidan, Ağaç, Orman. Şu an ${current} seviyesindesin.`,
    progressLabel: (percent: number) => `Sonraki seviyeye ilerleme, yüzde ${percent}`,
    /** "Fidan olmana 2 ağaç kaldı." */
    toNext: (nextLevel: string, trees: number) => `${nextLevel} olmana ${trees} ağaç kaldı.`,
    topLevel: 'En üst seviyedesin, ormanın büyümeye devam ediyor.',
  },
  summary: (earned: number, total: number) => `${earned} / ${total} pul topladın`,
  emptyHint: 'Pasaportun henüz boş, ilk koşunla ilk pulunu kazanırsın.',
  loading: 'Pasaportun açılıyor.',
  error: {
    message: 'Pasaportun yüklenemedi. Bağlantını kontrol edip tekrar dene.',
    retry: 'Tekrar dene',
  },
  stamp: {
    locked: 'Kilitli',
    earnedLabel: (name: string, date: string | null) =>
      date ? `${name}, kazanıldı, ${date}` : `${name}, kazanıldı`,
    lockedLabel: (name: string, hint: string) => `${name}, kilitli, nasıl kazanılır: ${hint}`,
  },
  sheet: {
    earnedOn: (date: string) => `${date} tarihinde kazandın.`,
    howTo: (hint: string) => `Nasıl kazanılır: ${hint}`,
    close: 'Kapat',
    closeBackdrop: 'Pulu kapat',
  },
  months: {
    short: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    long: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  },
} as const;

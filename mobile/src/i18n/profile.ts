import type { LevelName, Visibility } from '@/types';

/** Profil ("karne") ekranı metinleri. Bileşenlere metin gömülmez. */
export const profileTr = {
  loading: 'Karnen hazırlanıyor.',
  loadError: 'Karnen yüklenemedi. Bağlantını kontrol edip tekrar dene.',
  retry: 'Tekrar dene',
  levels: {
    seed: 'Tohum',
    sapling: 'Fidan',
    tree: 'Ağaç',
    forest: 'Orman',
  } satisfies Record<LevelName, string>,
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
  /** {date} yerine "Aralık 2025'ten" gibi eklenmiş tarih gelir. */
  since: '{date} beri',
  stats: {
    km: 'kilometre yol aldın',
    trees: 'ağacın dikilmesini sağladın',
    days: 'gün hareket ettin',
    emptyHint: 'İlk koşunda karne dolmaya başlar.',
  },
  privacy: {
    title: 'Gizlilik',
    visibilityTitle: 'Profilini kim görebilir?',
    visibility: {
      public: 'Herkes',
      friends: 'Arkadaşlar',
      private: 'Sadece ben',
    } satisfies Record<Visibility, string>,
    visibilityHint: {
      public: 'Profilini ve koşularını herkes görebilir.',
      friends: 'Profilini ve koşularını sadece arkadaşların görebilir.',
      private: 'Profilini ve koşularını sadece sen görürsün.',
    } satisfies Record<Visibility, string>,
    visibilityError: 'Gizlilik ayarın kaydedilemedi. Tekrar dene.',
    zonesTitle: 'Gizlilik bölgeleri',
    zonesExplain: 'Bu bölgelerde başlayan ya da biten koşuların rotası başkalarına gösterilmez.',
    zonesEmpty: 'Henüz gizlediğin bir yer yok. Evinin çevresini gizleyebilirsin.',
    radiusMeters: '{radius} m',
    zoneRadiusLabel: '{label}, {radius} metre',
    addZone: 'Bölge ekle',
    zoneName: 'Bölge adı',
    zoneNamePlaceholder: 'Örn. Ev, iş',
    zoneRadius: 'Yarıçap',
    zoneLocation: 'Konum şimdilik örnek bir noktadan alınıyor.',
    zoneSave: 'Ekle',
    zoneCancel: 'Vazgeç',
    zoneAddError: 'Bölge eklenemedi. Tekrar dene.',
    zoneRemove: 'Sil',
    zoneRemoveConfirm: 'Silmek için tekrar dokun',
    zoneRemoveLabel: 'Sil, {label}',
    zoneRemoveConfirmLabel: 'Silmek için tekrar dokun, {label}',
    zoneRemoveError: 'Bölge silinemedi. Tekrar dene.',
  },
  signOut: {
    action: 'Çıkış yap',
    title: 'Çıkış yapılsın mı?',
    message: 'İstediğin zaman tekrar giriş yapabilirsin.',
    cancel: 'Vazgeç',
  },
  version: 'Sürüm {version}',
} as const;

/** "{anahtar}" yer tutucularını doldurur. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

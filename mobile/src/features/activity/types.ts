/** Konum kaynağından gelen ham ölçüm (expo-location LocationObject'in sadeleştirilmiş hali). */
export type LocationSample = {
  lat: number;
  lng: number;
  /** Ölçüm zamanı, epoch ms. */
  timestamp: number;
  /** Belirsizlik yarıçapı (m); bilinmiyorsa null. */
  accuracyM: number | null;
  /** Anlık hız (m/sn); bilinmiyorsa null. */
  speedMs: number | null;
};

/** Elenmemiş (kabul edilmiş) rota noktası. */
export type TrackPoint = {
  lat: number;
  lng: number;
  /** Epoch ms. */
  t: number;
  /** Bölüm numarası: duraklatma ya da büyük sıçrama sonrası artar; farklı bölümler arasında mesafe sayılmaz. */
  seg: number;
};

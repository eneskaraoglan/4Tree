/** Sertifika, dikim bölgesi ve sponsor TEMSİLİDİR; isSample her zaman true. */
export type ForestTree = {
  id: string;
  /** Ağaç türü, örn. "Meşe". */
  species: string;
  /** ISO 8601 dikim tarihi (temsili). */
  plantedAt: string;
  region: string;
  sponsor?: string;
  certificateNo: string;
  isSample: true;
};

import { ACTIVITY_DRAFT_KEY } from './activityDraftStore';
import { ACTIVITY_QUEUE_KEY } from './activityQueue';
import { createAsyncStorage, type KeyValueStorage } from './storage';

/**
 * Çıkışta cihazdaki aktivite verisini siler: kayıt taslağı ve gönderilmeyi bekleyen yükleme kuyruğu.
 * Aynı cihazda başka bir hesap açıldığında önceki kullanıcının rotası görünmesin ya da onun adına gönderilmesin.
 * Anahtarlar store dosyalarının dışa açtığı sabitlerdir; kuyruğun "hepsini sil" metodu olmadığı için doğrudan silinir.
 */
export async function clearActivityLocalData(storage: KeyValueStorage = createAsyncStorage()): Promise<void> {
  await Promise.all([storage.removeItem(ACTIVITY_DRAFT_KEY), storage.removeItem(ACTIVITY_QUEUE_KEY)]);
}

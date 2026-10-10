import { createMockServices } from './mock';
import { createSupabaseServices } from './supabase';

/**
 * Varsayılan servis seti.
 * Jest test ortamında mock servisler, canlı ortamda Supabase servisleri kullanılır.
 */
export const services =
  process.env.NODE_ENV === 'test'
    ? createMockServices()
    : createSupabaseServices();


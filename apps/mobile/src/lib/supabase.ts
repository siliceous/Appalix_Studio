import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';

// SecureStore has a 2048-byte limit per key.
// Supabase session JSON exceeds this, so we chunk large values.
const CHUNK_SIZE = 1800; // stay safely under the 2048 limit

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    // Try reading a chunked value first
    const countStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (countStr !== null) {
      const count = parseInt(countStr, 10);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    }
    // Fall back to a plain (non-chunked) value
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      // Small enough — store directly, clean up any old chunks
      await SecureStore.setItemAsync(key, value);
      await ChunkedSecureStore._clearChunks(key);
      return;
    }
    // Split into chunks
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    // Remove any plain (non-chunked) key that may exist
    await SecureStore.deleteItemAsync(key).catch(() => null);
    // Write each chunk
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => null);
    await ChunkedSecureStore._clearChunks(key);
  },

  async _clearChunks(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}.chunks`).catch(() => null);
    if (countStr !== null) {
      const count = parseInt(countStr, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`).catch(() => null);
      }
      await SecureStore.deleteItemAsync(`${key}.chunks`).catch(() => null);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

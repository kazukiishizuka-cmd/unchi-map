import "react-native-get-random-values";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = "https://hjojrowfbeairaiumlbk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb2pyb3dmYmVhaXJhaXVtbGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzQwNDUsImV4cCI6MjA5MjAxMDA0NX0.6M5bhNyIGibgzZBO4KT7rJqNputG7sN-QS1e0vVV8Wg";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

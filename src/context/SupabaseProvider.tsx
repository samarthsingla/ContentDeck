import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  client: externalClient,
  children,
}: {
  client?: SupabaseClient;
  children: React.ReactNode;
}) {
  const client = externalClient ?? supabase;

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): SupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error('useSupabase must be used within SupabaseProvider');
  return client;
}

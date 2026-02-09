import { createContext, useContext, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  url,
  anonKey,
  client: externalClient,
  children,
}: {
  url: string;
  anonKey: string;
  client?: SupabaseClient;
  children: React.ReactNode;
}) {
  const client = useMemo(
    () => externalClient ?? getSupabaseClient(url, anonKey),
    [externalClient, url, anonKey],
  );

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): SupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) throw new Error('useSupabase must be used within SupabaseProvider');
  return client;
}

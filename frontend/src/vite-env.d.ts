/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OWNER_KEY: string;
  readonly VITE_STRIPE_STARTER_PRICE: string;
  readonly VITE_STRIPE_PRO_PRICE: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

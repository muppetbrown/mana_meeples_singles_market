/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;  // Optional, has fallback logic
  readonly VITE_API_FALLBACK_URL?: string;
  readonly VITE_DEV_API_URL?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
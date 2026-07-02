/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base origin of the Hive API in production (e.g. https://hive-api.onrender.com). Empty in dev = use the Vite proxy. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

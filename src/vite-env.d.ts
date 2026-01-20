/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_OPENPANEL_CLIENT_ID?: string;
  readonly VITE_OPENPANEL_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

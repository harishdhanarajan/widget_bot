/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the workflow API (RAG + LLM backend). Defaults to the mock server. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

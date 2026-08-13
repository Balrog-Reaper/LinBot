declare namespace NodeJS {
  interface ProcessEnv {
    BOTTOKEN: string;
    MYUSERID: string;
    CLIENTID?: string;
    GUILDID?: string;

    KLIPYTOKEN: string;

    OLLAMA_URL: string;
    OLLAMA_MODEL: string;

    GEMINI_API_KEY: string;
    GEMINI_MODEL: string;
    LLM_PROVIDER: string;

    CWA_API_KEY: string;

    MONGODB_URI: string;
    MONGODB_DB_NAME: string;
    MONGODB_COLLECTION_REMINDER: string;

    TIMEZONE?: string;
  }
}

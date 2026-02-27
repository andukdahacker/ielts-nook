type Env = {
  PORT: number;
  NODE_ENV: "development" | "production";
  DATABASE_URL: string;
  JWT_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_API_KEY?: string;
  RESEND_API_KEY: string;
  PLATFORM_ADMIN_API_KEY: string;
  EMAIL_FROM?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_WEBHOOK_SECRET?: string;
  POLAR_PRODUCT_ID_STARTER?: string;
  POLAR_PRODUCT_ID_GROWTH?: string;
  POLAR_PRODUCT_ID_ENTERPRISE?: string;
  POLAR_MODE?: string;
  FRONTEND_URL?: string;
};

export default Env;

import dotenv from 'dotenv';

dotenv.config();

export interface Environment {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  storageBucket: string;
  fileUploadLimitMb: number;
}

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value ?? fallback ?? '';
};

export const env: Environment = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', '4000')),
  mongoUri: getEnv('MONGO_URI', 'mongodb://localhost:27017/alt-hosting'),
  jwtSecret: getEnv('JWT_SECRET', 'change-me'),
  storageBucket: getEnv('STORAGE_BUCKET', 'local-storage'),
  fileUploadLimitMb: Number(getEnv('FILE_UPLOAD_LIMIT_MB', '500'))
};

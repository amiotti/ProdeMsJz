import { init, tx } from '@instantdb/admin';

let cachedDb: ReturnType<typeof init> | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${name}`);
  }
  return value;
}

export function getInstantAdminDb() {
  if (cachedDb) return cachedDb;

  cachedDb = init({
    appId: getEnv('NEXT_PUBLIC_INSTANT_APP_ID'),
    adminToken: getEnv('INSTANTDB_ADMIN_TOKEN'),
  });

  return cachedDb;
}

export { tx };


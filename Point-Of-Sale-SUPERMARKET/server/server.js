import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const [{ default: app }, database] = await Promise.all([
  import('./src/app.js'),
  import('./src/config/db.js')
]);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters.');
}

await database.testConnection();
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
  console.info(JSON.stringify({ event: 'api_listening', port }));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await database.closePool();
      process.exitCode = 0;
    });
  });
}

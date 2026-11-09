// Satu proses: Next.js (UI) + Socket.IO (realtime room) di port yang sama.
import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare(); // juga memuat .env ke process.env

const { registerGame } = await import('./lib/game.js');
const { dmStatus } = await import('./lib/dm.js');

const httpServer = createServer((req, res) => handle(req, res));
const io = new Server(httpServer, { pingInterval: 20000, pingTimeout: 25000 });
registerGame(io);

httpServer.listen(port, hostname, () => {
  const s = dmStatus();
  console.log(`\n  ⚔  Lorekeeper siap di http://localhost:${port}`);
  console.log(`  🎲 Dungeon Master: ${s.mock ? 'MODE DEMO (isi NVIDIA_API_KEY untuk Nemotron)' : s.model}\n`);
});

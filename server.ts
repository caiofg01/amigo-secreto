import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'groups.json');

app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache + persistent disk backup
let groupsMemory: Record<string, any> = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    groupsMemory = JSON.parse(raw);
  }
} catch (err) {
  console.error('Failed to load groups.json:', err);
}

function persistGroups() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groupsMemory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist groups.json:', err);
  }
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Create or update group
app.post('/api/groups', (req: Request, res: Response) => {
  const group = req.body;
  if (!group || !group.id || !group.title) {
    res.status(400).json({ error: 'Grupo inválido. ID e Título são obrigatórios.' });
    return;
  }

  group.updatedAt = new Date().toISOString();
  groupsMemory[group.id] = group;
  persistGroups();

  res.status(200).json(group);
});

// Get group by ID
app.get('/api/groups/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const group = groupsMemory[id];

  if (!group) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  res.json(group);
});

// Mark participant as revealed
app.post('/api/groups/:id/reveal', (req: Request, res: Response) => {
  const { id } = req.params;
  const { participantId } = req.body;

  const group = groupsMemory[id];
  if (!group) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  const participant = group.participants?.find((p: any) => p.id === participantId);
  if (participant) {
    participant.isRevealed = true;
    participant.revealedAt = new Date().toISOString();
    group.updatedAt = new Date().toISOString();
    persistGroups();
  }

  res.json({ success: true, isRevealed: true });
});

// Participant requests inclusion ("Meu nome não está aqui")
app.post('/api/groups/:id/request-inclusion', (req: Request, res: Response) => {
  const { id } = req.params;
  const requestItem = req.body;

  const group = groupsMemory[id];
  if (!group) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  if (!group.pendingRequests) {
    group.pendingRequests = [];
  }

  group.pendingRequests.push(requestItem);
  group.updatedAt = new Date().toISOString();
  persistGroups();

  res.json(requestItem);
});

// Admin resolves/dismisses request
app.post('/api/groups/:id/resolve-request', (req: Request, res: Response) => {
  const { id } = req.params;
  const { requestId, status } = req.body;

  const group = groupsMemory[id];
  if (!group) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  if (group.pendingRequests) {
    const item = group.pendingRequests.find((r: any) => r.id === requestId);
    if (item) {
      item.status = status || 'resolved';
      group.updatedAt = new Date().toISOString();
      persistGroups();
    }
  }

  res.json({ success: true });
});

// Update participant wishlist
app.post('/api/groups/:id/wishlist', (req: Request, res: Response) => {
  const { id } = req.params;
  const { participantId, wishlist } = req.body;

  const group = groupsMemory[id];
  if (!group) {
    res.status(404).json({ error: 'Grupo não encontrado.' });
    return;
  }

  const participant = group.participants?.find((p: any) => p.id === participantId);
  if (participant) {
    participant.wishlist = wishlist;
    group.updatedAt = new Date().toISOString();
    persistGroups();
  }

  res.json({ success: true });
});

// Mount Vite or serve static
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

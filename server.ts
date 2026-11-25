import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import {createServer as createViteServer} from 'vite';
import {
  SEED_DESTINATIONS,
  SEED_FOODS,
  SEED_PACKAGES,
  SEED_STAYS,
} from './src/data/seedData.js';

dotenv.config();

type UserRole = 'user' | 'operator' | 'admin';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  passwordHash: string;
  createdAt: string;
}

interface StoredTrip {
  id: string;
  userId: string;
  name: string;
  date: string;
  days: number;
  travellers: number;
  budgetPerPerson: number;
  activities: Array<{id: string; destinationId: string; day: number}>;
  total: number;
  savedAt: string;
}

interface AppDatabase {
  users: StoredUser[];
  trips: StoredTrip[];
  content: {
    destinations: typeof SEED_DESTINATIONS;
    culinary: typeof SEED_FOODS;
    stays: typeof SEED_STAYS;
    packages: typeof SEED_PACKAGES;
  };
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.resolve(DATA_DIR, 'app-store.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const VALID_ROLES = new Set<UserRole>(['user', 'operator', 'admin']);
const VALID_CONTENT_TYPES = new Set(['destinations', 'culinary', 'stays', 'packages']);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createInitialDb(): AppDatabase {
  return {
    users: [],
    trips: [],
    content: {
      destinations: clone(SEED_DESTINATIONS),
      culinary: clone(SEED_FOODS),
      stays: clone(SEED_STAYS),
      packages: clone(SEED_PACKAGES),
    },
  };
}

function loadDb(): AppDatabase {
  fs.mkdirSync(DATA_DIR, {recursive: true});
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
      content: {
        destinations: Array.isArray(parsed.content?.destinations)
          ? parsed.content.destinations
          : clone(SEED_DESTINATIONS),
        culinary: Array.isArray(parsed.content?.culinary)
          ? parsed.content.culinary
          : clone(SEED_FOODS),
        stays: Array.isArray(parsed.content?.stays)
          ? parsed.content.stays
          : clone(SEED_STAYS),
        packages: Array.isArray(parsed.content?.packages)
          ? parsed.content.packages
          : clone(SEED_PACKAGES),
      },
    };
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function saveDb(db: AppDatabase): void {
  fs.mkdirSync(DATA_DIR, {recursive: true});
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function timingSafeStringMatch(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a).digest();
  const bHash = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

function signToken(user: {id: string; role: UserRole; email: string; name: string}): string {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyToken(
  token: string
): {sub: string; role: UserRole; email: string; name: string; exp: number} | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  if (!timingSafeStringMatch(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.sub !== 'string' || Number(parsed.exp) < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readPasscodeEnv(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (
    upper === name ||
    upper === `MY_${name}` ||
    upper === `YOUR_${name}` ||
    upper === 'UNDEFINED' ||
    upper === 'NULL' ||
    upper.startsWith('REPLACE_') ||
    raw.startsWith('<')
  ) {
    return null;
  }
  return raw;
}

interface AuthedRequest extends express.Request {
  authUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

function extractBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireAuth(
  req: AuthedRequest,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({error: 'Autentikasi diperlukan.'});
    return;
  }
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({error: 'Sesi tidak valid atau telah berakhir.'});
    return;
  }

  // Env-backed virtual admin/operator accounts remain valid if passcode is configured
  if (claims.sub === 'env_admin' && readPasscodeEnv('ADMIN_PASSCODE')) {
    req.authUser = {
      id: 'env_admin',
      name: 'Administrator',
      email: 'admin@ngeexplore.aceh',
      role: 'admin',
    };
    next();
    return;
  }
  if (claims.sub === 'env_operator' && readPasscodeEnv('OPERATOR_PASSCODE')) {
    req.authUser = {
      id: 'env_operator',
      name: 'Operator Konten',
      email: 'operator@ngeexplore.aceh',
      role: 'operator',
    };
    next();
    return;
  }

  const db = loadDb();
  const user = db.users.find((u) => u.id === claims.sub);
  if (!user || !user.active) {
    res.status(401).json({error: 'Akun tidak aktif atau tidak ditemukan.'});
    return;
  }

  req.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
}

function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthedRequest, res: express.Response, next: express.NextFunction): void => {
    requireAuth(req, res, () => {
      if (!req.authUser || !allowedRoles.includes(req.authUser.role)) {
        res.status(403).json({error: 'Anda tidak memiliki izin untuk aksi ini.'});
        return;
      }
      next();
    });
  };
}

function sanitizeImageUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('/src/assets/') ||
    raw.startsWith('https://') ||
    raw.startsWith('http://')
  ) {
    return raw;
  }
  return '';
}

const REGION_DEFAULT_COORDS: Record<string, {lat: number; lng: number}> = {
  'Banda Aceh': {lat: 5.554, lng: 95.32},
  Sabang: {lat: 5.886, lng: 95.28},
  'Aceh Besar': {lat: 5.38, lng: 95.35},
  'Aceh Tengah': {lat: 4.62, lng: 96.86},
  'Bener Meriah': {lat: 4.69, lng: 96.86},
};

function sanitizeCoord(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return Number(num.toFixed(6));
}

function validateAndSanitizeContentItem(type: string, body: Record<string, unknown>, existingId?: string) {
  const name = String(body.name ?? '').trim();
  if (!name || name.length > 140) {
    return {error: 'Nama wajib diisi (maksimal 140 karakter).'};
  }
  const id = existingId || `${type.slice(0, 2)}_${Date.now()}`;
  const image = sanitizeImageUrl(body.image);

  if (type === 'destinations') {
    const region = String(body.region ?? 'Banda Aceh').trim() || 'Banda Aceh';
    const fallbackCoord = REGION_DEFAULT_COORDS[region] || REGION_DEFAULT_COORDS['Banda Aceh'];
    const parsedLat = sanitizeCoord(body.lat, -90, 90);
    const parsedLng = sanitizeCoord(body.lng, -180, 180);
    const lat = parsedLat !== null && parsedLng !== null ? parsedLat : fallbackCoord.lat;
    const lng = parsedLat !== null && parsedLng !== null ? parsedLng : fallbackCoord.lng;
    const mapsRaw = String(body.maps ?? 'https://www.google.com/maps').trim();
    const safeMaps =
      mapsRaw.startsWith('https://') || mapsRaw.startsWith('http://')
        ? mapsRaw
        : 'https://www.google.com/maps';
    return {
      item: {
        id,
        name,
        category: String(body.category ?? 'Alam').trim() || 'Alam',
        region,
        description: String(body.description ?? '').trim(),
        descriptionEn: String(body.descriptionEn ?? body.description ?? '').trim(),
        cost: Math.max(0, Number(body.cost) || 0),
        address: String(body.address ?? '').trim(),
        maps: safeMaps,
        lat,
        lng,
        facilities: Array.isArray(body.facilities)
          ? body.facilities.map((x) => String(x).trim()).filter(Boolean)
          : ['Perlu konfirmasi'],
        prayer: Array.isArray(body.prayer)
          ? body.prayer.map((x) => String(x).trim()).filter(Boolean)
          : ['Perlu konfirmasi'],
        highlight: String(body.highlight ?? '').trim() || String(body.category ?? 'Destinasi'),
        motif: String(body.motif ?? 'highland').trim(),
        image,
      },
    };
  }

  if (type === 'culinary') {
    const statusRaw = String(body.status ?? 'unverified');
    const status = ['verified', 'unverified', 'self'].includes(statusRaw)
      ? statusRaw
      : 'unverified';
    return {
      item: {
        id,
        name,
        category: String(body.category ?? 'Kuliner khas').trim() || 'Kuliner khas',
        region: String(body.region ?? 'Banda Aceh').trim() || 'Banda Aceh',
        price: Math.max(0, Number(body.price) || 0),
        status,
        source: String(body.source ?? '').trim() || 'Informasi penyedia lokal',
        contact: String(body.contact ?? '+628111000000').trim(),
        motif: String(body.motif ?? 'culinary').trim(),
        image,
      },
    };
  }

  if (type === 'stays') {
    return {
      item: {
        id,
        name,
        region: String(body.region ?? 'Banda Aceh').trim() || 'Banda Aceh',
        price: Math.max(0, Number(body.price) || 0),
        facilities: Array.isArray(body.facilities)
          ? body.facilities.map((x) => String(x).trim()).filter(Boolean)
          : ['Perlu konfirmasi'],
        muslim: Array.isArray(body.muslim)
          ? body.muslim.map((x) => String(x).trim()).filter(Boolean)
          : ['Perlu konfirmasi fasilitas ibadah'],
        contact: String(body.contact ?? '+628111200000').trim(),
        motif: String(body.motif ?? 'stay').trim(),
        image,
      },
    };
  }

  const duration = Math.min(5, Math.max(1, Number(body.duration) || 2));
  return {
    item: {
      id,
      name,
      duration,
      interests: Array.isArray(body.interests)
        ? body.interests.map((x) => String(x).trim()).filter(Boolean)
        : ['Alam'],
      places: Array.isArray(body.places)
        ? body.places.map((x) => String(x).trim()).filter(Boolean)
        : [],
      cost: Math.max(0, Number(body.cost) || 0),
      description: String(body.description ?? '').trim(),
      image,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  // Bootstrap / Role setup status
  app.get('/api/auth/bootstrap-status', (_req, res) => {
    const db = loadDb();
    const adminEnvConfigured = Boolean(readPasscodeEnv('ADMIN_PASSCODE'));
    const operatorEnvConfigured = Boolean(readPasscodeEnv('OPERATOR_PASSCODE'));
    const adminClaimed = db.users.some((u) => u.role === 'admin' && u.active);
    const operatorClaimed = db.users.some((u) => u.role === 'operator' && u.active);

    res.json({
      adminClaimed,
      operatorClaimed,
      adminEnvConfigured,
      operatorEnvConfigured,
    });
  });

  // First-run setup for Admin or Operator when no env passcode and no claimed account exists yet
  app.post('/api/auth/claim-role', (req, res) => {
    const role = String(req.body?.role ?? '').trim() as UserRole;
    const name = String(req.body?.name ?? '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (role !== 'admin' && role !== 'operator') {
      res.status(400).json({error: 'Role setup hanya tersedia untuk operator atau admin.'});
      return;
    }
    if (!name || name.length < 2) {
      res.status(400).json({error: 'Nama lengkap minimal 2 karakter.'});
      return;
    }
    if (!isValidEmailFormat(email)) {
      res.status(400).json({error: 'Format email tidak valid.'});
      return;
    }
    if (password.length < 8) {
      res.status(400).json({error: 'Password minimal 8 karakter.'});
      return;
    }

    const db = loadDb();
    if (db.users.some((u) => u.role === role && u.active)) {
      res.status(409).json({error: `Akun ${role} sudah diinisialisasi.`});
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({error: 'Email sudah terdaftar.'});
      return;
    }

    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name,
      email,
      role,
      active: true,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);

    const token = signToken(newUser);
    res.status(201).json({token, user: sanitizeUser(newUser)});
  });

  // Public registration (always creates standard 'user' role)
  app.post('/api/auth/register', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!name || name.length < 2) {
      res.status(400).json({error: 'Nama lengkap minimal 2 karakter.'});
      return;
    }
    if (!isValidEmailFormat(email)) {
      res.status(400).json({error: 'Format email tidak valid.'});
      return;
    }
    if (password.length < 8) {
      res.status(400).json({error: 'Password minimal 8 karakter.'});
      return;
    }

    const db = loadDb();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({error: 'Email sudah terdaftar. Silakan masuk.'});
      return;
    }

    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name,
      email,
      role: 'user',
      active: true,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDb(db);

    const token = signToken(newUser);
    res.status(201).json({token, user: sanitizeUser(newUser)});
  });

  // Login for User, Operator, or Admin
  app.post('/api/auth/login', (req, res) => {
    const identifier = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!identifier || !password) {
      res.status(400).json({error: 'Email dan password wajib diisi.'});
      return;
    }

    const adminEnv = readPasscodeEnv('ADMIN_PASSCODE');
    if (
      adminEnv &&
      (identifier === 'admin@ngeexplore.aceh' || identifier === 'admin') &&
      timingSafeStringMatch(password, adminEnv)
    ) {
      const envAdmin = {
        id: 'env_admin',
        name: 'Administrator',
        email: 'admin@ngeexplore.aceh',
        role: 'admin' as UserRole,
        active: true,
        createdAt: new Date().toISOString(),
      };
      res.json({token: signToken(envAdmin), user: envAdmin});
      return;
    }

    const operatorEnv = readPasscodeEnv('OPERATOR_PASSCODE');
    if (
      operatorEnv &&
      (identifier === 'operator@ngeexplore.aceh' || identifier === 'operator') &&
      timingSafeStringMatch(password, operatorEnv)
    ) {
      const envOp = {
        id: 'env_operator',
        name: 'Operator Konten',
        email: 'operator@ngeexplore.aceh',
        role: 'operator' as UserRole,
        active: true,
        createdAt: new Date().toISOString(),
      };
      res.json({token: signToken(envOp), user: envOp});
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email === identifier);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({error: 'Email atau password salah.'});
      return;
    }
    if (!user.active) {
      res.status(403).json({error: 'Akun dinonaktifkan oleh administrator.'});
      return;
    }

    const token = signToken(user);
    res.json({token, user: sanitizeUser(user)});
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({user: req.authUser});
  });

  // Public content read
  app.get('/api/content', (_req, res) => {
    const db = loadDb();
    res.json(db.content);
  });

  // Operator & Admin: Create or Update content
  app.post('/api/content/:type', requireRole('operator', 'admin'), (req: AuthedRequest, res) => {
    const type = req.params.type;
    if (!VALID_CONTENT_TYPES.has(type)) {
      res.status(400).json({error: 'Tipe konten tidak valid.'});
      return;
    }
    if (type === 'packages' && req.authUser?.role !== 'admin') {
      res.status(403).json({error: 'Hanya Admin yang dapat membuat paket wisata.'});
      return;
    }

    const parsed = validateAndSanitizeContentItem(type, req.body || {});
    if ('error' in parsed) {
      res.status(400).json({error: parsed.error});
      return;
    }

    const db = loadDb();
    const arr = db.content[type as keyof AppDatabase['content']] as Array<Record<string, unknown>>;
    arr.push(parsed.item);
    saveDb(db);
    res.status(201).json({item: parsed.item, content: db.content});
  });

  app.put('/api/content/:type/:id', requireRole('operator', 'admin'), (req: AuthedRequest, res) => {
    const {type, id} = req.params;
    if (!VALID_CONTENT_TYPES.has(type)) {
      res.status(400).json({error: 'Tipe konten tidak valid.'});
      return;
    }
    if (type === 'packages' && req.authUser?.role !== 'admin') {
      res.status(403).json({error: 'Hanya Admin yang dapat mengubah paket wisata.'});
      return;
    }

    const db = loadDb();
    const arr = db.content[type as keyof AppDatabase['content']] as Array<Record<string, unknown>>;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) {
      res.status(404).json({error: 'Data tidak ditemukan.'});
      return;
    }

    const parsed = validateAndSanitizeContentItem(type, req.body || {}, id);
    if ('error' in parsed) {
      res.status(400).json({error: parsed.error});
      return;
    }

    arr[idx] = {...arr[idx], ...parsed.item};
    saveDb(db);
    res.json({item: arr[idx], content: db.content});
  });

  // Admin only: Delete content & Restore defaults
  app.delete('/api/content/:type/:id', requireRole('admin'), (req, res) => {
    const {type, id} = req.params;
    if (!VALID_CONTENT_TYPES.has(type)) {
      res.status(400).json({error: 'Tipe konten tidak valid.'});
      return;
    }

    const db = loadDb();
    const arr = db.content[type as keyof AppDatabase['content']] as Array<Record<string, unknown>>;
    const next = arr.filter((x) => x.id !== id);
    if (next.length === arr.length) {
      res.status(404).json({error: 'Data tidak ditemukan.'});
      return;
    }
    (db.content[type as keyof AppDatabase['content']] as Array<Record<string, unknown>>) = next;
    saveDb(db);
    res.json({content: db.content});
  });

  app.post('/api/content/restore', requireRole('admin'), (_req, res) => {
    const db = loadDb();
    db.content = {
      destinations: clone(SEED_DESTINATIONS),
      culinary: clone(SEED_FOODS),
      stays: clone(SEED_STAYS),
      packages: clone(SEED_PACKAGES),
    };
    saveDb(db);
    res.json({content: db.content});
  });

  // Authenticated user trips (scoped by userId)
  app.get('/api/user/trips', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDb();
    const trips = db.trips.filter((trip) => trip.userId === req.authUser?.id);
    res.json({trips});
  });

  app.post('/api/user/trips', requireAuth, (req: AuthedRequest, res) => {
    const userId = req.authUser!.id;
    const body = req.body || {};
    const days = Math.min(5, Math.max(1, Number(body.days) || 3));
    const travellers = Math.min(30, Math.max(1, Number(body.travellers) || 1));
    const budgetPerPerson = Math.max(0, Number(body.budgetPerPerson) || 0);
    const activities: Array<{id: string; destinationId: string; day: number}> = Array.isArray(
      body.activities
    )
      ? body.activities.map((a: Record<string, unknown>) => ({
          id: String(a.id ?? `act_${Date.now()}`),
          destinationId: String(a.destinationId ?? ''),
          day: Math.min(days, Math.max(1, Number(a.day) || 1)),
        }))
      : [];

    const db = loadDb();
    const total = activities.reduce((sum: number, act) => {
      const dest = db.content.destinations.find((d) => d.id === act.destinationId);
      return sum + (dest ? Number(dest.cost) || 0 : 0) * travellers;
    }, 0);

    const trip: StoredTrip = {
      id: `trip_${Date.now()}`,
      userId,
      name: String(body.name ?? 'Jelajah Aceh').trim() || 'Jelajah Aceh',
      date: String(body.date ?? '').trim(),
      days,
      travellers,
      budgetPerPerson,
      activities,
      total,
      savedAt: new Date().toISOString(),
    };

    db.trips.unshift(trip);
    saveDb(db);
    res.status(201).json({trip});
  });

  app.delete('/api/user/trips/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.trips.find((t) => t.id === req.params.id);
    if (!target) {
      res.status(404).json({error: 'Itinerary tidak ditemukan.'});
      return;
    }
    if (target.userId !== req.authUser!.id) {
      res.status(403).json({error: 'Anda tidak berhak menghapus itinerary pengguna lain.'});
      return;
    }
    db.trips = db.trips.filter((t) => t.id !== req.params.id);
    saveDb(db);
    res.json({ok: true});
  });

  // Admin User & Role management
  app.get('/api/admin/users', requireRole('admin'), (_req, res) => {
    const db = loadDb();
    res.json({users: db.users.map(sanitizeUser)});
  });

  app.patch('/api/admin/users/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const targetId = req.params.id;
    const db = loadDb();
    const user = db.users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({error: 'Pengguna tidak ditemukan.'});
      return;
    }

    if (req.body?.role !== undefined) {
      const nextRole = String(req.body.role) as UserRole;
      if (!VALID_ROLES.has(nextRole)) {
        res.status(400).json({error: 'Role tidak valid.'});
        return;
      }
      if (user.id === req.authUser?.id && nextRole !== 'admin') {
        res.status(400).json({error: 'Admin tidak dapat menurunkan role akun sendiri.'});
        return;
      }
      user.role = nextRole;
    }

    if (req.body?.active !== undefined) {
      const nextActive = Boolean(req.body.active);
      if (user.id === req.authUser?.id && !nextActive) {
        res.status(400).json({error: 'Admin tidak dapat menonaktifkan akun sendiri.'});
        return;
      }
      user.active = nextActive;
    }

    saveDb(db);
    res.json({user: sanitizeUser(user)});
  });

  // Mount Vite middleware in dev or serve dist in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nge.Explore Aceh server running on http://localhost:${PORT}`);
  });
}

startServer();

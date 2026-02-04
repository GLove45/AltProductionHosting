import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.CONTROL_PANEL_PORT || 8080);
const RP_ID = process.env.CONTROL_PANEL_RP_ID || 'localhost';
const RP_NAME = process.env.CONTROL_PANEL_RP_NAME || 'AltProductionHosting Control Panel';
const ORIGIN = process.env.CONTROL_PANEL_ORIGIN || `http://localhost:${PORT}`;
const APPLY_CHANGES = process.env.CONTROL_PANEL_APPLY === 'true';

const dataDir = path.join(__dirname, 'data');
const credentialsPath = path.join(dataDir, 'credentials.json');
const packagesPath = path.join(__dirname, 'packages.txt');

const ensureDataDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readCredentials = () => {
  ensureDataDir();
  if (!fs.existsSync(credentialsPath)) {
    return { users: [] };
  }
  return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
};

const writeCredentials = (payload) => {
  ensureDataDir();
  fs.writeFileSync(credentialsPath, JSON.stringify(payload, null, 2));
};

const parsePackages = () => {
  const raw = fs.readFileSync(packagesPath, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, version] = line.split(/\s+/);
      return { name, version };
    });
};

const packages = parsePackages();

app.use(express.json());
app.use(
  session({
    secret: process.env.CONTROL_PANEL_SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  }),
);

app.use(express.static(path.join(__dirname, 'public')));

const requireAuth = (req, res, next) => {
  if (req.session?.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: 'Authentication required' });
};

app.get('/api/packages', requireAuth, (req, res) => {
  res.json({ packages });
});

app.get('/api/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session?.authenticated), user: req.session?.user || null });
});

app.post('/api/register/options', (req, res) => {
  const { username, displayName } = req.body;
  if (!username || !displayName) {
    res.status(400).json({ error: 'Username and displayName are required.' });
    return;
  }

  const credentials = readCredentials();
  let user = credentials.users.find((entry) => entry.username === username);
  if (!user) {
    user = {
      id: uuidv4(),
      username,
      displayName,
      devices: [],
    };
    credentials.users.push(user);
    writeCredentials(credentials);
  }

  const options = generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: user.username,
    userDisplayName: user.displayName,
    attestationType: 'direct',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: user.devices.map((device) => ({
      id: Buffer.from(device.credentialID, 'base64'),
      type: 'public-key',
      transports: device.transports,
    })),
  });

  req.session.currentChallenge = options.challenge;
  req.session.pendingUser = user.username;

  res.json(options);
});

app.post('/api/register/verify', async (req, res) => {
  const { body } = req;
  const expectedChallenge = req.session?.currentChallenge;
  const username = req.session?.pendingUser;

  if (!expectedChallenge || !username) {
    res.status(400).json({ error: 'Registration session expired.' });
    return;
  }

  const credentials = readCredentials();
  const user = credentials.users.find((entry) => entry.username === username);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: 'Registration failed.' });
    return;
  }

  const { credential } = verification.registrationInfo;

  user.devices.push({
    credentialID: Buffer.from(credential.id).toString('base64'),
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: body.response.transports || [],
  });

  writeCredentials(credentials);

  req.session.authenticated = true;
  req.session.user = { username: user.username, displayName: user.displayName };

  res.json({ verified: true });
});

app.post('/api/login/options', (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required.' });
    return;
  }

  const credentials = readCredentials();
  const user = credentials.users.find((entry) => entry.username === username);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const options = generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: user.devices.map((device) => ({
      id: Buffer.from(device.credentialID, 'base64'),
      type: 'public-key',
      transports: device.transports,
    })),
  });

  req.session.currentChallenge = options.challenge;
  req.session.pendingUser = user.username;

  res.json(options);
});

app.post('/api/login/verify', async (req, res) => {
  const { body } = req;
  const expectedChallenge = req.session?.currentChallenge;
  const username = req.session?.pendingUser;

  if (!expectedChallenge || !username) {
    res.status(400).json({ error: 'Login session expired.' });
    return;
  }

  const credentials = readCredentials();
  const user = credentials.users.find((entry) => entry.username === username);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const authenticator = user.devices.map((device) => ({
    credentialID: Buffer.from(device.credentialID, 'base64'),
    credentialPublicKey: Buffer.from(device.publicKey, 'base64'),
    counter: device.counter,
    transports: device.transports,
  }));

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator,
  });

  if (!verification.verified) {
    res.status(401).json({ error: 'Authentication failed.' });
    return;
  }

  const usedDevice = user.devices.find(
    (device) => Buffer.from(device.credentialID, 'base64').equals(verification.authenticationInfo.credentialID),
  );

  if (usedDevice) {
    usedDevice.counter = verification.authenticationInfo.newCounter;
  }

  writeCredentials(credentials);

  req.session.authenticated = true;
  req.session.user = { username: user.username, displayName: user.displayName };

  res.json({ verified: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post('/api/packages/:name/action', requireAuth, async (req, res) => {
  const { name } = req.params;
  const { action } = req.body;
  const target = packages.find((pkg) => pkg.name === name);

  if (!target) {
    res.status(404).json({ error: 'Package not found.' });
    return;
  }

  const supportedActions = new Set(['install', 'remove', 'update', 'restart']);
  if (!supportedActions.has(action)) {
    res.status(400).json({ error: 'Unsupported action.' });
    return;
  }

  const command = action === 'restart'
    ? ['systemctl', 'restart', name]
    : ['apt-get', '-y', action === 'remove' ? 'remove' : 'install', name];

  if (!APPLY_CHANGES) {
    res.json({
      ok: true,
      dryRun: true,
      command: command.join(' '),
      message: 'Set CONTROL_PANEL_APPLY=true to execute system changes.',
    });
    return;
  }

  const { execFile } = await import('child_process');

  execFile(command[0], command.slice(1), { timeout: 1000 * 60 * 5 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ ok: false, error: error.message, stderr, stdout });
      return;
    }
    res.json({ ok: true, stdout, stderr });
  });
});

app.listen(PORT, () => {
  console.log(`Control Panel listening on ${ORIGIN}`);
});

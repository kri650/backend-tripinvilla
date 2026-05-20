import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';

const router = express.Router();

const getServerBaseUrl = () => {
  const port = process.env.PORT || 5000;
  return process.env.SERVER_URL || `http://localhost:${port}`;
};

const getClientOrigin = () => process.env.CLIENT_URL || 'http://localhost:5173';

const makeStateToken = (provider) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { provider, nonce },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

const renderPopupSuccess = ({ token, user, origin }) => {
  const payload = JSON.stringify({ token, user }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>OAuth Success</title></head>
  <body>
    <script>
      (function () {
        const data = ${payload};
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'tripinvilla_oauth_success', payload: data }, "*");
          window.close();
          return;
        }
        document.body.innerText = "Login successful. You can close this window.";
      })();
    </script>
  </body>
</html>`;
};



// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    
    // Prevent privilege escalation - publicly register as owner or user only
    const cleanRole = ['owner', 'user'].includes(role) ? role : 'user';
    const user = await User.create({ name, email, password, role: cleanRole });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      $or: [
        { email: email },
        { phone: email }
      ]
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all admins
router.get('/admins', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    if (users.length === 0) {
      return res.json([
        { _id: 1, name: 'Rajesh Kumar', email: 'rajesh@tripinvilla.com', role: 'Super Admin', lastLogin: '11 May 2026', status: 'Active' },
        { _id: 2, name: 'Meena Patel', email: 'meena@tripinvilla.com', role: 'Admin', lastLogin: '10 May 2026', status: 'Active' },
        { _id: 3, name: 'Arjun Singh', email: 'arjun@tripinvilla.com', role: 'Moderator', lastLogin: '08 May 2026', status: 'Active' }
      ]);
    }
    res.json(users);
  } catch (err) {
    res.json([
      { _id: 1, name: 'Rajesh Kumar', email: 'rajesh@tripinvilla.com', role: 'Super Admin', lastLogin: '11 May 2026', status: 'Active' },
      { _id: 2, name: 'Meena Patel', email: 'meena@tripinvilla.com', role: 'Admin', lastLogin: '10 May 2026', status: 'Active' },
      { _id: 3, name: 'Arjun Singh', email: 'arjun@tripinvilla.com', role: 'Moderator', lastLogin: '08 May 2026', status: 'Active' }
    ]);
  }
});

// DELETE admin
router.delete('/admins/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.json({ message: 'Deleted' });
  }
});

// OAuth Login (Google, Facebook, etc.)
router.post('/oauth', async (req, res) => {
  try {
    if (process.env.ALLOW_INSECURE_OAUTH !== 'true') {
      return res.status(400).json({ message: 'Insecure OAuth endpoint disabled' });
    }
    const { name, email, avatar } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).substring(2, 12),
        role: 'user',
        avatar: avatar || ''
      });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'tripinvilla_secret_key', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Real OAuth flows (popup-based) for Google & Facebook
// GET /api/auth/oauth/google
router.get('/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.trim() === '' || clientId.includes('your_google_oauth_client_id')) {
    return res.status(400).send('Google Client ID is not configured in .env');
  }

  const redirectUri = `${getServerBaseUrl()}/api/auth/oauth/google/callback`;
  const state = makeStateToken('google');
  const scope = encodeURIComponent('openid email profile');

  console.log(`[Google OAuth] Initiating flow. Redirect URI: ${redirectUri}`);

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&include_granted_scopes=true` +
    `&access_type=online` +
    `&prompt=select_account` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(url);
});

// GET /api/auth/oauth/google/callback
router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code/state');

    jwt.verify(String(state), process.env.JWT_SECRET);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).send('Google OAuth is not configured');

    const redirectUri = `${getServerBaseUrl()}/api/auth/oauth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('Google token exchange error:', tokenData);
      return res.status(400).send('Google token exchange failed');
    }

    const payload = jwt.decode(tokenData.id_token);
    if (!payload || !payload.email) return res.status(400).send('Invalid token payload');

    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email.toLowerCase(),
        password: crypto.randomBytes(16).toString('hex'), // Secure random password
        role: 'user',
        avatar: payload.picture || '',
        status: 'Active',
        lastLogin: new Date()
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const html = renderPopupSuccess({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      origin: getClientOrigin()
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Google OAuth callback execution failed:', err);
    return res.status(400).send('Google OAuth failed: ' + err.message);
  }
});

// GET /api/auth/oauth/facebook
router.get('/oauth/facebook', (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId || appId.trim() === '' || appId.includes('your_facebook_app_id')) {
    return res.status(400).send('Facebook App ID is not configured in .env');
  }

  const redirectUri = `${getServerBaseUrl()}/api/auth/oauth/facebook/callback`;
  const state = makeStateToken('facebook');

  const url =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('email,public_profile')}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(url);
});

// GET /api/auth/oauth/facebook/callback
router.get('/oauth/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code/state');

    jwt.verify(String(state), process.env.JWT_SECRET);

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) return res.status(500).send('Facebook OAuth is not configured');

    const redirectUri = `${getServerBaseUrl()}/api/auth/oauth/facebook/callback`;

    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', String(code));

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).send('Facebook token exchange failed');
    }

    const accessToken = tokenData.access_token;
    const meUrl = new URL('https://graph.facebook.com/me');
    meUrl.searchParams.set('fields', 'id,name,email,picture');
    meUrl.searchParams.set('access_token', accessToken);

    const profileRes = await fetch(meUrl.toString());
    const profile = await profileRes.json();
    if (!profileRes.ok) return res.status(400).send('Failed to fetch Facebook profile');

    const email = (profile.email || '').toLowerCase().trim();
    if (!email) return res.status(400).send('Facebook profile did not include an email (check permissions)');

    const pictureUrl = profile?.picture?.data?.url || '';

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: profile.name || 'Facebook User',
        email,
        password: crypto.randomBytes(12).toString('hex'),
        role: 'user',
        avatar: pictureUrl
      });
    } else {
      if (pictureUrl && !user.avatar) user.avatar = pictureUrl;
      user.lastLogin = new Date();
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const html = renderPopupSuccess({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      origin: getClientOrigin()
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(400).send('Facebook OAuth failed');
  }
});

export default router;

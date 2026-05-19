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

const renderSimulatedOAuth = ({ provider, origin }) => {
  const isGoogle = provider === 'google';
  const themeColor = isGoogle ? '#4285F4' : '#1877F2';
  const providerName = isGoogle ? 'Google' : 'Facebook';
  const logoSvg = isGoogle 
    ? `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.97 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.92 3.04C6.27 7.74 8.92 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.48c-.29 1.56-1.17 2.87-2.5 3.75v3.1h4.03c2.37-2.18 3.73-5.39 3.73-9.01z"/><path fill="#FBBC05" d="M5.32 14.6c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.4 7.16C.51 8.94 0 10.91 0 13s.51 4.06 1.4 5.84l3.92-3.24z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-4.03-3.1c-1.12.75-2.54 1.2-3.93 1.2-3.08 0-5.73-2.7-6.68-5.56L1.4 15.84C3.37 19.75 7.35 23 12 23z"/></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Simulated ${providerName} Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f0f2f5;
        font-family: 'Outfit', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        width: 100%;
        max-width: 400px;
        padding: 32px;
        box-sizing: border-box;
        text-align: center;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }
      .logo {
        margin-bottom: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #f8fafc;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      }
      h1 {
        font-size: 22px;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 8px 0;
      }
      p {
        font-size: 14px;
        color: #64748b;
        margin: 0 0 24px 0;
        line-height: 1.5;
      }
      .badge {
        display: inline-block;
        background: #f1f5f9;
        color: #475569;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 20px;
        margin-bottom: 24px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .preseed-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 24px;
      }
      .account-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 16px;
        text-align: left;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s ease;
      }
      .account-btn:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        transform: translateY(-1px);
      }
      .avatar-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${themeColor};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
      }
      .account-info {
        display: flex;
        flex-direction: column;
      }
      .account-name {
        font-size: 14px;
        font-weight: 600;
        color: #334155;
      }
      .account-email {
        font-size: 12px;
        color: #64748b;
      }
      .divider {
        display: flex;
        align-items: center;
        color: #cbd5e1;
        font-size: 12px;
        margin: 20px 0;
      }
      .divider::before, .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e2e8f0;
      }
      .divider span {
        padding: 0 10px;
      }
      .form-group {
        text-align: left;
        margin-bottom: 16px;
      }
      label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 6px;
      }
      input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      input:focus {
        outline: none;
        border-color: ${themeColor};
        box-shadow: 0 0 0 3px ${themeColor}1a;
      }
      .submit-btn {
        width: 100%;
        background: ${themeColor};
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
        box-shadow: 0 4px 12px ${themeColor}33;
      }
      .submit-btn:hover {
        opacity: 0.95;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">
        ${logoSvg}
      </div>
      <h1>Sign in with ${providerName}</h1>
      <p>to continue to <strong>TripInVilla</strong></p>
      <div class="badge">Development Sandbox Mode</div>

      <div class="preseed-list">
        <button class="account-btn" onclick="selectPreset('Rohan Sharma', 'rohan.sharma@gmail.com')">
          <div class="avatar-circle">R</div>
          <div class="account-info">
            <span class="account-name">Rohan Sharma</span>
            <span class="account-email">rohan.sharma@gmail.com</span>
          </div>
        </button>
        <button class="account-btn" onclick="selectPreset('Navin Kumar', 'navin@gmail.com')">
          <div class="avatar-circle">N</div>
          <div class="account-info">
            <span class="account-name">Navin Kumar</span>
            <span class="account-email">navin@gmail.com</span>
          </div>
        </button>
      </div>

      <div class="divider"><span>OR USE CUSTOM ACCOUNT</span></div>

      <form onsubmit="handleForm(event)">
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="customName" placeholder="John Doe" required />
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="customEmail" placeholder="john.doe@example.com" required />
        </div>
        <button type="submit" class="submit-btn">Continue with ${providerName}</button>
      </form>
    </div>

    <script>
      function selectPreset(name, email) {
        submitOAuth(name, email);
      }

      function handleForm(e) {
        e.preventDefault();
        const name = document.getElementById('customName').value.trim();
        const email = document.getElementById('customEmail').value.trim();
        submitOAuth(name, email);
      }

      function submitOAuth(name, email) {
        const query = new URLSearchParams({ name, email, provider: "${provider}" });
        window.location.href = "${getServerBaseUrl()}/api/auth/oauth/simulated/callback?" + query.toString();
      }
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
    const user = await User.create({ name, email, password, role });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
    return res.send(renderSimulatedOAuth({ provider: 'google', origin: getClientOrigin() }));
  }

  const redirectUri = `${getServerBaseUrl()}/api/auth/oauth/google/callback`;
  const state = makeStateToken('google');
  const scope = encodeURIComponent('openid email profile');

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
    if (!tokenRes.ok) {
      return res.status(400).send(`Google token exchange failed: ${tokenData.error || 'unknown_error'}`);
    }

    const accessToken = tokenData.access_token;
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await userinfoRes.json();
    if (!userinfoRes.ok) return res.status(400).send('Failed to fetch Google user profile');

    const email = (profile.email || '').toLowerCase().trim();
    if (!email) return res.status(400).send('Google profile did not include an email');

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: profile.name || 'Google User',
        email,
        password: crypto.randomBytes(12).toString('hex'),
        role: 'user',
        avatar: profile.picture || ''
      });
    } else {
      if (profile.picture && !user.avatar) user.avatar = profile.picture;
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
    return res.status(400).send('Google OAuth failed');
  }
});

// GET /api/auth/oauth/facebook
router.get('/oauth/facebook', (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId || appId.trim() === '' || appId.includes('your_facebook_app_id')) {
    return res.send(renderSimulatedOAuth({ provider: 'facebook', origin: getClientOrigin() }));
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

// GET /api/auth/oauth/simulated/callback
router.get('/oauth/simulated/callback', async (req, res) => {
  try {
    const { name, email, provider } = req.query;
    if (!name || !email) return res.status(400).send('Missing name or email');

    const lowerEmail = String(email).toLowerCase().trim();
    let user = await User.findOne({ email: lowerEmail });
    if (!user) {
      user = await User.create({
        name: String(name),
        email: lowerEmail,
        password: crypto.randomBytes(12).toString('hex'),
        role: 'user',
        avatar: ''
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
    return res.status(500).send('Simulated callback failed: ' + err.message);
  }
});

export default router;

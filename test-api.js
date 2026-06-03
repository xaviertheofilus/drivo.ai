const axios = require('axios');

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = BACKEND_URL + '/api';

const api = axios.create({ baseURL: API, headers: { 'Content-Type': 'application/json' } });

const localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('drivoai_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

async function test() {
  console.log('=== FRONTEND API TEST ===');
  console.log('Backend URL:', API);

  const email = 'new' + Date.now() + '@test.com';
  console.log('Email:', email);

  try {
    const r = await api.post('/auth/register', { email, password: 'Test1234!', full_name: 'Test User' });
    console.log('Step 1 - REGISTER: OK, token:', r.data.access_token ? 'YES (' + r.data.access_token.length + ' chars)' : 'NO');
    console.log('  User in response:', r.data.user?.email || 'MISSING');

    localStorage.setItem('drivoai_token', r.data.access_token);
    localStorage.setItem('drivoai_user', JSON.stringify(r.data.user));
    console.log('  Token saved to localStorage:', localStorage.getItem('drivoai_token') ? 'YES' : 'NO');

    const l = await api.post('/auth/login', { email, password: 'Test1234!' });
    console.log('Step 2 - LOGIN: OK, user:', l.data.user?.email || 'no user');

    const m = await api.get('/auth/me');
    console.log('Step 3 - /auth/me: OK, user:', m.data.email);

    const e = await api.get('/elevenlabs/signed-url');
    console.log('Step 4 - ELEVENLABS: OK, signed_url:', e.data.signed_url ? 'YES' : 'NO');
    console.log('  Agent ID:', e.data.agent_id);

    const s = await api.post('/sessions', { language: 'en' });
    console.log('Step 5 - SESSION: OK, session_id:', s.data.session_id || 'MISSING');
    console.log('  ElevenLabs config:', s.data.elevenlabs?.agent_id || 'MISSING');

    console.log('=== ALL TESTS PASSED ===');
  } catch(err) {
    console.log('ERROR at step:', err.response?.status, err.response?.data?.detail || err.message);
  }
}

test();
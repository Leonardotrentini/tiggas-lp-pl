const WA_LINKS = [
  'https://wa.me/5547997609773?text=Ol%C3%A1%2C%20vim%20do%20site%20e%20gostaria%20de%20comprar%20no%20atacado!',
  'https://wa.me/5547996693314?text=Ol%C3%A1%2C%20vim%20do%20site%20e%20gostaria%20de%20comprar%20no%20atacado!',
];

const COUNTER_KEY = 'tiggas_wa_counter';

async function incrGlobalCounter() {
  const baseUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  const res = await fetch(`${baseUrl}/incr/${COUNTER_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`KV incr failed: ${res.status}`);
  }

  const data = await res.json();
  if (typeof data.result !== 'number') {
    throw new Error('KV incr returned invalid result');
  }

  return data.result;
}

function pickLink(counter) {
  const index = (counter - 1) % WA_LINKS.length;
  return { url: WA_LINKS[index], index };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const counter = await incrGlobalCounter();

    if (counter === null) {
      return res.status(503).json({
        error: 'Contador não configurado. Conecte Vercel KV ao projeto.',
      });
    }

    const { url, index } = pickLink(counter);

    if (req.query.redirect === '1') {
      res.writeHead(302, { Location: url, 'Cache-Control': 'no-store' });
      return res.end();
    }

    return res.status(200).json({
      url,
      index,
      counter,
      total: WA_LINKS.length,
    });
  } catch (err) {
    console.error('[next-wa]', err);
    return res.status(500).json({ error: 'Falha ao obter próximo destino' });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-RequestDigest, If-Match');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { token, endpoint, method = 'GET', data } = body || {};

    if (!token) return res.status(400).json({ error: 'Missing token' });
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const url = `https://sarasanalytics.sharepoint.com/sites/training-library${endpoint}`;

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      }
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const spRes = await fetch(url, options);
    const text = await spRes.text();

    let json;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

    return res.status(spRes.status).json(json);

  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-RequestDigest, If-Match');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { token, endpoint, method = 'GET', data } = req.body || {};

    if (!token || !endpoint) {
      return res.status(400).json({ error: `Missing: ${!token ? 'token' : 'endpoint'}` });
    }

    const url = `https://sarasanalytics.sharepoint.com/sites/training-library${endpoint}`;

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      }
    };

    if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const spRes = await fetch(url, options);
    const text = await spRes.text();
    console.log(`SP ${method} ${endpoint.substring(0, 60)} → ${spRes.status}`);
    if (spRes.status >= 400) console.error('SP error body:', text.substring(0, 500));

    try {
      return res.status(spRes.status).json(JSON.parse(text));
    } catch {
      return res.status(spRes.status).send(text);
    }

  } catch (err) {
    console.error('Proxy error:', err.message, 'Node:', process.version);
    return res.status(500).json({ error: err.message, node: process.version });
  }
};

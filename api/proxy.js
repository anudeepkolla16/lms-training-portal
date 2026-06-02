const axios = require('axios');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-RequestDigest, If-Match',
};

module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { token, endpoint, method = 'GET', data } = req.body || {};

    if (!token || !endpoint) {
      return res.status(400).json({ error: 'Missing token or endpoint' });
    }

    const url = `https://sarasanalytics.sharepoint.com/sites/training-library${endpoint}`;

    console.log(`Calling SharePoint: ${method} ${endpoint.substring(0, 80)}`);

    const config = {
      method: method.toLowerCase(),
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/json;odata=verbose',
      },
      validateStatus: () => true, // Don't throw on non-2xx
    };

    if (data && ['post', 'patch', 'put'].includes(method.toLowerCase())) {
      config.data = data;
    }

    const spRes = await axios(config);

    console.log(`SharePoint responded: ${spRes.status}`);
    if (spRes.status >= 400) {
      console.error('SP error:', JSON.stringify(spRes.data)?.substring(0, 300));
    }

    return res.status(spRes.status).json(spRes.data);

  } catch (err) {
    console.error('Proxy error:', err.message, 'Code:', err.code);
    return res.status(500).json({ error: err.message, code: err.code });
  }
};

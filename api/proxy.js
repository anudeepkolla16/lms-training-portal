const https = require('https');
const http = require('http');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-RequestDigest, If-Match');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token, endpoint, method = 'GET', data, headers: extraHeaders } = req.body || {};

  if (!token || !endpoint) {
    return res.status(400).json({ error: 'Missing token or endpoint' });
  }

  const SHAREPOINT = 'sarasanalytics.sharepoint.com';
  const path = `/sites/training-library${endpoint}`;

  const reqHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(extraHeaders || {})
  };

  const body = data ? JSON.stringify(data) : undefined;
  if (body) reqHeaders['Content-Length'] = Buffer.byteLength(body);

  const options = {
    hostname: SHAREPOINT,
    path: path,
    method: method,
    headers: reqHeaders
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let responseData = '';
    proxyRes.on('data', (chunk) => { responseData += chunk; });
    proxyRes.on('end', () => {
      try {
        res.status(proxyRes.statusCode).json(JSON.parse(responseData));
      } catch (e) {
        res.status(proxyRes.statusCode).send(responseData);
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
};

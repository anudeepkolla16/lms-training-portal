import axios from 'axios';

const SHAREPOINT_SITE = 'https://sarasanalytics.sharepoint.com/sites/training-library';

export default async function handler(req, res) {
  const { token, endpoint, method = 'GET', data } = req.body;

  if (!token || !endpoint) {
    return res.status(400).json({ error: 'Missing token or endpoint' });
  }

  try {
    const config = {
      method,
      url: `${SHAREPOINT_SITE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (data) config.data = data;

    const response = await axios(config);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('SharePoint API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || error.message
    });
  }
}

const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // Try to serve static file first
    const filePath = path.join(__dirname, '../build', req.url);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);

      // Set correct content type
      const contentTypes = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };

      res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
      return res.send(content);
    }

    // For all other routes, serve index.html (SPA routing)
    const indexPath = path.join(__dirname, '../build/index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
};

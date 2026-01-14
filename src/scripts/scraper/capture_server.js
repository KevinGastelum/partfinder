import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, 'scraped_data.json');

const server = http.createServer((req, res) => {
    // CORS headers to allow browser fetch
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
             console.log(`Received data length: ${body.length}`);
             fs.writeFileSync(FILE_PATH, body);
             console.log(`Data saved to ${FILE_PATH}`);
             res.writeHead(200, {'Content-Type': 'text/plain'});
             res.end('Saved');
             
             // Give it a moment to flush response then exit
             setTimeout(() => {
                 console.log('Shutting down server...');
                 process.exit(0);
             }, 1000);
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(3000, () => {
    console.log('Capture server listening on port 3000');
});

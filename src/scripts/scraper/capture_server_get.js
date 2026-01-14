import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE_PATH = path.join(__dirname, 'scraped_data_fragments.json');

// Initialize file with array start
if (fs.existsSync(FILE_PATH)) fs.unlinkSync(FILE_PATH);

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && req.url.startsWith('/save')) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const data = url.searchParams.get('data');
            
            if (data) {
                const chunk = JSON.parse(decodeURIComponent(data)); // Verify it matches JSON
                fs.appendFileSync(FILE_PATH, JSON.stringify(chunk) + '\n');
                console.log(`Received chunk of ${chunk.length} items`);
            }
            
            // Return a 1x1 pixel gif or just empty
            res.writeHead(200, {'Content-Type': 'image/gif'});
            res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
        } catch (e) {
            console.error('Error processing chunk:', e.message);
            res.writeHead(400);
            res.end();
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3001, () => {
    console.log('GET Capture server listening on port 3001');
});

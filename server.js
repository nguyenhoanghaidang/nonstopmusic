// Nhạc Liền – backend không cần thư viện ngoài (Node.js 18+)
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.env.PORT || 3000, HOST = process.env.HOST || '127.0.0.1', KEY = process.env.YT_API_KEY || '';
const PUB = path.join(__dirname, 'public'), DATA = path.join(__dirname, 'data', 'library.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const YT_HOST = /(^|\.)(youtube\.com|youtu\.be)$/;

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 1e6) { no(new Error('Dữ liệu quá lớn')); req.destroy(); } });
  req.on('end', () => ok(s));
});

async function api(req, res, u) {
  const p = u.pathname;
  if (p === '/api/health') return send(res, 200, { ok: true, hasKey: !!KEY });

  // Tên bài và kênh của một video (oEmbed công khai, không cần khóa)
  if (p === '/api/oembed') {
    let t; try { t = new URL(u.searchParams.get('url')); } catch (e) { return send(res, 400, { error: 'URL không hợp lệ' }); }
    if (!YT_HOST.test(t.hostname)) return send(res, 400, { error: 'Chỉ nhận link YouTube' });
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(t.href));
    if (!r.ok) return send(res, 502, { error: 'YouTube không trả thông tin video' });
    return send(res, 200, await r.json());
  }

  // Danh sách phát: dùng YouTube Data API v3, cần YT_API_KEY
  if (p === '/api/playlist') {
    const id = u.searchParams.get('list') || '';
    if (!/^[\w-]{10,64}$/.test(id)) return send(res, 400, { error: 'Mã danh sách phát không hợp lệ' });
    if (!KEY) return send(res, 501, { error: 'Server chưa có YT_API_KEY nên chưa đọc được danh sách phát.' });
    const items = []; let page = '';
    for (let n = 0; n < 4; n++) { // tối đa 200 bài
      const q = new URLSearchParams({ part: 'snippet', maxResults: '50', playlistId: id, key: KEY });
      if (page) q.set('pageToken', page);
      const r = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?' + q), j = await r.json();
      if (!r.ok) return send(res, 502, { error: (j.error && j.error.message) || 'Lỗi YouTube API' });
      for (const it of j.items) {
        const s = it.snippet;
        if (!s.resourceId || !s.resourceId.videoId || s.title === 'Private video' || s.title === 'Deleted video') continue;
        items.push({ id: s.resourceId.videoId, title: s.title, artist: (s.videoOwnerChannelTitle || '').replace(/ - Topic$/, ''), art: s.thumbnails && (s.thumbnails.high || s.thumbnails.default || {}).url });
      }
      if (!(page = j.nextPageToken)) break;
    }
    return send(res, 200, { items });
  }

  // Thư viện YouTube đã lưu (file nhạc trong máy không lưu được vì trình duyệt không cho giữ đường dẫn)
  if (p === '/api/library') {
    if (req.method === 'GET') { try { return send(res, 200, JSON.parse(fs.readFileSync(DATA, 'utf8'))); } catch (e) { return send(res, 200, []); } }
    if (req.method === 'PUT') {
      const l = JSON.parse(await readBody(req));
      if (!Array.isArray(l)) return send(res, 400, { error: 'Dữ liệu sai' });
      const clean = l.slice(0, 500).map(t => ({ yt: String(t.yt), title: String(t.title || '').slice(0, 200), artist: String(t.artist || '').slice(0, 120), art: String(t.art || '').slice(0, 300) })).filter(t => /^[\w-]{11}$/.test(t.yt));
      fs.mkdirSync(path.dirname(DATA), { recursive: true });
      fs.writeFileSync(DATA, JSON.stringify(clean));
      return send(res, 200, { saved: clean.length });
    }
  }
  send(res, 404, { error: 'Không có API này' });
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) return await api(req, res, u);
    const f = path.normalize(path.join(PUB, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname)));
    if (!f.startsWith(PUB + path.sep)) return send(res, 403, { error: 'Không được phép' });
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      res.end(d);
    });
  } catch (e) { send(res, 500, { error: 'Lỗi server' }); }
}).listen(PORT, HOST, () => console.log(`Nhạc Liền chạy tại http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}  (YT_API_KEY: ${KEY ? 'đã đặt' : 'chưa đặt'})`));

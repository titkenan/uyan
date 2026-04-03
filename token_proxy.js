export default {
  async fetch(request) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('ID');
    const path = url.pathname;

    // Master URL Finder
    if (path === '/find' && channelId) {
      const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const text = await response.text();
      
      // URL pattern'lerini çıkar
      const patterns = text.match(/https?:\/\/[^\s"']+/g) || [];
      const baseUrls = [...new Set(patterns.map(u => {
        try {
          const parsed = new URL(u);
          return `${parsed.protocol}//${parsed.host}${parsed.pathname.split('/').slice(0, -1).join('/')}`;
        } catch (e) { 
          return null; 
        }
      }).filter(Boolean))];

      return new Response(`
🔍 Kanal ${channelId} Analizi:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Bulunan base URL'ler:
${baseUrls.join('\n')}

📄 Ham M3U8:
${text}
      `, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Yardım ekranı
    if (!channelId) {
      return new Response(`
╔═══════════════════════════════════════╗
║   M3U8 PROXY - ÇALIŞIYOR              ║
╠═══════════════════════════════════════╣
║ Kullanım:                             ║
║   ?ID=1       → Kanal izle            ║
║   /find?ID=1  → URL analizi           ║
╚═══════════════════════════════════════╝
      `, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    }

    // Normal M3U8 proxy
    try {
      const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*'
        }
      });

      const m3u8Content = await response.text();

      return new Response(m3u8Content, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

    } catch (error) {
      return new Response(`Hata: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};

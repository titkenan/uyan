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
        } catch { return null; }
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

    // Normal proxy
    if (!channelId) {
      return new Response('?ID=1 veya /find?ID=1', { status: 400 });
    }

    const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });
  }
};

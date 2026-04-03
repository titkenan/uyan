export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get('ID');

    // ===== TÜM URL'LERİ ÇIKAR =====
    if (path === '/extract-all') {
      let results = [];
      
      for (let id = 1; id <= 110; id++) {
        const realUrl = await getRealUrl(id);
        if (realUrl && !realUrl.includes('cdn-vizi')) {
          results.push(`ID ${id}: ${realUrl}`);
        }
        // Rate limit için bekle
        await new Promise(r => setTimeout(r, 100));
      }
      
      return new Response(results.join('\n'), {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // ===== TEK KANAL URL'İ GÖSTER =====
    if (path === '/show' && channelId) {
      const realUrl = await getRealUrl(channelId);
      return new Response(`Kanal ${channelId}:\n${realUrl}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ===== NORMAL YÖNLENDIRME =====
    if (!channelId) {
      return new Response(`
╔════════════════════════════════════════╗
║     KANAL YÖNLENDIRME SERVİSİ          ║
╠════════════════════════════════════════╣
║ Kullanım:                              ║
║   ?ID=1         → TRT 1 izle           ║
║   ?ID=2         → ATV izle             ║
║   /show?ID=1    → Gerçek URL'i göster  ║
║   /extract-all  → Tüm URL'leri çıkar   ║
╚════════════════════════════════════════╝
      `, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Gerçek URL'i al ve yönlendir
    try {
      const realUrl = await getRealUrl(channelId);
      
      if (!realUrl || realUrl.includes('cdn-vizi')) {
        return new Response(`❌ Kanal ${channelId} bulunamadı`, { status: 404 });
      }

      // 302 Redirect - Stream direkt açılır
      return Response.redirect(realUrl, 302);

    } catch (error) {
      return new Response(`❌ Hata: ${error.message}`, { status: 500 });
    }
  }
};

async function getRealUrl(channelId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'http://live.cdn-vizi.workers.dev/'
      }
    });

    clearTimeout(timeoutId);
    return response.url;

  } catch (error) {
    console.error(`Kanal ${channelId} hatası:`, error);
    return null;
  }
}

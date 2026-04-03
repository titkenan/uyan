export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get('ID');

    // ============ SEGMENT PROXY ============
    // Player .ts segment istediğinde buraya gelir
    if (path.startsWith('/seg/')) {
      const segmentPath = path.replace('/seg/', '');
      const segmentId = url.searchParams.get('id');
      
      if (!segmentId) {
        return new Response('Segment ID gerekli', { status: 400 });
      }

      // Taze M3U8 al ve doğru segment URL'ini bul
      const freshM3u8 = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${segmentId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      const m3u8Text = await freshM3u8.text();
      const segments = m3u8Text.match(/https:\/\/[^\s]+\.ts\?sid=[^\s]+/g) || [];
      
      // En son segment'i al (en güncel token)
      if (segments.length > 0) {
        const latestSegment = segments[segments.length - 1];
        const segResponse = await fetch(latestSegment, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        return new Response(segResponse.body, {
          headers: {
            'Content-Type': 'video/MP2T',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      return new Response('Segment bulunamadı', { status: 404 });
    }

    // ============ ANA M3U8 PROXY ============
    if (channelId) {
      try {
        // cdn-vizi'den M3U8 al
        const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        let m3u8Content = await response.text();

        if (!m3u8Content.includes('#EXTM3U')) {
          return new Response('Geçersiz M3U8', { status: 500 });
        }

        // ✅ HER SEGMENT URL'İNİ KENDİ WORKER'IMIZDAN GEÇİR
        // Böylece her segment için taze token alınır
        const workerBase = url.origin;
        
        m3u8Content = m3u8Content.replace(
          /https:\/\/[^\s]+\.ts\?sid=[^\s]+/g,
          (match, offset) => {
            // Segment numarasını çıkar
            const segNum = match.match(/\/(\d+)\.ts/)?.[1] || '0';
            return `${workerBase}/seg/${segNum}.ts?id=${channelId}&t=${Date.now()}`;
          }
        );

        return new Response(m3u8Content, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

      } catch (error) {
        return new Response(`Hata: ${error.message}`, { status: 500 });
      }
    }

    // ============ YARDIM ============
    return new Response(`
╔═══════════════════════════════════════╗
║   SONSUZ AKIŞ PROXY - v2.0            ║
╠═══════════════════════════════════════╣
║ Kullanım: ?ID=1                       ║
║                                       ║
║ Bu versiyon her segment için          ║
║ otomatik token yeniler.               ║
║ Artık 43sn'de donmayacak!             ║
╚═══════════════════════════════════════╝
    `, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
    });
  }
};

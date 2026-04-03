export default {
  async fetch(request) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('ID');
    const path = url.pathname;

    // Yardım ekranı
    if (!channelId && path === '/') {
      return new Response(`
╔═══════════════════════════════════════╗
║   M3U8 PLAYLIST PROXY - ÇALIŞIYOR     ║
╠═══════════════════════════════════════╣
║ Kullanım: ?ID=1 (TRT 1)               ║
║           ?ID=3 (SHOW TV)             ║
╚═══════════════════════════════════════╝
      `, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (!channelId) {
      return new Response('❌ ID parametresi gerekli', { status: 400 });
    }

    try {
      // cdn-vizi'den M3U8 playlist al
      const playlistResponse = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*'
        }
      });

      let playlistContent = await playlistResponse.text();

      // M3U8 mi kontrol et
      if (!playlistContent.includes('#EXTM3U')) {
        return new Response('❌ Geçersiz M3U8 yanıtı', { status: 500 });
      }

      // ✅ URL'leri değiştir - worker üzerinden proxy et
      const workerUrl = url.origin;
      
      playlistContent = playlistContent.replace(
        /https:\/\/h1fr\.uyanik\.tv\/([^\s]+)/g,
        `${workerUrl}/proxy?url=https://h1fr.uyanik.tv/$1`
      );

      // Temiz M3U8 döndür
      return new Response(playlistContent, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

    } catch (error) {
      return new Response(`❌ Hata: ${error.message}`, { status: 500 });
    }
  }
};

// Proxy endpoint (gereksiz olabilir ama ekledim)
async function proxySegment(segmentUrl) {
  const response = await fetch(segmentUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'video/MP2T',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}

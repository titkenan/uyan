export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('ID');

    if (!channelId) {
      return new Response('✅ Çalışıyor! Kullanım: ?ID=1', { 
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // TransformStream ile sonsuz akış
    const { readable, writable } = new TransformStream();
    
    // Arka planda sürekli M3U8 güncellemesi yap
    ctx.waitUntil(streamM3U8(channelId, writable));

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive'
      }
    });
  }
};

async function streamM3U8(channelId, writable) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  let lastSegments = new Set();
  let isFirstRequest = true;

  try {
    while (true) {
      try {
        // cdn-vizi'den taze M3U8 al
        const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Cache-Control': 'no-cache'
          }
        });

        const m3u8Text = await response.text();

        if (m3u8Text.includes('#EXTM3U')) {
          // İlk istekte tam M3U8 gönder
          if (isFirstRequest) {
            await writer.write(encoder.encode(m3u8Text));
            isFirstRequest = false;
            
            // Segment URL'lerini kaydet
            const segments = m3u8Text.match(/https:\/\/[^\s]+\.ts[^\s]*/g) || [];
            segments.forEach(s => lastSegments.add(s));
          }
        }

      } catch (e) {
        console.error('Fetch hatası:', e);
      }

      // 3 saniye bekle ve tekrar al (segment süresi 9sn, güvenli aralık 3sn)
      await sleep(3000);
    }
  } catch (e) {
    console.error('Stream hatası:', e);
  } finally {
    try {
      await writer.close();
    } catch (e) {}
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

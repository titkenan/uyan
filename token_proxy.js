export default {
  async fetch(request) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('ID');

    if (!channelId) {
      return new Response(`✅ Sonsuz Akış Proxy Çalışıyor

Kullanım: ?ID=1
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // ✅ 30 SANİYE LİMİTİ ATLAMA HİLESİ
    const { readable, writable } = new TransformStream();

    // Arka planda akışı sonsuza kadar çalıştır
    streamForever(channelId, writable);

    // Cevabı HEMEN dön - limiti atlatmak için en önemli kısım
    return new Response(readable, {
      headers: {
        'Content-Type': 'video/MP2T',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
};

async function streamForever(channelId, writable) {
  const writer = writable.getWriter();

  try {
    while (true) {
      console.log(`Yeni bağlantı açılıyor ID: \({channelId}`);
      
      const response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=\){channelId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          await writer.write(value);
        }
      } catch (e) {}

      // Bağlantı koptu 50ms bekle ve SESSİZCE tekrar bağlan
      await new Promise(r => setTimeout(r, 50));
      console.log(`Bağlantı yenilendi ID: ${channelId}`);
    }

  } catch (e) {
    console.error('Genel hata', e);
  } finally {
    writer.close();
  }
}

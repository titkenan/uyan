export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = url.searchParams.get('ID');

    // ===== TÜM URL'LERİ ÇIKAR (YAVAŞ YAVAŞ) =====
    if (path === '/extract-all') {
      let results = ['🔍 URL Çıkarma Başladı...\n'];
      
      for (let id = 1; id <= 110; id++) {
        try {
          const realUrl = await getRealUrl(id);
          if (realUrl) {
            results.push(`ID ${id}: ${realUrl}`);
          } else {
            results.push(`ID ${id}: ❌ Bulunamadı`);
          }
        } catch (e) {
          results.push(`ID ${id}: ⚠️ Hata - ${e.message}`);
        }
      }
      
      return new Response(results.join('\n'), {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // ===== TEK KANAL DEBUG =====
    if (path === '/show' && channelId) {
      const realUrl = await getRealUrl(channelId);
      const debugInfo = `
🔍 Debug Bilgisi - Kanal ${channelId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Kaynak: http://live.cdn-vizi.workers.dev/?ID=${channelId}
📍 Bulunan URL: ${realUrl || '❌ NULL'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
      return new Response(debugInfo, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ===== HIZLI TEST (İLK 10 KANAL) =====
    if (path === '/test') {
      let results = ['🧪 Hızlı Test (ID 1-10):\n'];
      
      for (let id = 1; id <= 10; id++) {
        const realUrl = await getRealUrl(id);
        results.push(`ID ${id}: ${realUrl || '❌'}`);
      }
      
      return new Response(results.join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ===== YARDIM EKRANI =====
    if (!channelId) {
      return new Response(`
╔════════════════════════════════════════╗
║     KANAL YÖNLENDIRME SERVİSİ          ║
╠════════════════════════════════════════╣
║ Kullanım:                              ║
║   ?ID=1           → TRT 1 izle         ║
║   /show?ID=1      → Debug bilgisi      ║
║   /test           → İlk 10 kanal test  ║
║   /extract-all    → Tüm URL'ler (yavaş)║
╚════════════════════════════════════════╝
      `, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ===== NORMAL YÖNLENDIRME =====
    try {
      const realUrl = await getRealUrl(channelId);
      
      if (!realUrl) {
        return new Response(`❌ Kanal ${channelId} için URL alınamadı`, { 
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      // 302 Redirect
      return Response.redirect(realUrl, 302);

    } catch (error) {
      return new Response(`❌ Hata: ${error.message}`, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};

async function getRealUrl(channelId) {
  try {
    // Önce HEAD isteği dene
    let response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      method: 'HEAD',
      redirect: 'manual', // Redirect takip etme
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });

    // Location header'ı varsa al
    let location = response.headers.get('Location');
    if (location && !location.includes('cdn-vizi')) {
      return location;
    }

    // HEAD işe yaramadıysa GET dene
    response = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });

    // Final URL
    const finalUrl = response.url;
    
    // Eğer hala cdn-vizi dönüyorsa NULL döndür
    if (finalUrl.includes('cdn-vizi')) {
      return null;
    }

    return finalUrl;

  } catch (error) {
    console.error(`Kanal ${channelId} hatası:`, error);
    return null;
  }
}

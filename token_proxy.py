// token_proxy.js - Cloudflare Worker için
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Kanal ID → Token cache
const channelTokens = new Map()

// Token yenileme fonksiyonu
async function refreshToken(channelId) {
  try {
    const originResponse = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'http://live.cdn-vizi.workers.dev/'
      },
      redirect: 'follow'
    })
    
    const realUrl = originResponse.url
    
    // Token'i çıkar
    if (realUrl.includes('sid=')) {
      const token = realUrl.split('sid=')[1].split('&')[0]
      channelTokens.set(channelId, {
        token: token,
        timestamp: Date.now(),
        fullUrl: realUrl
      })
      console.log(`✅ Kanal ${channelId} token yenilendi: ${token}`)
      return realUrl
    }
    
    return realUrl
  } catch (error) {
    console.error(`❌ Token yenileme hatası: ${error}`)
    return null
  }
}

// Ana istek işleyici
async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // URL formatı: /kanal/ID veya /ID
  let channelId = path.split('/').pop()
  
  // Query param olarak ID: ?ID=24
  if (!channelId || channelId === '') {
    channelId = url.searchParams.get('ID')
  }
  
  if (!channelId) {
    return new Response('Kanal ID gerekli! Örnek: /24 veya ?ID=24', { status: 400 })
  }
  
  // Token'i kontrol et (30 saniyede bir yenile)
  const tokenData = channelTokens.get(channelId)
  const now = Date.now()
  
  if (!tokenData || (now - tokenData.timestamp) > 30000) {
    // Token yoksa veya 30 saniye geçtiyse yenile
    await refreshToken(channelId)
  }
  
  // Taze token ile yayını al
  const freshTokenData = channelTokens.get(channelId)
  if (!freshTokenData) {
    return new Response('Token alınamadı', { status: 500 })
  }
  
  // Segment isteği mi kontrol et
  const isSegment = request.url.includes('.ts')
  
  try {
    const streamResponse = await fetch(freshTokenData.fullUrl, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Referer': 'http://live.cdn-vizi.workers.dev/'
      }
    })
    
    // Yanıtı kullanıcıya aktar
    const headers = new Headers(streamResponse.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'no-cache')
    
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers: headers
    })
    
  } catch (error) {
    return new Response(`Yayın hatası: ${error}`, { status: 500 })
  }
}

// token_proxy.js - Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const channelTokens = new Map()

async function refreshToken(channelId) {
  try {
    const originResponse = await fetch(`http://live.cdn-vizi.workers.dev/?ID=${channelId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'http://live.cdn-vizi.workers.dev/'
      },
      redirect: 'follow'
    })
    return originResponse.url
  } catch (error) {
    console.error(`Token hatası: ${error}`)
    return null
  }
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const channelId = url.pathname.split('/').pop() || url.searchParams.get('ID')
  
  if (!channelId) {
    return new Response('Kanal ID gerekli', { status: 400 })
  }
  
  // Token'i al veya yenile
  let realUrl = await refreshToken(channelId)
  if (!realUrl) {
    return new Response('Token alınamadı', { status: 500 })
  }
  
  try {
    const streamResponse = await fetch(realUrl, {
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Referer': 'http://live.cdn-vizi.workers.dev/'
      }
    })
    
    const headers = new Headers(streamResponse.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'no-cache')
    
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      headers: headers
    })
  } catch (error) {
    return new Response(`Yayın hatası: ${error}`, { status: 500 })
  }
}

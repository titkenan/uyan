export default {
  async fetch(request) {
    const url = new URL(request.url);
    const channelId = url.searchParams.get('ID');
    const path = url.pathname;

    // .ts segment proxy
    if (path === '/segment') {
      const segmentUrl = url.searchParams.get('url');
      if (!segmentUrl) {
        return new Response('url parametresi gerekli', { status: 400 });
      }
      
      const response = await fetch(segmentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'http://live.cdn-vizi.workers.dev/'
        }
      });

      return new Response(response.body, {
        headers: {
          'Content-Type': 'video/MP2T',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      

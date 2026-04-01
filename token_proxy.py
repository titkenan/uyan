import requests
import time
from flask import Flask, Response, request
import threading

app = Flask(__name__)

# Kanal ID → Son token
channel_tokens = {}

def refresh_token(channel_id):
    """Her 30 saniyede token yenile"""
    while True:
        try:
            worker_url = f"http://live.cdn-vizi.workers.dev/?ID={channel_id}"
            response = requests.get(worker_url, allow_redirects=True, timeout=10)
            
            # Token'ı çıkar
            if "sid=" in response.url:
                channel_tokens[channel_id] = response.url.split("sid=")[-1].split("&")[0]
                print(f"✅ Kanal {channel_id} token yenilendi: {channel_tokens[channel_id]}")
        except:
            pass
        time.sleep(30)  # 30 saniyede bir yenile

@app.route('/proxy/<channel_id>')
def proxy_channel(channel_id):
    """Kullanıcıya her zaman taze token ile yayın ver"""
    token = channel_tokens.get(channel_id, "")
    if not token:
        # İlk defa token al
        refresh_token(channel_id)
        token = channel_tokens.get(channel_id, "")
    
    # Master URL'yi oluştur
    base_urls = {
        "24": "https://h7fr.uyanik.tv/dvr/tm1fr_diyanetcocuk.stream_sd",
        "31": "https://trtcanlitv-lh.akamaized.net/i/TRTBELGESEL_1@181846",
        # Diğer kanallar için base URL'leri ekle
    }
    
    base = base_urls.get(channel_id, "")
    if base:
        stream_url = f"{base}.m3u8?sid={token}"
        return Response(requests.get(stream_url, stream=True).content, mimetype='application/vnd.apple.mpegurl')
    
    return "Kanal bulunamadı", 404

# Her kanal için background thread başlat
for cid in ["24", "31", "34", "25"]:  # İzlediğiniz kanallar
    thread = threading.Thread(target=refresh_token, args=(cid,))
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    print("🚀 Token yenileme proxy başlatıldı: http://localhost:5000/proxy/24")
    app.run(host='0.0.0.0', port=5000)

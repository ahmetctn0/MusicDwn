# MusicDwn

Tarayıcıdan kullanılan basit bir medya indirme sitesidir. Kullanıcı bir veya daha fazla
medya linki girer, format olarak `mp3` veya `mp4` seçer, backend `yt-dlp` ile dosyayı
hazırlar ve tarayıcıya indirir. Birden fazla link girilirse sonuç ZIP olarak sunulur.

## Özellikler

- YouTube ağırlıklı kullanım için uygun web arayüzü
- Tek linkte doğrudan indirme
- Çoklu linkte ZIP çıkışı
- `PATH` eksik olsa bile Windows Winget kurulum klasörlerinden `yt-dlp` ve `ffmpeg` bulma denemesi
- Ayrık frontend (`public/`) ve backend (`server.js`) yapısı

## Gereksinimler

- Node.js 20+
- `yt-dlp` kurulu
- `ffmpeg` kurulu

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm start
```

Site varsayılan olarak şu adreste çalışır:

```text
http://127.0.0.1:3000
```

## Windows Kurulum Notu

Eğer sistemde `yt-dlp` ve `ffmpeg` yoksa şu komutlarla kurabilirsin:

```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

Ardından yeni bir terminal açıp siteyi başlat:

```powershell
npm start
```

## Notlar

- MP3 dönüşümü ve bazı MP4 birleştirmeleri için `ffmpeg` gerekir.
- Backend `server.js`, arayüz ise `public/` altındadır.
- Yalnızca indirme hakkın olan içeriklerde kullan.
- `node_modules/` ve `storage/output/` GitHub'a dahil edilmemelidir.

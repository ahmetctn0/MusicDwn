# MusicDwn

Tarayicidan kullanilan basit bir medya indirme sitesidir. Kullanici bir veya daha fazla
medya linki girer, format olarak `mp3` veya `mp4` secer, backend `yt-dlp` ile dosyayi
hazirlar ve tarayiciya indirir. Birden fazla link girilirse sonuc ZIP olarak sunulur.

## Ozellikler

- YouTube agirlikli kullanim icin uygun web arayuzu
- Tek linkte dogrudan indirme
- Coklu linkte ZIP cikisi
- `PATH` eksik olsa bile Windows Winget kurulum klasorlerinden `yt-dlp` ve `ffmpeg` bulma denemesi
- Ayrik frontend (`public/`) ve backend (`server.js`) yapisi

## Gereksinimler

- Node.js 20+
- `yt-dlp` kurulu
- `ffmpeg` kurulu

## Kurulum

```bash
npm install
```

## Calistirma

```bash
npm start
```

Site varsayilan olarak su adreste calisir:

```text
http://127.0.0.1:3000
```

## Windows Kurulum Notu

Eger sistemde `yt-dlp` ve `ffmpeg` yoksa su komutlarla kurabilirsin:

```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

Ardindan yeni bir terminal acip siteyi baslat:

```powershell
npm start
```

## Notlar

- MP3 donusumu ve bazi MP4 birlestirmeleri icin `ffmpeg` gerekir.
- Backend `server.js`, arayuz ise `public/` altindadir.
- Yalnizca indirme hakkin olan iceriklerde kullan.
- `node_modules/` ve `storage/output/` GitHub'a dahil edilmemelidir.

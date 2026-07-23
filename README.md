# Adliye Haritası

Türkiye'de bir ilçenin hangi genel ilk derece adliyesinin yargı çevresinde olduğunu
ve bağlı Bölge Adliye Mahkemesini harita veya listeden gösteren sade, Türkçe ve
çevrimdışı çalışabilen PWA.

Canlı uygulama: https://adliyeharitasi.github.io/

## Kurulum

Node.js 24 LTS ile:

```powershell
npm.cmd install
npm.cmd run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

## Komutlar

```powershell
npm.cmd run dev             # geliştirme sunucusu
npm.cmd run data:validate   # 81 il / 973 kayıt ve kaynak kontrolü
npm.cmd run build           # dist üretim klasörünü oluşturur
npm.cmd run preview         # üretim paketini yerelde açar
```

## Kompakt mimari

```text
src/
  data/repository.ts        JSON veri erişimi ve şema doğrulama
  v2/V2App.tsx              liste ve sonuç arayüzü
  v2/SimpleJudicialMap.tsx  Leaflet haritası
  v2/v2.css                 tüm görsel stiller
  main.tsx                  uygulama başlangıcı
  types.ts                  yalnız kullanılan veri tipleri
public/data/
  districts/                il bazında, gerektiğinde yüklenen 81 GeoJSON
  provinces.geojson         il sınırları
  locations.json            arama ve koordinat indeksi
  judicial-districts.json   ilçe → adliye eşleşmeleri
  courthouse-contacts.json doğrulanmış resmî iletişim/telefon rehberi bağlantıları
  regional-courts.json      81 il → 17 faal BAM + 1 planlanan BAM
  sources.json              kaynak kayıtları
scripts/validate-data.mjs   veri bütünlüğü kontrolü
```

`dist/` klasörü statik hosting hizmetlerine doğrudan yüklenebilir. `main` dalına
gönderilen değişiklikler, GitHub Actions sırları tanımlandıktan sonra otomatik olarak
`adliye-haritasi` Cloudflare Pages projesine yayımlanır:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit yetkisi)

Kaynak kodu MIT lisansıyla paylaşılır. Veri kaynakları ve üçüncü taraf lisansları için
`NOTICE.md` dosyasına bakın.

## Bölge adliye mahkemesi verisi

BAM eşleşmeleri 22 Temmuz 2026 tarihinde tarihli HSK kararları ve resmî BAM
siteleri birlikte incelenerek doğrulanmıştır. Kaynaklar çeliştiğinde daha yeni tarihli
HSK Genel Kurulu kararı esas alınır. Bu nedenle örneğin Çanakkale, güncellenmemiş
Bursa BAM sayfasında görünmesine rağmen 03.07.2024 tarihli 1269 sayılı karar uyarınca
Tekirdağ BAM yargı çevresinde gösterilir.

Malatya BAM 01.09.2026 tarihinde faaliyete geçirilmek üzere planlandığından mevcut
eşleşme ile planlanan değişiklik ayrı ayrı gösterilir; planlanan kayıt faal BAM gibi
değerlendirilmez.

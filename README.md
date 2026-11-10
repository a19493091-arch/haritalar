# 🦊 Kelimo — Dil Öğrenme Uygulaması

Oyunlaştırılmış, tarayıcıda çalışan bir dil öğrenme uygulaması. Kurulum gerektirmez:
`index.html` dosyasını tarayıcıda açman yeterli.

## Özellikler
- **3 kurs:** İngilizce, Almanca, İspanyolca (Türkçe konuşanlar için)
- **Ders yolu:** üniteler ve kilitli/açık ders düğümleri; dersler sırayla açılır
- **6 alıştırma türü:** kelime seçme (iki yönlü), kelime bankasıyla cümle kurma (iki yönlü),
  eşleştirme, yazarak cevaplama, dinleme (tarayıcının konuşma sentezi ile)
- **Kalpler:** her hata 1 kalp götürür, 20 dakikada 1 kalp dolar; pratik yaparak kalp kazanılır
- **XP, günlük hedef ve seri (streak)**
- Yanlış yapılan sorular dersin sonunda tekrar sorulur
- Ses efektleri, konfeti, klavye kısayolları (Enter, 1–4), karanlık mod, mobil uyumlu
- İlerleme tarayıcıda (`localStorage`) saklanır

## Yerelde çalıştırma
```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Yeni içerik ekleme
`data.js` içindeki bir üniteye `words` (`[türkçe, hedef]`) ve `sentences` ekle;
alıştırmalar bu verilerden otomatik üretilir. Yeni bir dil için `COURSES` nesnesine
aynı yapıda bir kurs ekle.

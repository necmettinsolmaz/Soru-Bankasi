document.addEventListener('DOMContentLoaded', () => {
    const navSoruEkle = document.getElementById('nav-soru-ekle');
    const navTestOlustur = document.getElementById('nav-test-olustur');
    const soruKutuphanesi = document.getElementById('soru-kutuphanesi');
    const testOlusturma = document.getElementById('test-olusturma');
    const soruResmiInput = document.getElementById('soru-resmi');
    const resimOnizlemeAlani = document.getElementById('resim-onizleme-alani');
    
    // --- Bölümler Arası Geçiş Fonksiyonu ---
    const gosterBolum = (aktifBolum) => {
        soruKutuphanesi.classList.add('hidden');
        testOlusturma.classList.add('hidden');
        
        aktifBolum.classList.remove('hidden');
    }

    navSoruEkle.addEventListener('click', () => gosterBolum(soruKutuphanesi));
    navTestOlustur.addEventListener('click', () => gosterBolum(testOlusturma));


    // --- Resim Önizleme Fonksiyonu ---
    soruResmiInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        
        if (file) {
            // Resim dosyasından bir URL oluştur
            const fileReader = new FileReader();
            
            fileReader.onload = function(e) {
                resimOnizlemeAlani.innerHTML = `<img src="${e.target.result}" alt="Soru Önizlemesi">`;
            }
            
            // Resmin içeriğini Base64 Data URL olarak oku
            fileReader.readAsDataURL(file); 
        } else {
            resimOnizlemeAlani.innerHTML = '';
        }
    });

    // --- Soru Kaydetme (Şimdilik Placeholder) ---
    document.getElementById('meta-veri-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Soru Kaydediliyor... (Veri kaydetme mantığı app.js\'e eklenecektir.)');
        
        // Burada resim verisi ve meta veriler IndexedDB'ye kaydedilecek.
        // Formu sıfırlayabilirsiniz: e.target.reset();
        // resimOnizlemeAlani.innerHTML = '';
    });

    // --- Test Oluşturma (Şimdilik Placeholder) ---
    document.getElementById('test-kriter-formu').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Test Oluşturuluyor... (Soru seçme mantığı app.js\'e eklenecektir.)');
        
        // Burada filtreler kullanılarak IndexedDB'den sorular çekilecek ve #olusturulan-test alanına basılacak.
    });

    // Sayfa yüklendiğinde Soru Kütüphanesi gösterilsin
    gosterBolum(soruKutuphanesi);
});
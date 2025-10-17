document.addEventListener('DOMContentLoaded', () => {
    // IndexedDB Değişkenleri
    const DB_NAME = 'SoruTestDB';
    const DB_VERSION = 1;
    let db;

    // Arayüz Elementleri
    const konuYonetimiSection = document.getElementById('konu-yonetimi');
    const soruKutuphanesiSection = document.getElementById('soru-kutuphanesi');
    const testOlusturmaSection = document.getElementById('test-olusturma');
    const soruListesiContainer = document.getElementById('soru-listesi');

    // Soru Ekleme Formu Elementleri
    const soruResmiInput = document.getElementById('soru-resmi');
    const resimOnizlemeAlani = document.getElementById('resim-onizleme-alani');
    const konuSelect = document.getElementById('konu');
    const altKonuSelect = document.getElementById('alt-konu');
    const metaVeriForm = document.getElementById('meta-veri-form');

    // Konu Yönetimi Elementleri
    const yeniKonuAdiInput = document.getElementById('yeni-konu-adi');
    const konuEkleBtn = document.getElementById('konu-ekle-btn');
    const altKonuSecilenKonuSelect = document.getElementById('alt-konu-secilen-konu');
    const yeniAltKonuAdiInput = document.getElementById('yeni-alt-konu-adi');
    const altKonuEkleBtn = document.getElementById('alt-konu-ekle-btn');
    const kayitliKonularListesi = document.getElementById('kayitli-konular-listesi');
    
    // Test Oluşturma Formu Elementleri
    const testKonuSelect = document.getElementById('test-konu');
    const testAltKonuSelect = document.getElementById('test-alt-konu');
    const testZorlukSelect = document.getElementById('test-zorluk');
    const testKriterFormu = document.getElementById('test-kriter-formu');
    const olusturulanTestContainer = document.getElementById('olusturulan-test');
    
    // Navigasyon Butonları
    const navKonuYonetimi = document.getElementById('nav-konu-yonetimi');
    const navSoruEkle = document.getElementById('nav-soru-ekle');
    const navTestOlustur = document.getElementById('nav-test-olustur');

    // ------------------------------------
    // 1. INDEXEDDB İŞLEMLERİ VE YARDIMCI FONKSİYONLAR
    // ------------------------------------

    const initDb = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB hatası:", event.target.errorCode);
                reject("Veritabanı açılamadı.");
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                db = event.target.result;

                // Konu/Alt Konu Yönetimi için store
                if (!db.objectStoreNames.contains('konular')) {
                    db.createObjectStore('konular', { keyPath: 'konuAdi' });
                }
                
                // Soruları saklamak için store
                if (!db.objectStoreNames.contains('sorular')) {
                    db.createObjectStore('sorular', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    };

    const getTransaction = (storeName, mode) => {
        return db.transaction([storeName], mode).objectStore(storeName);
    };

    const getAllTopics = () => {
        return new Promise((resolve) => {
            const store = getTransaction('konular', 'readonly');
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => resolve([]); 
        });
    };

    // ------------------------------------
    // 2. KONU YÖNETİMİ MANTIĞI
    // ------------------------------------

    const addTopic = (konuAdi) => {
        return new Promise((resolve, reject) => {
            const store = getTransaction('konular', 'readwrite');
            const newTopic = { konuAdi: konuAdi, altKonular: [] };
            const request = store.add(newTopic);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(`Konu eklenemedi: "${konuAdi}" (Zaten var olabilir)`);
        });
    };

    const addSubTopic = (konuAdi, altKonuAdi) => {
        return new Promise((resolve, reject) => {
            const store = getTransaction('konular', 'readwrite');
            const getRequest = store.get(konuAdi);

            getRequest.onsuccess = () => {
                const konu = getRequest.result;
                if (konu) {
                    if (!konu.altKonular.includes(altKonuAdi)) {
                        konu.altKonular.push(altKonuAdi);
                        konu.altKonular.sort();
                        const putRequest = store.put(konu);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject("Alt konu kaydedilemedi.");
                    } else {
                        reject("Bu alt konu zaten mevcut.");
                    }
                } else {
                    reject("Konu bulunamadı.");
                }
            };
            getRequest.onerror = () => reject("Konu çekilemedi.");
        });
    };
    
    // ------------------------------------
    // 3. ARAYÜZ DOLDURMA İŞLEMLERİ
    // ------------------------------------
    
    const renderTopicManagement = (konular) => {
        kayitliKonularListesi.innerHTML = '';
        if (konular.length === 0) {
            kayitliKonularListesi.innerHTML = '<p>Henüz kayıtlı konu yok.</p>';
            return;
        }

        konular.forEach(konu => {
            const div = document.createElement('div');
            div.className = 'konu-item';
            // Basit bir stil için CSS'e eklenebilir veya buraya inline stil verilebilir
            div.style.border = '1px solid #ccc';
            div.style.margin = '10px 0';
            div.style.padding = '10px';
            
            div.innerHTML = `
                <h4>${konu.konuAdi}</h4>
                <ul style="padding-left: 20px;">
                    ${konu.altKonular.length > 0 ? konu.altKonular.map(altKonu => `<li>${altKonu}</li>`).join('') : '<li>Alt Konu Yok</li>'}
                </ul>
            `;
            kayitliKonularListesi.appendChild(div);
        });
    };

    const populateTopicSelects = (konular) => {
        [konuSelect, altKonuSecilenKonuSelect, testKonuSelect].forEach(select => {
            let initialOption = select === testKonuSelect ? { value: 'Tümü', text: 'Tümü' } : { value: '', text: 'Konu Seçiniz' };
            select.innerHTML = `<option value="${initialOption.value}">${initialOption.text}</option>`;

            konular.forEach(konu => {
                const option = document.createElement('option');
                option.value = konu.konuAdi;
                option.textContent = konu.konuAdi;
                select.appendChild(option);
            });
        });
    };

    const populateTestSubTopicSelect = async (konuAdi) => {
        testAltKonuSelect.innerHTML = '';
        
        if (konuAdi === 'Tümü' || !konuAdi) {
            testAltKonuSelect.innerHTML = '<option value="Tümü">Tümü</option>';
            testAltKonuSelect.disabled = true;
            return;
        }

        try {
            const store = getTransaction('konular', 'readonly');
            const request = store.get(konuAdi);
            
            request.onsuccess = (e) => {
                const konu = e.target.result;
                testAltKonuSelect.innerHTML = '<option value="Tümü">Tümü</option>'; // Başlangıç seçeneği
                
                if (konu && konu.altKonular.length > 0) {
                    konu.altKonular.forEach(altKonu => {
                        const option = document.createElement('option');
                        option.value = altKonu;
                        option.textContent = altKonu;
                        testAltKonuSelect.appendChild(option);
                    });
                    testAltKonuSelect.disabled = false;
                } else {
                    testAltKonuSelect.disabled = true;
                }
            };
        } catch (error) {
            console.error("Test alt konuları yüklenirken hata:", error);
            testAltKonuSelect.innerHTML = '<option value="Tümü">Hata Oluştu</option>';
        }
    };
    const populateSubTopicSelect = async (konuAdi) => {
        altKonuSelect.innerHTML = '';
        altKonuSelect.disabled = true;

        if (!konuAdi) {
            altKonuSelect.innerHTML = '<option value="">Önce Konu Seçiniz</option>';
            return;
        }
        
        try {
            const store = getTransaction('konular', 'readonly');
            const request = store.get(konuAdi);
            
            request.onsuccess = (e) => {
                const konu = e.target.result;
                if (konu && konu.altKonular.length > 0) {
                    konu.altKonular.forEach(altKonu => {
                        const option = document.createElement('option');
                        option.value = altKonu;
                        option.textContent = altKonu;
                        altKonuSelect.appendChild(option);
                    });
                    altKonuSelect.disabled = false;
                } else {
                    altKonuSelect.innerHTML = '<option value="">Bu Konuya Ait Alt Konu Yok</option>';
                }
            };
        } catch (error) {
            console.error("Alt konular yüklenirken hata:", error);
            altKonuSelect.innerHTML = '<option value="">Hata Oluştu</option>';
        }
    };
    
    // ------------------------------------
    // 4. SİYAH KUTU MANTIĞI (Navigasyon ve Yükleme)
    // ------------------------------------

    const loadAllData = async () => {
        const konular = await getAllTopics();
        populateTopicSelects(konular);
        renderTopicManagement(konular);
        loadQuestionPreviews();
        
        // Soru ekleme formunda bir konu seçildiyse alt konuları da yükle
        if (konuSelect.value) {
            populateSubTopicSelect(konuSelect.value);
        }
    };

    const gosterBolum = (aktifBolum) => {
        // Tüm bölümleri gizle
        [konuYonetimiSection, soruKutuphanesiSection, testOlusturmaSection].forEach(s => s.classList.add('hidden'));
        
        aktifBolum.classList.remove('hidden');
        loadAllData();
    }
    
    // ------------------------------------
    // 5. OLAY DİNLEYİCİLERİ
    // ------------------------------------

    // Navigasyon Olay Dinleyicileri
    navKonuYonetimi.addEventListener('click', () => gosterBolum(konuYonetimiSection));
    navSoruEkle.addEventListener('click', () => gosterBolum(soruKutuphanesiSection));
    navTestOlustur.addEventListener('click', () => gosterBolum(testOlusturmaSection));

    // Konu Yönetimi Olay Dinleyicileri
    konuEkleBtn.addEventListener('click', async () => {
        const konuAdi = yeniKonuAdiInput.value.trim();
        if (konuAdi) {
            try {
                await addTopic(konuAdi);
                alert(`Konu "${konuAdi}" başarıyla eklendi.`);
                yeniKonuAdiInput.value = '';
                loadAllData();
            } catch (e) {
                alert(`Hata: ${e}`);
            }
        } else {
            alert('Lütfen bir konu adı giriniz.');
        }
    });

    altKonuEkleBtn.addEventListener('click', async () => {
        const konuAdi = altKonuSecilenKonuSelect.value;
        const altKonuAdi = yeniAltKonuAdiInput.value.trim();

        if (!konuAdi) {
            alert('Lütfen önce bir ana konu seçiniz.');
            return;
        }
        if (!altKonuAdi) {
            alert('Lütfen bir alt konu adı giriniz.');
            return;
        }

        try {
            await addSubTopic(konuAdi, altKonuAdi);
            alert(`Alt Konu "${altKonuAdi}" (Konu: ${konuAdi}) başarıyla eklendi.`);
            yeniAltKonuAdiInput.value = '';
            loadAllData();
        } catch (e) {
            alert(`Hata: ${e}`);
        }
    });


    // Soru Ekleme Formu Dinleyicileri
    soruResmiInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        resimOnizlemeAlani.innerHTML = 'Dosya yükleniyor...';
        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = function(e) {
                resimOnizlemeAlani.innerHTML = `<img src="${e.target.result}" alt="Soru Önizlemesi">`;
            }
            fileReader.readAsDataURL(file); 
        } else {
            resimOnizlemeAlani.innerHTML = '';
        }
    });
    
    konuSelect.addEventListener('change', () => {
        populateSubTopicSelect(konuSelect.value);
    });
    // Test Oluşturma Konu/Alt Konu Seçim Dinleyicisi (YENİ)
    testKonuSelect.addEventListener('change', () => {
        const secilenKonu = testKonuSelect.value;
        populateTestSubTopicSelect(secilenKonu);
    });

    // Soru Kaydetme İşlemi (Image to Base64)
    metaVeriForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const imageFile = soruResmiInput.files[0];
        const konu = konuSelect.value;
        const altKonu = altKonuSelect.value;
        const zorluk = document.getElementById('zorluk').value;
        let imageBase64 = null;

        if (!imageFile) {
            alert('Lütfen bir soru resmi seçiniz.');
            return;
        }

        // Resim dosyasını Base64'e çevirme
        try {
            imageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(imageFile);
            });
        } catch (error) {
            alert('Resim yüklenirken bir hata oluştu.');
            return;
        }

        const yeniSoru = {
            imageBase64: imageBase64,
            konu: konu,
            altKonu: altKonu,
            zorluk: zorluk,
            olusturmaTarihi: new Date().toISOString()
        };

        // IndexedDB'ye kaydetme
        try {
            const store = getTransaction('sorular', 'readwrite');
            store.add(yeniSoru);

            store.transaction.oncomplete = () => {
                alert('Soru başarıyla kaydedildi!');
                metaVeriForm.reset();
                resimOnizlemeAlani.innerHTML = '';
                loadAllData(); // Soru listesini güncelle
            };

            store.transaction.onerror = (e) => {
                alert('Soru kaydı sırasında bir veritabanı hatası oluştu.');
                console.error(e);
            };
        } catch (error) {
            console.error(error);
            alert('Veritabanı işlemi sırasında beklenmeyen bir hata oluştu.');
        }
    });
    
    // ------------------------------------
    // 6. SORU GÖRÜNTÜLEME İŞLEMLERİ
    // ------------------------------------

    const loadQuestionPreviews = async () => {
        soruListesiContainer.innerHTML = '';
        try {
            const store = getTransaction('sorular', 'readonly');
            const request = store.getAll();

            request.onsuccess = (e) => {
                const sorular = e.target.result;
                if (sorular.length === 0) {
                    soruListesiContainer.innerHTML = '<p>Henüz kaydedilmiş soru yok.</p>';
                    return;
                }

                sorular.reverse().forEach(soru => { 
                    const div = document.createElement('div');
                    div.className = 'soru-onizleme';
                    div.title = `Konu: ${soru.konu}, Alt Konu: ${soru.altKonu}, Zorluk: ${soru.zorluk}`;
                    div.innerHTML = `
                        <img src="${soru.imageBase64}" alt="Soru ${soru.id}">
                        <p style="font-size: 0.7em; margin: 5px 0;">
                            ${soru.konu} / ${soru.altKonu.substring(0, 15)}...
                            <br>(${soru.zorluk})
                        </p>
                    `;
                    soruListesiContainer.appendChild(div);
                });
            };
        } catch (error) {
            soruListesiContainer.innerHTML = '<p>Sorular yüklenirken bir hata oluştu.</p>';
            console.error("Sorular yüklenirken hata:", error);
        }
    };
    
    // ------------------------------------
    // 7. UYGULAMA BAŞLANGICI
    // ------------------------------------

    // IndexedDB'yi başlat ve varsayılan bölümü göster
    initDb().then(() => {
        gosterBolum(konuYonetimiSection); // Başlangıçta Konu Yönetimini göster
    }).catch(error => {
        alert(error + "\nUygulama düzgün çalışmayabilir. Lütfen tarayıcınızın konsolunu kontrol edin.");
    });
    // ------------------------------------
    // 8. TEST OLUŞTURMA İŞLEMLERİ
    // ------------------------------------

    const getAllQuestions = () => {
        return new Promise((resolve) => {
            const store = getTransaction('sorular', 'readonly');
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => resolve([]); 
        });
    };

    const filterAndSelectQuestions = async (filters) => {
        const allQuestions = await getAllQuestions();
        let filteredQuestions = allQuestions;
        
        // 1. Konu Filtreleme
        if (filters.konu !== 'Tümü') {
            filteredQuestions = filteredQuestions.filter(q => q.konu === filters.konu);
        }
        
        // 2. Zorluk Filtreleme
        if (filters.zorluk !== 'Tümü') {
            filteredQuestions = filteredQuestions.filter(q => q.zorluk === filters.zorluk);
        }
        
        // Yeterli soru yoksa
        if (filteredQuestions.length < filters.sayi) {
             return { 
                selected: [], 
                message: `Kriterlerinize uygun sadece ${filteredQuestions.length} soru bulundu. Test için yeterli değil.` 
            };
        }

        // 3. Rastgele Seçim (Fisher-Yates Shuffle algoritmasının bir varyasyonu)
        const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, filters.sayi);
        
        return { 
            selected: selectedQuestions, 
            message: `Başarıyla ${selectedQuestions.length} soruluk test oluşturuldu.` 
        };
    };

    const renderTest = (questions) => {
        olusturulanTestContainer.innerHTML = '<h3>Oluşturulan Test</h3>';

        if (questions.length === 0) {
            olusturulanTestContainer.innerHTML += '<p>Seçilen kriterlere uygun soru bulunamadı.</p>';
            return;
        }

        questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'test-sorusu-container';
            questionDiv.style.marginBottom = '20px';
            questionDiv.style.borderBottom = '1px dashed #ccc';
            questionDiv.style.paddingBottom = '15px';
            
            questionDiv.innerHTML = `
                <h4>Soru ${index + 1}</h4>
                <p style="font-size: 0.9em; color: #555;">Konu: ${q.konu} (${q.altKonu}) - Zorluk: ${q.zorluk}</p>
                <img src="${q.imageBase64}" alt="Test Sorusu ${q.id}" style="max-width: 100%; height: auto; display: block; margin: 10px 0;">
                `;
            olusturulanTestContainer.appendChild(questionDiv);
        });
    };

    // Test Oluşturma Formu Dinleyicisi
    testKriterFormu.addEventListener('submit', async (e) => {
        e.preventDefault();

        const filters = {
            konu: document.getElementById('test-konu').value,
            altKonu: document.getElementById('test-alt-konu').value, // YENİ
            zorluk: document.getElementById('test-zorluk').value,
            sayi: parseInt(document.getElementById('soru-sayisi').value, 10)
        };
        
        if (isNaN(filters.sayi) || filters.sayi < 1) {
            alert('Lütfen geçerli bir soru sayısı giriniz.');
            return;
        }

        const result = await filterAndSelectQuestions(filters);
        
        alert(result.message);
        renderTest(result.selected);
        
        if (!testOlusturmaSection.classList.contains('hidden')) {
             olusturulanTestContainer.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
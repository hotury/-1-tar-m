// 1. SUPABASE BAĞLANTI AYARLARI
const supabaseUrl = 'https://kjgmwwfpdvpqqdsvqohr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZ213d2ZwZHZwcXFkc3Zxb2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDA4ODAsImV4cCI6MjA5MDk3Njg4MH0.082r3tqYx1WUFbPuH7xmOmlmmvhco-ZaxR460Kqo90U';
const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// ... (Toast ve Global State fonksiyonları aynı kalıyor) ...

// ─────────────────────────────────────────
// KAYIT OL FONKSİYONU (Düzeltildi)
// ─────────────────────────────────────────
async function kayitOl() {
    const email    = document.getElementById('kayit-email').value.trim();
    const isim     = document.getElementById('kayit-isim').value.trim();
    const sehir    = document.getElementById('kayit-sehir').value.trim();
    const uzmanlik = document.getElementById('kayit-uzmanlik').value;
    const kvkk     = document.getElementById('kvkk-kayit').checked;

    console.log("🚀 Kayıt işlemi başladı: ", { email, isim, sehir, uzmanlik });

    if (!email || !email.includes('@')) { showToast('❌ Geçerli bir e-posta girin'); return; }
    if (!isim)  { showToast('❌ İsminizi girin'); return; }
    if (!kvkk)  { showToast('❌ Lütfen koşulları kabul edin'); return; }

    const btn = document.querySelector('#panel-kayit .send-btn');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';

    // Magic Link Gönderimi
    const { error } = await sb.auth.signInWithOtp({
        email, 
        options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
        console.error("❌ Supabase Auth Hatası:", error.message);
        showToast('❌ ' + error.message);
        btn.disabled = false; btn.textContent = '✅ Kayıt Ol & Link Gönder';
        return;
    }

    // KRİTİK: Kullanıcı linke tıklayıp dönene kadar verileri tarayıcıda saklıyoruz
    const profileData = { 
        name: isim, 
        city: sehir, 
        specialty: uzmanlik, 
        email: email 
    };
    localStorage.setItem('pending_profile', JSON.stringify(profileData));
    
    console.log("📂 Geçici profil verisi kaydedildi:", profileData);
    btn.disabled = false; btn.textContent = '✅ Kayıt Ol & Link Gönder';
    showToast('📧 Giriş linki e-postanıza gönderildi!', 6000);
}

// ─────────────────────────────────────────
// OTURUM DEĞİŞİKLİĞİ VE VERİTABANI KAYDI (Düzeltildi)
// ─────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
    console.log("🔄 Oturum Durumu Değişti:", event);

    if (event === 'SIGNED_IN' && session) {
        _currentUser = session.user;
        console.log("👤 Kullanıcı Giriş Yaptı:", _currentUser.email);

        const bekleyen = localStorage.getItem('pending_profile');
        const pd       = bekleyen ? JSON.parse(bekleyen) : null;

        try {
            // Veritabanına (profiles tablosu) asıl kaydı burada yapıyoruz
            const { error: upsertError } = await sb.from('profiles').upsert({
                id:        _currentUser.id,
                name:      pd?.name      || _currentUser.email?.split('@')[0],
                city:      pd?.city      || null,
                specialty: pd?.specialty || null,
                role:      'user' // Yeni kayıtlar her zaman user başlar
            }, { onConflict: 'id' });

            if (upsertError) {
                console.error("❌ Profil Kayıt Hatası (SQL):", upsertError.message);
                showToast("⚠️ Profil oluşturulamadı: " + upsertError.message);
            } else {
                console.log("✅ Profil başarıyla güncellendi/oluşturuldu.");
                if (bekleyen) localStorage.removeItem('pending_profile');
            }

            // Güncel profili çek ve arayüzü güncelle
            const { data: prof } = await sb.from('profiles').select('*').eq('id', _currentUser.id).single();
            _profile = prof;
            _isAdmin = prof?.role === 'admin';

            oturumKontrol();
            sorulariYukle();
            closeAuthModal();
            showToast('✅ Giriş yapıldı!');

        } catch (e) {
            console.error("💥 Beklenmedik Hata:", e);
        }
    }

    if (event === 'SIGNED_OUT') {
        _currentUser = null; _isAdmin = false; _profile = null;
        oturumKontrol();
        sorulariYukle();
    }
});

// ... (Geri kalan tüm fonksiyonlar (sorulariYukle, ekranaBas vb.) mevcut dosyadaki gibi kalabilir) ...

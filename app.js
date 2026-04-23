// 1. SUPABASE BAĞLANTI AYARLARI
const supabaseUrl = 'https://kjgmwwfpdvpqqdsvqohr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqZ213d2ZwZHZwcXFkc3Zxb2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDA4ODAsImV4cCI6MjA5MDk3Njg4MH0.082r3tqYx1WUFbPuH7xmOmlmmvhco-ZaxR460Kqo90U';
const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────
// GLOBAL DEĞİŞKENLER
// ─────────────────────────────────────────
let _currentUser = null;
let _profile = null;
let _isAdmin = false;

// ─────────────────────────────────────────
// TOAST (BİLDİRİM) SİSTEMİ
// ─────────────────────────────────────────
function showToast(msg, duration = 4000) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.className = 'toast-style'; // CSS'de tanımlı olmalı
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// ─────────────────────────────────────────
// KAYIT OL FONKSİYONU (Magic Link)
// ─────────────────────────────────────────
async function kayitOl() {
    const email    = document.getElementById('kayit-email')?.value.trim();
    const isim     = document.getElementById('kayit-isim')?.value.trim();
    const sehir    = document.getElementById('kayit-sehir')?.value.trim();
    const uzmanlik = document.getElementById('kayit-uzmanlik')?.value;
    const kvkk     = document.getElementById('kvkk-kayit')?.checked;

    if (!email || !isim || !kvkk) {
        showToast('❌ Lütfen tüm zorunlu alanları doldurun.');
        return;
    }

    // Bilgileri e-posta onayından sonra kullanmak üzere saklıyoruz
    const profileData = { name: isim, city: sehir, specialty: uzmanlik };
    localStorage.setItem('pending_profile', JSON.stringify(profileData));

    const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
        showToast('❌ Hata: ' + error.message);
    } else {
        showToast('📧 Giriş linki e-postanıza gönderildi!');
    }
}

// ─────────────────────────────────────────
// GİRİŞ YAP FONKSİYONU (Magic Link)
// ─────────────────────────────────────────
async function magicLinkGonder() {
    const email = document.getElementById('giris-email')?.value.trim();
    const kvkk  = document.getElementById('kvkk-giris')?.checked;

    if (!email || !kvkk) {
        showToast('❌ E-posta ve KVKK onayı gerekli.');
        return;
    }

    const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
        showToast('❌ Hata: ' + error.message);
    } else {
        showToast('📧 Giriş linki e-postanıza gönderildi!');
    }
}

// ─────────────────────────────────────────
// OTURUM YÖNETİMİ VE PROFİL OLUŞTURMA
// ─────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        _currentUser = session.user;

        // Önce mevcut profili kontrol et (Adminlik gitmesin diye)
        let { data: existingProfile } = await sb.from('profiles').select('*').eq('id', _currentUser.id).single();

        const bekleyen = localStorage.getItem('pending_profile');
        const pd = bekleyen ? JSON.parse(bekleyen) : null;

        // Profil güncelleme veya oluşturma
        await sb.from('profiles').upsert({
            id:        _currentUser.id,
            name:      pd?.name      || existingProfile?.name      || _currentUser.email.split('@')[0],
            city:      pd?.city      || existingProfile?.city      || null,
            specialty: pd?.specialty || existingProfile?.specialty || null,
            role:      existingProfile?.role || 'user' // Eğer admin ise admin kalsın
        }, { onConflict: 'id' });

        if (bekleyen) localStorage.removeItem('pending_profile');

        // Güncel verileri çek
        const { data: prof } = await sb.from('profiles').select('*').eq('id', _currentUser.id).single();
        _profile = prof;
        _isAdmin = prof?.role === 'admin';

        // UI Güncellemeleri
        oturumKontrol();
        sorulariYukle();
        closeAuthModal();
        showToast('✅ Başarıyla giriş yapıldı!');
    }

    if (event === 'SIGNED_OUT') {
        _currentUser = null; _isAdmin = false; _profile = null;
        oturumKontrol();
        sorulariYukle();
    }
});

// ─────────────────────────────────────────
// ÇIKIŞ YAP
// ─────────────────────────────────────────
async function cikisYap() {
    await sb.auth.signOut();
    showToast('Çıkış yapıldı.');
}

// Not: oturumKontrol, sorulariYukle ve modal fonksiyonlarının 
// projenin geri kalanında (HTML/CSS uyumlu) olduğunu varsayıyorum.

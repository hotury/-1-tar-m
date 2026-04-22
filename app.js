// 1. Kayıt Fonksiyonu (Hata Yakalayıcı ve Hızlandırılmış Mod)
async function signUp() {
    // Formdaki verileri alıyoruz (ID'lerin HTML ile aynı olduğundan emin ol)
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const city = document.getElementById('city').value;
    const specialty = document.getElementById('specialty').value;
    const role = document.getElementById('role') ? document.getElementById('role').value : 'user';

    console.log("🚀 Kayıt denemesi başladı...");
    console.log("📝 Gönderilen Bilgiler:", { email, fullName, city, specialty, role });

    // "Kaydediliyor" yazısını göster
    const statusLabel = document.getElementById('statusLabel'); 
    if(statusLabel) statusLabel.innerText = "Sistem kontrol ediliyor, lütfen bekleyin...";

    try {
        // Supabase Kayıt İşlemi
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    city: city,
                    specialty: specialty,
                    role: role
                }
            }
        });

        // 1. Durum: Supabase bir hata döndürdü (Şifre kısa, e-posta geçersiz vb.)
        if (error) {
            console.error("❌ Supabase Hatası:", error.message);
            alert("Kayıt Başarısız: " + error.message);
            if(statusLabel) statusLabel.innerText = "Hata oluştu.";
            return;
        }

        console.log("✅ Auth kaydı başarılı:", data);

        // 2. Durum: Kayıt oldu ama e-posta onayı hala açık (Session null döner)
        if (data.user && !data.session) {
            console.warn("⚠️ E-posta onay ayarı hala açık!");
            alert("Kayıt yapıldı ancak e-posta onayı bekliyor. Supabase panelinden 'Confirm Email' ayarını kapatmalısın.");
            if(statusLabel) statusLabel.innerText = "E-posta onayı bekleniyor...";
        } 
        // 3. Durum: Her şey mükemmel, giriş yapıldı
        else {
            console.log("🎉 Giriş başarılı! Yönlendiriliyorsunuz...");
            alert("Kaydınız başarıyla tamamlandı!");
            window.location.href = "index.html"; // Ana sayfaya gönder
        }

    } catch (err) {
        console.error("💥 Kod Hatası:", err);
        alert("Beklenmedik bir hata oluştu: " + err.message);
    }
}

// 2. Giriş (Login) Fonksiyonu
async function signIn() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    console.log("🔑 Giriş denemesi yapılıyor...");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error("❌ Giriş Hatası:", error.message);
        alert("Giriş başarısız: " + error.message);
    } else {
        console.log("✅ Giriş başarılı:", data);
        window.location.href = "index.html";
    }
}

// 3. Çıkış (Logout) Fonksiyonu
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Çıkış hatası:", error.message);
    window.location.reload();
}

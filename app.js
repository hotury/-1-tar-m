async function signUp(email, password, fullName, city, specialty, role) {
    console.log("1. İşlem başladı: Bilgiler toplanıyor...");
    const loadingText = document.getElementById('loadingText'); // Varsa loading yazısı
    if(loadingText) loadingText.innerText = "Kayıt işlemi başlatıldı...";

    try {
        console.log("2. Supabase'e istek gönderiliyor...");
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

        if (error) {
            console.error("❌ HATA 1 (Supabase Kaynaklı):", error.message);
            alert("Kayıt durduruldu: " + error.message);
            return;
        }

        console.log("3. Auth kaydı başarılı! Profil kontrol ediliyor...", data);

        if (data.user && data.session === null) {
            console.warn("⚠️ UYARI: E-posta onay linki bekliyor! Panelden 'Confirm Email'i kapatmamış olabilirsin.");
            alert("Kayıt oluşturuldu ama onay bekliyor. Lütfen e-postanı kontrol et veya panelden onayı kapat.");
        } else {
            console.log("4. İşlem tamam! Yönlendiriliyorsunuz...");
            alert("Hoş geldiniz! Giriş başarılı.");
            window.location.href = "index.html"; 
        }

    } catch (err) {
        console.error("💥 HATA 2 (Kod Yazım Hatası):", err);
        alert("Kodun içinde bir sorun var: " + err.message);
    }
}

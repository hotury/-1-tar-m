const supabaseUrl = 'https://iwfjolvdvuzxvzsbhqgp.supabase.co';
const supabaseKey = 'sb_publishable_RABickp7kJZ2WwyO5Gg-Fg_VdVQzRsl';
const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(msg, duration = 3000) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.style.cssText = `
            position:fixed; bottom:100px; left:50%;
            transform:translateX(-50%) translateY(20px);
            background:#1C1C1E; color:white; padding:12px 20px;
            border-radius:20px; font-size:0.85rem; font-weight:600;
            z-index:9999; opacity:0;
            transition:all 0.3s cubic-bezier(.16,1,.3,1);
            white-space:nowrap; pointer-events:none;
            box-shadow:0 4px 20px rgba(0,0,0,0.25);
            font-family:-apple-system,sans-serif;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, duration);
}

// ─────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────
let _currentUser = null;
let _isAdmin     = false;
let _profile     = null;
let _allPosts    = [];

async function _refreshSession() {
    const { data: { user } } = await sb.auth.getUser();
    _currentUser = user;
    if (user) {
        const { data: prof } = await sb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        _profile = prof;
        _isAdmin = prof?.role === 'admin';
    } else {
        _profile = null;
        _isAdmin = false;
    }
}

// ─────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────
function navHome() {
    document.getElementById('nav-home').classList.add('active');
    document.getElementById('nav-profile').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navProfil() {
    if (!_currentUser) { openAuthModal(); return; }
    document.getElementById('nav-profile').classList.add('active');
    document.getElementById('nav-home').classList.remove('active');
    openProfileModal();
}

// ─────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────
function openAuthModal()  { document.getElementById('auth-modal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('auth-modal').style.display = 'none'; }
function magicLinkGiris() { openAuthModal(); }

function switchAuthTab(tab) {
    const isGiris = tab === 'giris';
    document.getElementById('panel-giris').style.display = isGiris ? 'block' : 'none';
    document.getElementById('panel-kayit').style.display = isGiris ? 'none'  : 'block';
    document.getElementById('tab-giris').classList.toggle('active',  isGiris);
    document.getElementById('tab-kayit').classList.toggle('active', !isGiris);
    document.getElementById('auth-modal-title').textContent = isGiris ? 'Giriş Yap' : 'Kayıt Ol';
}

async function magicLinkGonder() {
    const email = document.getElementById('giris-email').value.trim();
    const kvkk  = document.getElementById('kvkk-giris').checked;
    if (!email || !email.includes('@')) { showToast('❌ Geçerli bir e-posta girin'); return; }
    if (!kvkk) { showToast('❌ Lütfen koşulları kabul edin'); return; }
    // Mevcut fonksiyonun altına bunu yapıştır:
const magicLinkGiris = magicLinkGonder;

    const btn = document.querySelector('#panel-giris .send-btn');
    btn.disabled = true; btn.textContent = 'Gönderiliyor...';

    const { error } = await sb.auth.signInWithOtp({
        email, options: { emailRedirectTo: window.location.origin }
    });
    btn.disabled = false; btn.textContent = '📧 Giriş Linki Gönder';
    if (error) showToast('❌ ' + error.message);
    else       showToast('📧 E-postanızı kontrol edin!', 5000);
}

async function kayitOl() {
    const email    = document.getElementById('kayit-email').value.trim();
    const isim     = document.getElementById('kayit-isim').value.trim();
    const sehir    = document.getElementById('kayit-sehir').value.trim();
    const uzmanlik = document.getElementById('kayit-uzmanlik').value;
    const kvkk     = document.getElementById('kvkk-kayit').checked;

    if (!email || !email.includes('@')) { showToast('❌ Geçerli bir e-posta girin'); return; }
    if (!isim)  { showToast('❌ İsminizi girin'); return; }
    if (!kvkk)  { showToast('❌ Lütfen koşulları kabul edin'); return; }

    const btn = document.querySelector('#panel-kayit .send-btn');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';

    const { error } = await sb.auth.signInWithOtp({
        email, options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
        showToast('❌ ' + error.message);
        btn.disabled = false; btn.textContent = '✅ Kayıt Ol & Link Gönder';
        return;
    }

    // Profil verisini magic link dönüşüne kadar sakla
    localStorage.setItem('pending_profile', JSON.stringify({ isim, sehir, uzmanlik, email }));
    btn.disabled = false; btn.textContent = '✅ Kayıt Ol & Link Gönder';
    showToast('📧 E-postanızı kontrol edin!', 6000);
}

function kvkkGoster() { document.getElementById('kvkk-modal').style.display = 'flex'; }

// ─────────────────────────────────────────
// PROFİL MODAL
// ─────────────────────────────────────────
async function openProfileModal() {
    document.getElementById('profile-modal').style.display = 'flex';
    await profilYukle();
}
function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('nav-profile').classList.remove('active');
    document.getElementById('nav-home').classList.add('active');
}

async function profilYukle() {
    const body = document.getElementById('profile-body');
    if (!_currentUser) {
        body.innerHTML = `<p style="text-align:center;color:#8E8E93;padding:20px;">Giriş yapılmamış.</p>`;
        return;
    }
    const u     = _profile;
    const isim  = u?.name || _currentUser.email?.split('@')[0] || '?';
    const sehir = u?.city || '—';
    const uzm   = u?.specialty || '—';
    const harf  = isim[0].toUpperCase();

    const { data: posts } = await sb
        .from('posts')
        .select('id, content, category, created_at')
        .eq('user_id', _currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

    const postCount = posts?.length || 0;

    body.innerHTML = `
        <div class="profile-card">
            <div class="profile-av">${harf}</div>
            <div class="profile-name">
                ${isim}
                ${_isAdmin ? '<span class="verified-badge">Onaylı Uzman</span>' : ''}
            </div>
            <div class="profile-meta">
                ${sehir !== '—' ? '📍 ' + sehir : ''}
                ${uzm   !== '—' ? ' · 🌿 ' + uzm : ''}
            </div>
        </div>
        <div class="profile-stats">
            <div style="text-align:center">
                <div class="pstat-n">${postCount}</div>
                <div class="pstat-l">Soru</div>
            </div>
            <div style="text-align:center">
                <div class="pstat-n">${_isAdmin ? '✓' : '—'}</div>
                <div class="pstat-l">Uzman</div>
            </div>
        </div>
        ${posts && posts.length > 0 ? `
            <div class="profile-section-title">Son Sorularım</div>
            ${posts.map(p => `
                <div class="profile-q-item">
                    <p>${p.content.length > 60 ? p.content.substring(0,60) + '…' : p.content}</p>
                    <span># ${p.category.toUpperCase()} · ${zamanFormatla(p.created_at)}</span>
                </div>
            `).join('')}
        ` : `<p style="text-align:center;color:#8E8E93;font-size:0.85rem;padding:10px 0;">Henüz soru sormadınız.</p>`}
        <button class="profile-logout" onclick="cikisYap()">🚪 Çıkış Yap</button>
    `;
}

// ─────────────────────────────────────────
// OTURUM
// ─────────────────────────────────────────
function oturumKontrol() {
    const el = document.getElementById('user-status');
    if (_currentUser) {
        const isim = _profile?.name || _currentUser.email?.split('@')[0] || 'Hesap';
        el.innerHTML = `<button onclick="navProfil()" class="auth-btn">${isim.split(' ')[0]}</button>`;
    } else {
        el.innerHTML = `<button onclick="openAuthModal()" class="auth-btn">Giriş Yap</button>`;
    }
}

async function cikisYap() {
    await sb.auth.signOut();
    _currentUser = null; _isAdmin = false; _profile = null;
    closeProfileModal();
    oturumKontrol();
    showToast('👋 Çıkış yapıldı');
    sorulariYukle();
}

// ─────────────────────────────────────────
// HAL BORSASI
// ─────────────────────────────────────────
const FALLBACK_PRICES = [
    { product_name: 'Domates',   price: '28.50' },
    { product_name: 'Biber',     price: '42.00' },
    { product_name: 'Salatalık', price: '18.20' },
    { product_name: 'Patlıcan',  price: '22.00' },
    { product_name: 'Kabak',     price: '15.50' },
];

async function halFiyatlariniYukle() {
    const container = document.getElementById('price-list');
    const timeEl    = document.getElementById('market-time');

    try {
        const { data, error } = await sb.from('market_prices').select('*').order('product_name');
        const prices = (!error && data && data.length > 0) ? data : FALLBACK_PRICES;

        container.innerHTML = prices.map(i => {
            const trend = i.trend;  // 'up' | 'down' | undefined
            const trendHtml = trend === 'up'
                ? '<span class="price-trend-up">▲</span>'
                : trend === 'down'
                ? '<span class="price-trend-down">▼</span>'
                : '';
            return `
                <div class="price-pill">
                    <span>${i.product_name}</span>
                    <strong>₺${parseFloat(i.price).toFixed(2)}</strong>
                    ${trendHtml}
                </div>`;
        }).join('');

        // Son güncelleme saati
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = `Güncellendi: ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
    } catch {
        container.innerHTML = FALLBACK_PRICES
            .map(i => `<div class="price-pill"><span>${i.product_name}</span><strong>₺${i.price}</strong></div>`)
            .join('');
    }
}

// ─────────────────────────────────────────
// ACİL UYARI
// ─────────────────────────────────────────
async function acilUyariYukle() {
    const box = document.getElementById('emergency-alert');
    try {
        const { data } = await sb.from('alerts').select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1).single();
        if (data) {
            box.querySelector('.alert-text').innerHTML = `<strong>${data.title}:</strong> ${data.message}`;
            box.style.display = 'flex';
        } else {
            box.style.display = 'none';
        }
    } catch { box.style.display = 'none'; }
}

// ─────────────────────────────────────────
// REKLAM BANNER — profesyonel native görünüm
// ─────────────────────────────────────────
let _adLink = null;

async function reklamYukle() {
    try {
        const { data } = await sb.from('ads')
            .select('*').eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1).single();

        if (!data) return;

        _adLink = data.link || null;
        const banner = document.getElementById('ad-banner');
        document.getElementById('ad-icon').textContent  = data.emoji || '🌱';
        document.getElementById('ad-title').textContent = data.title || '—';
        document.getElementById('ad-desc').textContent  = data.description || '';
        banner.style.display = 'block';

        // Gösterim sayısını artır
        await sb.from('ads').update({ views: (data.views || 0) + 1 }).eq('id', data.id);
    } catch { /* tablo yoksa sessiz geç */ }
}

async function adBannerTikla() {
    // Tıklanma sayısını artır
    try {
        const { data } = await sb.from('ads').select('id, clicks')
            .eq('is_active', true).limit(1).single();
        if (data) await sb.from('ads').update({ clicks: (data.clicks || 0) + 1 }).eq('id', data.id);
    } catch {}
    if (_adLink) window.open(_adLink, '_blank');
}

// ─────────────────────────────────────────
// ARAMA
// ─────────────────────────────────────────
function aramaYap(deger) {
    document.getElementById('search-clear').style.display = deger ? 'flex' : 'none';
    const q = deger.toLowerCase().trim();
    const container = document.getElementById('feed-container');
    container.querySelector('.no-result')?.remove();

    if (!q) {
        container.querySelectorAll('.q-card').forEach(c => c.classList.remove('hidden'));
        return;
    }

    let gorunen = 0;
    container.querySelectorAll('.q-card').forEach(card => {
        const icerik   = (card.dataset.content  || '').toLowerCase();
        const kategori = (card.dataset.category || '').toLowerCase();
        const eslesti  = icerik.includes(q) || kategori.includes(q);
        card.classList.toggle('hidden', !eslesti);
        if (eslesti) gorunen++;
    });

    if (gorunen === 0) {
        container.insertAdjacentHTML('beforeend', `
            <div class="no-result">
                <div class="no-result-icon">🔍</div>
                <div class="no-result-text">"${deger}" için sonuç bulunamadı</div>
            </div>`);
    }
}

function aramayiTemizle() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').style.display = 'none';
    aramaYap('');
}

// ─────────────────────────────────────────
// SORU MODAL
// ─────────────────────────────────────────
function openAskModal() {
    if (!_currentUser) { openAuthModal(); return; }
    document.getElementById('ask-modal').style.display = 'flex';
}
function closeAskModal() { document.getElementById('ask-modal').style.display = 'none'; }

function updateFileLabel() {
    if (document.getElementById('photo-upload').files[0])
        document.getElementById('file-btn').innerText = '✅ Fotoğraf Hazır';
}

// ─────────────────────────────────────────
// SORU GÖNDER
// ─────────────────────────────────────────
async function soruGonder() {
    if (!_currentUser) { openAuthModal(); return; }

    const btn   = document.getElementById('submit-btn');
    const input = document.getElementById('question-input');
    const file  = document.getElementById('photo-upload').files[0];
    const cat   = document.querySelector('input[name="category"]:checked').value;

    if (!input.value.trim()) { showToast('❌ Lütfen sorunuzu yazın'); return; }

    btn.disabled = true; btn.innerText = 'Gönderiliyor...';

    try {
        let imgUrl = null;
        if (file) {
            if (file.size > 5 * 1024 * 1024) { showToast('❌ Fotoğraf 5MB\'dan küçük olmalı'); return; }
            const fName = `${_currentUser.id}/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
            const { error: upErr } = await sb.storage.from('soru-fotograflari').upload(fName, file);
            if (upErr) throw upErr;
            imgUrl = sb.storage.from('soru-fotograflari').getPublicUrl(fName).data.publicUrl;
        }

        const { data, error } = await sb.from('posts').insert([{
            content:   input.value.trim(),
            category:  cat,
            image_url: imgUrl,
            user_id:   _currentUser.id
        }]).select().single();

        if (error) throw error;

        await ekranaBas(data, true);
        closeAskModal();
        input.value = '';
        document.getElementById('photo-upload').value = '';
        document.getElementById('file-btn').innerText = '📸 Fotoğraf Ekle';
        showToast('✅ Sorunuz uzmanlarımıza iletildi!');

    } catch (e) { showToast('❌ Hata: ' + e.message); }
    finally { btn.disabled = false; btn.innerText = 'Uzmana Gönder'; }
}

// ─────────────────────────────────────────
// KART RENDER
// ─────────────────────────────────────────
async function ekranaBas(post, basaEkle = false) {
    const safe = post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Yazar bilgilerini lazy çek
    let authorName  = post.author_name || '';
    let authorRole  = post.author_role || '';
    let authorSehir = post.author_city || '';

    if (!authorName && post.user_id) {
        const { data: prof } = await sb
            .from('profiles').select('name, role, city')
            .eq('id', post.user_id).single();
        authorName  = prof?.name  || 'Kullanıcı';
        authorRole  = prof?.role  || '';
        authorSehir = prof?.city  || '';
    }

    const isVerified = authorRole === 'admin';
    const harf       = (authorName || '?')[0].toUpperCase();

    // Kullanıcı daha önce oy verdi mi?
    const zatenOyladi = _currentUser
        ? (post.vote_user_ids || []).includes(_currentUser.id)
        : false;

    const html = `
        <div class="q-card"
            id="card-${post.id}"
            data-content="${safe.toLowerCase()}"
            data-category="${post.category.toLowerCase()}"
        >
            <div class="q-card-header">
                <div class="q-author-av">${harf}</div>
                <div>
                    <div class="q-author-name">
                        ${authorName}
                        ${isVerified ? '<span class="verified-badge">Onaylı Uzman</span>' : ''}
                    </div>
                    <div class="q-author-meta">
                        ${authorSehir ? '📍 ' + authorSehir + ' · ' : ''}${zamanFormatla(post.created_at)}
                    </div>
                </div>
            </div>

            <span class="q-tag"># ${post.category.toUpperCase()}</span>
            <p style="margin:12px 0 0; line-height:1.55; font-size:0.95rem;">${safe}</p>

            ${post.image_url
                ? `<img src="${post.image_url}" class="q-img" loading="lazy" alt="Soru görseli">`
                : ''
            }

            ${post.admin_reply
                ? `<div class="reply-area">
                       <div class="reply-header">
                           <span>🌱</span>
                           <span class="reply-author">Uzman Yanıtı</span>
                           <span class="verified-badge">Onaylı Uzman</span>
                       </div>
                       <div>${post.admin_reply.replace(/</g, '&lt;')}</div>
                       <div class="vote-row">
                           <button
                               class="vote-btn ${zatenOyladi ? 'voted' : ''}"
                               id="vote-${post.id}"
                               onclick="cevapOyla('${post.id}', this)"
                           >
                               👍 Faydalı
                               <span id="vote-count-${post.id}">${post.reply_votes || 0}</span>
                           </button>
                       </div>
                   </div>`
                : `<div style="font-size:0.7rem; color:#8E8E93; margin-top:12px;">
                       ⏳ Uzman onayı bekleniyor...
                   </div>`
            }

            <!-- Sadece admin cevap yazabilir -->
            ${_isAdmin ? `
                <div class="admin-box">
                    <textarea
                        id="reply-${post.id}"
                        placeholder="Cevabınızı yazın..."
                        style="height:70px; margin:0 0 10px;"
                    >${post.admin_reply || ''}</textarea>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button onclick="cevapGonder('${post.id}')" class="auth-btn">
                            ✅ Cevapla
                        </button>
                        <button onclick="soruSil('${post.id}')" class="delete-btn">
                            🗑️ Soruyu Sil
                        </button>
                    </div>
                </div>` : ''
            }
        </div>`;

    const container = document.getElementById('feed-container');
    if (basaEkle) container.insertAdjacentHTML('afterbegin', html);
    else          container.insertAdjacentHTML('beforeend', html);
}

// ─────────────────────────────────────────
// CEVAP OYLAMA — sadece giriş yapmış kullanıcılar
// ─────────────────────────────────────────
async function cevapOyla(postId, btn) {
    if (!_currentUser) { showToast('❌ Oy vermek için giriş yapın'); return; }

    const { data: post } = await sb.from('posts')
        .select('reply_votes, vote_user_ids').eq('id', postId).single();

    const oyListesi   = post?.vote_user_ids || [];
    const zatenOyladi = oyListesi.includes(_currentUser.id);

    if (zatenOyladi) { showToast('Zaten oy verdiniz!'); return; }

    const yeniOy    = (post?.reply_votes || 0) + 1;
    const yeniListe = [...oyListesi, _currentUser.id];

    const { error } = await sb.from('posts').update({
        reply_votes:   yeniOy,
        vote_user_ids: yeniListe
    }).eq('id', postId);

    if (!error) {
        btn.classList.add('voted');
        const sayac = document.getElementById(`vote-count-${postId}`);
        if (sayac) sayac.textContent = yeniOy;
        showToast('👍 Teşekkürler!');
    }
}

// ─────────────────────────────────────────
// ADMIN CEVAP — sadece admin yazabilir
// ─────────────────────────────────────────
async function cevapGonder(id) {
    if (!_isAdmin) { showToast('⛔ Yetkiniz yok'); return; }

    const textarea = document.getElementById(`reply-${id}`);
    const txt      = textarea?.value?.trim();
    if (!txt) { showToast('❌ Cevap boş olamaz'); return; }

    const btn     = textarea.nextElementSibling.querySelector('.auth-btn');
    btn.disabled  = true; btn.innerText = 'Gönderiliyor...';

    const { error } = await sb.from('posts')
        .update({ admin_reply: txt, is_answered: true }).eq('id', id);

    if (error) {
        showToast('❌ ' + error.message);
    } else {
        showToast('✅ Cevap gönderildi!');
        const card    = document.getElementById(`card-${id}`);
        const bekleEl = card?.querySelector('[style*="Uzman onayı"]');
        const replyEl = card?.querySelector('.reply-area');
        const yeniHTML = `
            <div class="reply-area">
                <div class="reply-header">
                    <span>🌱</span>
                    <span class="reply-author">Uzman Yanıtı</span>
                    <span class="verified-badge">Onaylı Uzman</span>
                </div>
                <div>${txt.replace(/</g, '&lt;')}</div>
                <div class="vote-row">
                    <button class="vote-btn" id="vote-${id}" onclick="cevapOyla('${id}', this)">
                        👍 Faydalı <span id="vote-count-${id}">0</span>
                    </button>
                </div>
            </div>`;
        if (replyEl)      replyEl.outerHTML  = yeniHTML;
        else if (bekleEl) bekleEl.outerHTML  = yeniHTML;
    }
    btn.disabled = false; btn.innerText = '✅ Cevapla';
}

// ─────────────────────────────────────────
// ADMIN SORU SİL
// ─────────────────────────────────────────
async function soruSil(id) {
    if (!_isAdmin) { showToast('⛔ Yetkiniz yok'); return; }
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;

    const { error } = await sb.from('posts').delete().eq('id', id);

    if (error) {
        showToast('❌ Silinemedi: ' + error.message);
    } else {
        // DOM'dan kaldır — reload yok
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity    = '0';
            card.style.transform  = 'scale(0.97)';
            setTimeout(() => card.remove(), 300);
        }
        showToast('🗑️ Soru silindi');
    }
}

// ─────────────────────────────────────────
// SORULARI YÜKLE — mahremiyet + admin kontrolü
// ─────────────────────────────────────────
async function sorulariYukle() {
    const container = document.getElementById('feed-container');
    container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#8E8E93;">
            <div style="font-size:1.5rem; margin-bottom:8px;">🌱</div>
            <div style="font-size:0.85rem;">Sorular yükleniyor...</div>
        </div>`;

    try {
        let query = sb.from('posts').select('*').order('created_at', { ascending: false });

        // MAHREMİYET KONTROLÜ:
        // - Admin değilse → sadece kendi soruları
        // - Admin ise    → tüm sorular
        if (_currentUser && !_isAdmin) {
            query = query.eq('user_id', _currentUser.id);
        } else if (!_currentUser) {
            // Giriş yapılmamışsa feed boş göster
            container.innerHTML = `
                <div style="text-align:center; padding:50px 20px; color:#8E8E93;">
                    <div style="font-size:2rem; margin-bottom:10px;">🌾</div>
                    <div style="font-weight:700; margin-bottom:8px;">+1 Tarım'a Hoş Geldiniz</div>
                    <div style="font-size:0.85rem; margin-bottom:20px;">Sorularınızı görmek için giriş yapın.</div>
                    <button onclick="openAuthModal()" style="
                        background:#2D5A27; color:white; border:none;
                        padding:12px 28px; border-radius:20px;
                        font-size:0.9rem; font-weight:700; cursor:pointer;
                        font-family:-apple-system,sans-serif;
                    ">Giriş Yap / Kayıt Ol</button>
                </div>`;
            return;
        }

        const { data, error } = await query;
        if (error) throw error;

        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px 20px; color:#8E8E93;">
                    <div style="font-size:2rem; margin-bottom:10px;">🌾</div>
                    <div style="font-weight:700; margin-bottom:5px;">Henüz soru yok</div>
                    <div style="font-size:0.82rem;">İlk soruyu sen sor!</div>
                </div>`;
            return;
        }

        _allPosts = data;
        for (const p of data) {
            await ekranaBas(p, false);
        }

    } catch {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#8E8E93;">
                <div style="font-size:1.5rem; margin-bottom:8px;">⚠️</div>
                <div style="font-size:0.85rem;">Yüklenemedi. Tekrar deneyin.</div>
            </div>`;
    }
}

// ─────────────────────────────────────────
// YARDIMCI
// ─────────────────────────────────────────
function zamanFormatla(isoStr) {
    if (!isoStr) return '';
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60)    return 'Az önce';
    if (diff < 3600)  return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    return Math.floor(diff / 86400) + ' gün önce';
}

// ─────────────────────────────────────────
// BAŞLANGIÇ
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // Modal dışına tıklayınca kapat
    ['ask-modal', 'auth-modal', 'profile-modal', 'kvkk-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });

    await _refreshSession();
    oturumKontrol();
    halFiyatlariniYukle();
    acilUyariYukle();
    reklamYukle();
    sorulariYukle();

    // PWA Service Worker kaydı
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Magic link dönüşü + profil upsert
    sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, session);
    if (event === 'SIGNED_IN') {
        _currentUser = session.user;
        console.log('User ID:', _currentUser.id);

        const bekleyen = localStorage.getItem('pending_profile');
        const pd = bekleyen ? JSON.parse(bekleyen) : null;

        const upsertPayload = {
            id:        _currentUser.id,
            name:      pd?.isim     || _currentUser.email?.split('@')[0],
            city:      pd?.sehir    || null,
            specialty: pd?.uzmanlik || null,
            role:      'user'
        };
        console.log('Upsert payload:', upsertPayload);

        const { data, error } = await sb
            .from('profiles')
            .upsert(upsertPayload, { onConflict: 'id' });

        console.log('Upsert result:', data, 'Error:', error);

        if (error) {
            showToast('DB Hata: ' + error.message + ' | ' + error.code);
            return;
        }

        if (bekleyen) localStorage.removeItem('pending_profile');

        const { data: prof } = await sb
            .from('profiles').select('*')
            .eq('id', _currentUser.id).single();

        _profile = prof;
        _isAdmin = prof?.role === 'admin';

        oturumKontrol();
        sorulariYukle();
        closeAuthModal();
        showToast('✅ Giriş yapıldı!');
    }
});
        if (event === 'SIGNED_IN') {
            _currentUser = session.user;

            const bekleyen = localStorage.getItem('pending_profile');
            const pd       = bekleyen ? JSON.parse(bekleyen) : null;

            // UPSERT — duplicate key hatasını önler
            await sb.from('profiles').upsert({
                id:        _currentUser.id,
                name:      pd?.isim     || _profile?.name     || _currentUser.email?.split('@')[0],
                city:      pd?.sehir    || _profile?.city     || null,
                specialty: pd?.uzmanlik || _profile?.specialty || null,
                role:      _profile?.role || 'user'   // admin rolünü ezme
            }, { onConflict: 'id' });

            if (bekleyen) localStorage.removeItem('pending_profile');

            // Güncel profili çek
            const { data: prof } = await sb.from('profiles').select('*').eq('id', _currentUser.id).single();
            _profile = prof;
            _isAdmin = prof?.role === 'admin';

            oturumKontrol();
            sorulariYukle();
            closeAuthModal();
            showToast('✅ Giriş yapıldı!');
        }

        if (event === 'SIGNED_OUT') {
            _currentUser = null; _isAdmin = false; _profile = null;
            oturumKontrol();
            sorulariYukle();
        }
    });
});

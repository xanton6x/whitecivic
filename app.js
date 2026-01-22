import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, update, get, remove, onValue, set, onDisconnect } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAexYNdpzOgbji6Se7XCdeNBdQfn_LG0LQ", 
    authDomain: "whitecivic-21e7f.firebaseapp.com", 
    databaseURL: "https://whitecivic-21e7f-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "whitecivic-21e7f" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const q = new URLSearchParams(window.location.search);
const profileId = q.get('user');
const SUPER_ADMIN = "anton";
let currentUser = null;

// --- HELPERS ---
const clean = (e) => e ? e.split('@')[0] : "";
const toEmail = (n) => `${n.toLowerCase().trim()}@carmeet.com`;

// --- פונקציית התראות (TOASTS) ---
window.showToast = (msg) => {
    const container = document.getElementById('toast-container');
    if (!container) return; // הגנה למקרה ששכחת להוסיף ל-HTML
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

onAuthStateChanged(auth, (u) => {
    if (u) {
        currentUser = u;
        const myId = btoa(clean(u.email).toLowerCase());
        set(ref(db, 'status/' + myId), { state: 'online' });
        onDisconnect(ref(db, 'status/' + myId)).set({ state: 'offline' });
        document.getElementById('userNav').classList.remove('hidden');
        document.getElementById('guestNav').classList.add('hidden');
        document.getElementById('usersToggleBtn').classList.remove('hidden');
        
        // הצגת כפתור עריכת תמונה רק אם אני בפרופיל של עצמי
        if (profileId === myId) {
            const editBtn = document.getElementById('editAvBtn');
            if (editBtn) editBtn.classList.remove('hidden');
        }
    }
    if (profileId) loadProfileInfo();
});

// --- AUTH ---
window.openModal = (m) => { 
    window.authMode = m; 
    document.getElementById('modalTitle').innerText = (m === 'login' ? 'כניסה' : 'הרשמה');
    document.getElementById('modalError').style.display = 'none';
    document.getElementById('authModal').style.display='flex'; 
};

window.closeModal = () => document.getElementById('authModal').style.display='none';

document.getElementById('authDo').onclick = async () => {
    const u = document.getElementById('uName').value.trim();
    const p = document.getElementById('uPass').value;
    const err = document.getElementById('modalError');
    if (!u || !p) { err.innerText = "נא למלא את כל השדות"; err.style.display='block'; return; }
    
    try {
        if(window.authMode === 'login') {
            await signInWithEmailAndPassword(auth, toEmail(u), p);
            location.reload();
        } else {
            const check = await get(ref(db, 'users/' + btoa(u.toLowerCase())));
            if (check.exists()) { err.innerText = "שם המשתמש תפוס"; err.style.display='block'; return; }
            await createUserWithEmailAndPassword(auth, toEmail(u), p);
            const role = (u.toLowerCase() === SUPER_ADMIN) ? 'admin' : 'user';
            await set(ref(db, 'users/' + btoa(u.toLowerCase())), { username: u, role: role, avatar: "", ratingTotal: 0, ratingCount: 0 });
            location.reload();
        }
    } catch(e) { err.innerText = "שגיאה בחיבור למערכת"; err.style.display='block'; }
};

// --- FEED ---
document.getElementById('sendPost').onclick = async () => {
    if(!currentUser) return window.openModal('login');
    const txt = document.getElementById('postInp').value;
    const imgPreview = document.getElementById('imgPreview');
    const img = imgPreview.src;
    if(!txt && imgPreview.style.display !== 'block') return;

    push(ref(db, 'feed'), {
        from: clean(currentUser.email),
        toId: profileId || 'public',
        text: txt,
        image: img.startsWith('data') ? img : null,
        time: Date.now()
    });
    document.getElementById('postInp').value = "";
    imgPreview.style.display = 'none';
    window.showToast("הפוסט פורסם בהצלחה! 🏎️");
};

onChildAdded(ref(db, 'feed'), (snap) => {
    const d = snap.val(), id = snap.key;
    if (profileId && d.toId !== profileId && btoa(d.from.toLowerCase()) !== profileId) return;

    const card = document.createElement('div');
    card.className = 'card';
    onValue(ref(db, `feed/${id}`), s => {
        if(!s.exists()) { card.remove(); return; }
        const u = s.val();
        const isAdmin = currentUser && clean(currentUser.email).toLowerCase() === SUPER_ADMIN;
        const isOwner = currentUser && clean(currentUser.email) === u.from;

        // חפש את החלק הזה בתוך ה-onChildAdded והחלף אותו:
card.innerHTML = `
    <div class="feed-meta">
        <b onclick="location.href='?user=${btoa(u.from.toLowerCase())}'">${u.from}</b>
        <span class="post-time">${new Date(u.time).toLocaleString('he-IL')}</span>
    </div>
    ${(isAdmin || isOwner) ? `<span style="position:absolute; left:15px; top:15px; cursor:pointer; color:#ff3b30; font-size:11px;" onclick="deletePost('${id}')">מחיקה</span>` : ''}
    <div style="white-space:pre-wrap;">${u.text}</div>
    ${u.image ? `<img src="${u.image}" class="card-image">` : ''}
    <div style="margin-top:10px; display:flex; gap:15px; font-size:13px; color:var(--cm-gray);">
        <span style="cursor:pointer" onclick="toggleLike('${id}')">❤️ ${u.likes?Object.keys(u.likes).length:0}</span>
    </div>
    <div id="coms-${id}" style="margin-top:10px;"></div>
    
    <div class="comment-wrapper">
        <input type="text" 
               class="comment-input" 
               placeholder="הוסף תגובה..." 
               id="inp-${id}" 
               onkeypress="if(event.key==='Enter') addComment('${id}', this)">
        <button class="send-comment-btn" 
                onclick="const el = document.getElementById('inp-${id}'); addComment('${id}', el)">
                ➤
        </button>
    </div>
`;
    });
    document.getElementById('board').prepend(card);
});

// --- GLOBAL FUNCTIONS ---
window.deletePost = (id) => {
    if (confirm('למחוק את הפוסט?')) {
        remove(ref(db, `feed/${id}`));
        window.showToast("הפוסט נמחק");
    }
};

window.toggleLike = async (id) => {
    if(!currentUser) return window.openModal('login');
    const myId = btoa(clean(currentUser.email).toLowerCase());
    const r = ref(db, `feed/${id}/likes/${myId}`);
    const s = await get(r);
    s.exists() ? remove(r) : set(r, true);
    window.showToast(s.exists() ? "הלייק הוסר" : "נתת לייק! ❤️");
};

window.addComment = (pid, inp) => {
    if(!currentUser || !inp.value.trim()) return;
    push(ref(db, `feed/${pid}/comments`), { from: clean(currentUser.email), text: inp.value.trim() });
    inp.value = "";
    window.showToast("תגובה נוספה");
};

window.toggleUsers = () => { 
    const p = document.getElementById('usersPopup'); 
    p.style.display = p.style.display==='flex'?'none':'flex'; 
};

window.goMyProfile = () => {
    if(currentUser) location.href = '?user=' + btoa(clean(currentUser.email).toLowerCase());
};

function loadComments(pid) {
    onValue(ref(db, `feed/${pid}/comments`), snap => {
        const box = document.getElementById(`coms-${pid}`); if(!box) return; box.innerHTML = "";
        snap.forEach(c => { const m = c.val(); box.innerHTML += `<div class="comment"><b>${m.from}:</b> ${m.text}</div>`; });
    });
}

async function loadProfileInfo() {
    document.getElementById('profileHeader').classList.remove('hidden');
    onValue(ref(db, 'users/' + profileId), (s) => {
        if(!s.exists()) return;
        const d = s.val();
        document.getElementById('pName').innerText = d.username;
        document.getElementById('pAvatar').src = d.avatar || `https://ui-avatars.com/api/?name=${d.username}&background=random&color=fff`;
        document.getElementById('pBadge').innerHTML = d.role === 'admin' ? '⭐' : '';
        const avg = d.ratingCount ? (d.ratingTotal / d.ratingCount).toFixed(1) : "0.0";
        document.getElementById('ratingValue').innerText = `דירוג: ${avg} (${d.ratingCount || 0})`;
        renderStars(avg);
    });
}

function renderStars(currentAvg) {
    const box = document.getElementById('ratingDisplay'); box.innerHTML = "";
    for(let i=1; i<=5; i++) {
        const s = document.createElement('span');
        s.innerHTML = i <= Math.round(currentAvg) ? "★" : "☆";
        s.onclick = () => rateUser(i);
        box.appendChild(s);
    }
}

async function rateUser(score) {
    if(!currentUser) return window.openModal('login');
    const myId = btoa(clean(currentUser.email).toLowerCase());
    if(myId === profileId) return;
    const rRef = ref(db, `users/${profileId}/ratings/${myId}`);
    const snap = await get(rRef);
    if(snap.exists()) return window.showToast("כבר דירגת משתמש זה");
    const uSnap = await get(ref(db, `users/${profileId}`));
    const d = uSnap.val();
    await update(ref(db, `users/${profileId}`), { ratingTotal: (d.ratingTotal || 0) + score, ratingCount: (d.ratingCount || 0) + 1 });
    await set(rRef, score);
    window.showToast("תודה על הדירוג! ⭐");
}

// --- עדכון תמונת פרופיל ---
document.getElementById('fileInp').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const base64Img = ev.target.result;
        const myId = btoa(clean(currentUser.email).toLowerCase());
        try {
            await update(ref(db, 'users/' + myId), { avatar: base64Img });
            document.getElementById('pAvatar').src = base64Img;
            window.showToast("התמונה עודכנה בהצלחה! ✨");
        } catch (err) {
            window.showToast("שגיאה בעדכון התמונה");
        }
    };
    reader.readAsDataURL(file);
};

onValue(ref(db, 'users'), snap => {
    const list = document.getElementById('globalUsersList');
    if(!list) return;
    list.innerHTML = "";
    snap.forEach(c => {
        const u = c.val(), id = c.key;
        const div = document.createElement('div');
        div.className = 'user-item';
        div.onclick = () => location.href = `?user=${id}`;
        div.innerHTML = `
            <img src="${u.avatar || 'https://ui-avatars.com/api/?name='+u.username}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;">
            <div id="dot-${id}" class="status-dot"></div>
            <span>${u.username}</span>
        `;
        list.appendChild(div);
        
        onValue(ref(db, 'status/'+id), s => {
            const dot = document.getElementById('dot-'+id);
            if(dot) dot.className = (s.exists() && s.val().state==='online') ? 'status-dot online' : 'status-dot';
        });
    });
});

document.getElementById('logoutBtn').onclick = () => signOut(auth).then(()=>location.href='index.html');

// תצוגה מקדימה לתמונה בפוסט
document.getElementById('postImgInp').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('imgPreview');
        preview.src = ev.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

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

// Helpers
const clean = (e) => e ? e.split('@')[0] : "";
const toEmail = (n) => `${n.toLowerCase().trim()}@carmeet.com`;

onAuthStateChanged(auth, (u) => {
    if (u) {
        currentUser = u;
        const myId = btoa(clean(u.email).toLowerCase());
        set(ref(db, 'status/' + myId), { state: 'online' });
        onDisconnect(ref(db, 'status/' + myId)).set({ state: 'offline' });
        document.getElementById('userNav').classList.remove('hidden');
        document.getElementById('guestNav').classList.add('hidden');
        document.getElementById('usersToggleBtn').classList.remove('hidden');
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
    if(!txt && !imgPreview.style.display === 'block') return;

    push(ref(db, 'feed'), {
        from: clean(currentUser.email),
        toId: profileId || 'public',
        text: txt,
        image: img.startsWith('data') ? img : null,
        time: Date.now()
    });
    document.getElementById('postInp').value = "";
    imgPreview.style.display = 'none';
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
            <input type="text" class="comment-input" placeholder="הוסף תגובה..." onkeypress="if(event.key==='Enter') addComment('${id}', this)">
        `;
        loadComments(id);
    });
    document.getElementById('board').prepend(card);
});

// --- GLOBAL FUNCTIONS ---
window.deletePost = (id) => confirm('למחוק?') && remove(ref(db, `feed/${id}`));

window.toggleLike = async (id) => {
    if(!currentUser) return window.openModal('login');
    const myId = btoa(clean(currentUser.email).toLowerCase());
    const r = ref(db, `feed/${id}/likes/${myId}`);
    const s = await get(r);
    s.exists() ? remove(r) : set(r, true);
};

window.addComment = (pid, inp) => {
    if(!currentUser || !inp.value.trim()) return;
    push(ref(db, `feed/${pid}/comments`), { from: clean(currentUser.email), text: inp.value.trim() });
    inp.value = "";
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
    if(snap.exists()) return;
    const uSnap = await get(ref(db, `users/${profileId}`));
    const d = uSnap.val();
    await update(ref(db, `users/${profileId}`), { ratingTotal: (d.ratingTotal || 0) + score, ratingCount: (d.ratingCount || 0) + 1 });
    await set(rRef, score);
}

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

// תצוגה מקדימה לתמונה
document.getElementById('postImgInp').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('imgPreview');
        preview.src = ev.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

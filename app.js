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

const clean = (e) => e ? e.split('@')[0] : "";
const toEmail = (n) => `${n.toLowerCase().trim()}@carmeet.com`;

// --- TOASTS ---
window.showToast = (msg) => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
};

// --- AUTH ---
onAuthStateChanged(auth, (u) => {
    if (u) {
        currentUser = u;
        const myId = btoa(clean(u.email).toLowerCase());
        set(ref(db, 'status/' + myId), { state: 'online' });
        onDisconnect(ref(db, 'status/' + myId)).set({ state: 'offline' });
        
        if(document.getElementById('userNav')) document.getElementById('userNav').classList.remove('hidden');
        if(document.getElementById('guestNav')) document.getElementById('guestNav').classList.add('hidden');
        if(document.getElementById('usersToggleBtn')) document.getElementById('usersToggleBtn').classList.remove('hidden');
    }
    if (profileId) loadProfileInfo();
});

// --- FEED ---
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
        const comCount = u.comments ? Object.keys(u.comments).length : 0;

        card.innerHTML = `
            <div class="feed-meta">
                <b style="cursor:pointer" onclick="location.href='?user=${btoa(u.from.toLowerCase())}'">${u.from}</b>
                <span class="post-time">${new Date(u.time).toLocaleString('he-IL')}</span>
            </div>
            ${(isAdmin || isOwner) ? `<span style="position:absolute; left:15px; top:15px; cursor:pointer; color:#ff3b30; font-size:11px;" onclick="deletePost('${id}')">מחיקה</span>` : ''}
            
            <div style="white-space:pre-wrap; margin-bottom:10px;">${u.text}</div>
            ${u.image ? `<img src="${u.image}" class="card-image">` : ''}
            
            <div style="margin-top:10px; display:flex; gap:15px; font-size:13px; color:var(--cm-gray); border-bottom:1px solid #333; padding-bottom:5px; align-items:center;">
                <span style="cursor:pointer" onclick="toggleLike('${id}')">❤️ ${u.likes?Object.keys(u.likes).length:0}</span>
                <span style="cursor:pointer; color:var(--cm-blue); font-weight:bold;" onclick="toggleCommentsDisplay('${id}')">
                    💬 ${comCount} תגובות (צפה)
                </span>
            </div>
            
            <div id="coms-${id}" class="comments-box"></div>
            
            <div class="comment-wrapper">
                <input type="text" class="comment-input" placeholder="תגובה..." id="inp-${id}" onkeypress="if(event.key==='Enter') addComment('${id}', this)">
                <button class="send-comment-btn" onclick="addComment('${id}', document.getElementById('inp-${id}'))">➤</button>
            </div>
        `;
        loadComments(id);
    });
    const board = document.getElementById('board');
    if(board) board.prepend(card);
});

// --- GLOBAL FUNCTIONS ---
window.toggleCommentsDisplay = (id) => {
    const box = document.getElementById(`coms-${id}`);
    if (box) box.classList.toggle('show');
};

window.deletePost = (id) => confirm('למחוק פוסט?') && remove(ref(db, `feed/${id}`));

window.deleteComment = (pid, cid) => confirm('למחוק תגובה?') && remove(ref(db, `feed/${pid}/comments/${cid}`));

window.addComment = (pid, inp) => {
    const val = inp.value.trim();
    if(!currentUser || !val) return;
    const box = document.getElementById(`coms-${pid}`);
    if(box) box.classList.add('show');
    push(ref(db, `feed/${pid}/comments`), { from: clean(currentUser.email), text: val });
    inp.value = "";
    window.showToast("תגובה נוספה");
};

window.toggleLike = async (id) => {
    if(!currentUser) return window.openModal('login');
    const myId = btoa(clean(currentUser.email).toLowerCase());
    const r = ref(db, `feed/${id}/likes/${myId}`);
    const s = await get(r);
    s.exists() ? remove(r) : set(r, true);
};

window.goMyProfile = () => {
    if(!currentUser) return window.openModal('login');
    location.href = '?user=' + btoa(clean(currentUser.email).toLowerCase());
};

window.toggleUsers = () => {
    const p = document.getElementById('usersPopup');
    if(p) p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
};

// --- LOADER ---
async function loadComments(pid) {
    onValue(ref(db, `feed/${pid}/comments`), async snap => {
        const box = document.getElementById(`coms-${pid}`);
        if(!box) return; box.innerHTML = "";
        if (!snap.exists()) return;
        const promises = [];
        snap.forEach(c => {
            const m = c.val(), cid = c.key;
            const uid = btoa(m.from.toLowerCase());
            promises.push(get(ref(db, `users/${uid}`)).then(s => ({...m, cid, av: s.exists()?s.val().avatar:""})));
        });
        const data = await Promise.all(promises);
        data.forEach(m => {
            const av = m.av || `https://ui-avatars.com/api/?name=${m.from}`;
            const isAdmin = currentUser && clean(currentUser.email).toLowerCase() === SUPER_ADMIN;
            const isMyCom = currentUser && clean(currentUser.email) === m.from;
            box.innerHTML += `
                <div class="comment-item">
                    <img src="${av}" class="comment-avatar">
                    <div class="comment-content">
                        <div style="display:flex; justify-content:space-between;">
                            <b>${m.from}</b>
                            ${(isAdmin || isMyCom) ? `<span style="cursor:pointer; color:#ff3b30;" onclick="deleteComment('${pid}', '${m.cid}')">✖</span>` : ''}
                        </div>
                        <p>${m.text}</p>
                    </div>
                </div>`;
        });
    });
}

// --- USERS LIST ---
onValue(ref(db, 'users'), snap => {
    const list = document.getElementById('globalUsersList');
    if(!list) return; list.innerHTML = "";
    snap.forEach(c => {
        const u = c.val(), id = c.key;
        const div = document.createElement('div');
        div.className = 'user-item';
        div.onclick = () => location.href = `?user=${id}`;
        div.innerHTML = `
            <img src="${u.avatar || 'https://ui-avatars.com/api/?name='+u.username}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">
            <div id="dot-${id}" class="status-dot"></div>
            <span>${u.username}</span>
        `;
        list.appendChild(div);
    });
});

// --- AUTH MODAL ---
window.openModal = (m) => {
    window.authMode = m;
    document.getElementById('modalTitle').innerText = (m === 'login' ? 'כניסה' : 'הרשמה');
    document.getElementById('authModal').style.display = 'flex';
};
window.closeModal = () => document.getElementById('authModal').style.display = 'none';

document.getElementById('authDo').onclick = async () => {
    const u = document.getElementById('uName').value.trim();
    const p = document.getElementById('uPass').value;
    if (!u || !p) return alert("מלא פרטים");
    try {
        if(window.authMode === 'login') { await signInWithEmailAndPassword(auth, toEmail(u), p); }
        else {
            await createUserWithEmailAndPassword(auth, toEmail(u), p);
            await set(ref(db, 'users/' + btoa(u.toLowerCase())), { username: u, role: 'user', avatar: "", ratingTotal: 0, ratingCount: 0 });
        }
        location.reload();
    } catch(e) { alert("שגיאה בחיבור"); }
};

document.getElementById('logoutBtn').onclick = () => signOut(auth).then(()=>location.href='index.html');

document.getElementById('sendPost').onclick = async () => {
    if(!currentUser) return window.openModal('login');
    const txt = document.getElementById('postInp').value;
    const preview = document.getElementById('imgPreview');
    const img = preview.style.display === 'block' ? preview.src : null;
    push(ref(db, 'feed'), { from: clean(currentUser.email), toId: profileId || 'public', text: txt, image: img, time: Date.now() });
    document.getElementById('postInp').value = "";
    preview.style.display = 'none';
};

document.getElementById('postImgInp').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('imgPreview');
        preview.src = ev.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

async function loadProfileInfo() {
    onValue(ref(db, 'users/' + profileId), (s) => {
        if(!s.exists()) return;
        const d = s.val();
        if(document.getElementById('profileHeader')) document.getElementById('profileHeader').classList.remove('hidden');
        if(document.getElementById('pName')) document.getElementById('pName').innerText = d.username;
        if(document.getElementById('pAvatar')) document.getElementById('pAvatar').src = d.avatar || `https://ui-avatars.com/api/?name=${d.username}`;
    });
}

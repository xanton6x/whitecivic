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

// --- TOAST SYSTEM ---
window.showToast = (msg) => {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
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
    }
    if (profileId) loadProfileInfo();
});

// --- FEED LOGIC ---
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
                <b onclick="location.href='?user=${btoa(u.from.toLowerCase())}'">${u.from}</b>
                <span class="post-time">${new Date(u.time).toLocaleString('he-IL')}</span>
            </div>
            ${(isAdmin || isOwner) ? `<span style="position:absolute; left:15px; top:15px; cursor:pointer; color:#ff3b30; font-size:11px;" onclick="deletePost('${id}')">מחיקה</span>` : ''}
            <div style="white-space:pre-wrap;">${u.text}</div>
            ${u.image ? `<img src="${u.image}" class="card-image">` : ''}
            <div style="margin-top:10px; display:flex; gap:15px; font-size:13px; color:var(--cm-gray); border-bottom:1px solid #333; padding-bottom:10px;">
                <span style="cursor:pointer" onclick="toggleLike('${id}')">❤️ ${u.likes?Object.keys(u.likes).length:0}</span>
                <span>💬 ${comCount} תגובות</span>
            </div>
            <div id="coms-${id}" style="margin-top:10px;"></div>
            <div class="comment-wrapper">
                <input type="text" class="comment-input" placeholder="הוסף תגובה..." id="inp-${id}" onkeypress="if(event.key==='Enter') addComment('${id}', this)">
                <button class="send-comment-btn" onclick="addComment('${id}', document.getElementById('inp-${id}'))">➤</button>
            </div>
        `;
        loadComments(id);
    });
    document.getElementById('board').prepend(card);
});

async function loadComments(pid) {
    onValue(ref(db, `feed/${pid}/comments`), async snap => {
        const box = document.getElementById(`coms-${pid}`); if(!box) return; box.innerHTML = "";
        const promises = [];
        snap.forEach(c => {
            const m = c.val();
            const uid = btoa(m.from.toLowerCase());
            promises.push(get(ref(db, `users/${uid}`)).then(s => ({...m, av: s.exists()?s.val().avatar:""})));
        });
        const data = await Promise.all(promises);
        data.forEach(m => {
            const av = m.av || `https://ui-avatars.com/api/?name=${m.from}`;
            box.innerHTML += `
                <div class="comment-item">
                    <img src="${av}" class="comment-avatar">
                    <div class="comment-content"><b>${m.from}</b><p>${m.text}</p></div>
                </div>`;
        });
    });
}

window.addComment = (pid, inp) => {
    if(!currentUser || !inp.value.trim()) return;
    push(ref(db, `feed/${pid}/comments`), { from: clean(currentUser.email), text: inp.value.trim() });
    inp.value = "";
    window.showToast("תגובה פורסמה!");
};

window.toggleLike = async (id) => {
    if(!currentUser) return window.openModal('login');
    const myId = btoa(clean(currentUser.email).toLowerCase());
    const r = ref(db, `feed/${id}/likes/${myId}`);
    const s = await get(r);
    s.exists() ? remove(r) : set(r, true);
    window.showToast(s.exists() ? "לייק הוסר" : "נתת לייק! ❤️");
};

// --- שאר הפונקציות (Auth, Profile וכו') נשארות כפי שהיו ---
window.openModal = (m) => { window.authMode = m; document.getElementById('authModal').style.display='flex'; };
window.closeModal = () => document.getElementById('authModal').style.display='none';
document.getElementById('logoutBtn').onclick = () => signOut(auth).then(()=>location.href='index.html');
// ... (המשך הקוד המקורי שלך עבור העלאת תמונות ופרופיל)

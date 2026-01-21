import { ref, onValue, push, remove, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db, clean, SUPER_ADMIN } from "./config.js";

// פונקציה ראשית להפעלת הפיד
export function listenToFeed(boardId, profileId, currentUser) {
    const board = document.getElementById(boardId);
    onValue(ref(db, 'feed'), (snap) => {
        board.innerHTML = "";
        snap.forEach(child => {
            const d = child.val(), id = child.key;
            if (profileId && d.toId !== profileId && btoa(d.from.toLowerCase()) !== profileId) return;

            const isAdmin = currentUser && clean(currentUser.email).toLowerCase() === SUPER_ADMIN;
            const isOwner = currentUser && clean(currentUser.email) === d.from;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="feed-meta">
                    <b onclick="location.href='?user=${btoa(d.from.toLowerCase())}'">${d.from}</b>
                    ${isAdmin || isOwner ? `<span class="del-btn" style="color:#ff3b30; float:left; cursor:pointer; font-size:11px;">מחיקה</span>` : ''}
                </div>
                <div style="white-space:pre-wrap; margin:10px 0;">${d.text}</div>
                ${d.image ? `<img src="${d.image}" class="card-image">` : ''}
                <div style="margin-top:10px; border-top:1px solid #2c2c2e; padding-top:10px; display:flex; gap:15px;">
                    <span class="like-btn" style="cursor:pointer">❤️ ${d.likes ? Object.keys(d.likes).length : 0}</span>
                </div>
                <div class="comments-section" id="coms-${id}" style="margin-top:10px; font-size:13px;"></div>
                <input type="text" class="comment-input" placeholder="הוסף תגובה..." 
                       style="width:100%; background:#2c2c2e; border:none; color:white; padding:8px; border-radius:10px; margin-top:10px; outline:none;">
            `;

            // הפעלת לייקים
            card.querySelector('.like-btn').onclick = () => handleLike(id, currentUser);
            
            // הפעלת תגובות (Enter לשליחה)
            const input = card.querySelector('.comment-input');
            input.onkeypress = (e) => {
                if(e.key === 'Enter' && input.value.trim()) {
                    addComment(id, input.value.trim(), currentUser);
                    input.value = "";
                }
            };

            // טעינת תגובות בזמן אמת מה-DB
            loadComments(id, card.querySelector('.comments-section'));
            
            // הפעלת מחיקה
            if (isAdmin || isOwner) {
                card.querySelector('.del-btn').onclick = () => confirm("למחוק פוסט?") && remove(ref(db, `feed/${id}`));
            }

            board.prepend(card);
        });
    });
}

async function handleLike(postId, user) {
    if(!user) return window.openModal('login');
    const myId = btoa(clean(user.email).toLowerCase());
    const r = ref(db, `feed/${postId}/likes/${myId}`);
    const s = await get(r);
    s.exists() ? remove(r) : set(r, true);
}

function addComment(postId, text, user) {
    if(!user) return window.openModal('login');
    push(ref(db, `feed/${postId}/comments`), {
        from: clean(user.email),
        text: text,
        time: Date.now()
    });
}

function loadComments(postId, container) {
    onValue(ref(db, `feed/${postId}/comments`), (snap) => {
        container.innerHTML = "";
        snap.forEach(c => {
            const m = c.val();
            const div = document.createElement('div');
            div.style = "background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; margin-bottom: 4px;";
            div.innerHTML = `<b style="color:#007aff">${m.from}:</b> ${m.text}`;
            container.appendChild(div);
        });
    });
}

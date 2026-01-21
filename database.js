import { ref, onValue, push, remove, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db, clean, SUPER_ADMIN } from "./config.js";

// פונקציה לטעינת הפיד
export function listenToFeed(boardId, profileId, currentUser) {
    const board = document.getElementById(boardId);
    onValue(ref(db, 'feed'), (snap) => {
        board.innerHTML = "";
        snap.forEach(child => {
            const d = child.val(), id = child.key;
            // סינון לפי פרופיל (אם אנחנו בדף פרופיל)
            if (profileId && d.toId !== profileId && btoa(d.from.toLowerCase()) !== profileId) return;

            const isAdmin = currentUser && clean(currentUser.email).toLowerCase() === SUPER_ADMIN;
            const isOwner = currentUser && clean(currentUser.email) === d.from;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="feed-meta">
                    <b onclick="location.href='?user=${btoa(d.from.toLowerCase())}'">${d.from}</b>
                    ${isAdmin || isOwner ? `<span class="del-btn" data-id="${id}" style="color:red; float:left; cursor:pointer; font-size:12px;">מחיקה</span>` : ''}
                </div>
                <p>${d.text}</p>
                ${d.image ? `<img src="${d.image}" class="card-image">` : ''}
                <div style="margin-top:10px;">
                    <span class="like-btn" data-id="${id}" style="cursor:pointer">❤️ ${d.likes ? Object.keys(d.likes).length : 0}</span>
                </div>
            `;
            
            // אירוע לייק
            card.querySelector('.like-btn').onclick = () => handleLike(id, currentUser);
            // אירוע מחיקה
            if (isAdmin || isOwner) {
                card.querySelector('.del-btn').onclick = () => {
                    if(confirm("למחוק?")) remove(ref(db, `feed/${id}`));
                };
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

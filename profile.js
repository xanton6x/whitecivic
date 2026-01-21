import { ref, onValue, update, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db, clean } from "./config.js";

export function initProfile(profileId, currentUser) {
    onValue(ref(db, 'users/' + profileId), (s) => {
        if(!s.exists()) return;
        const d = s.val();
        document.getElementById('profileHeader').classList.remove('hidden');
        document.getElementById('pName').innerText = d.username;
        document.getElementById('pAvatar').src = d.avatar || `https://ui-avatars.com/api/?name=${d.username}`;
        
        const avg = d.ratingCount ? (d.ratingTotal / d.ratingCount).toFixed(1) : "0.0";
        document.getElementById('ratingValue').innerText = `דירוג: ${avg} (${d.ratingCount || 0})`;
        renderStars(avg, profileId, currentUser);
    });
}

function renderStars(avg, profileId, user) {
    const box = document.getElementById('ratingDisplay');
    box.innerHTML = "";
    for(let i=1; i<=5; i++) {
        const s = document.createElement('span');
        s.innerHTML = i <= Math.round(avg) ? "★" : "☆";
        s.onclick = () => {
            if(!user) return window.openModal('login');
            const myId = btoa(clean(user.email).toLowerCase());
            if(myId === profileId) return;
            update(ref(db, `users/${profileId}`), { 
                ratingTotal: (document.ratingTotal || 0) + i, 
                ratingCount: (document.ratingCount || 0) + 1 
            });
        };
        box.appendChild(s);
    }
}

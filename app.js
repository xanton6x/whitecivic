import { auth, clean } from "./config.js";
import { listenToFeed } from "./database.js";
import { loadProfile } from "./profile.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const q = new URLSearchParams(window.location.search);
const profileId = q.get('user');

onAuthStateChanged(auth, (user) => {
    // מפעיל את הפיד מה-Database
    listenToFeed('board', profileId, user);
    
    if (user) {
        document.getElementById('userNav').classList.remove('hidden');
        document.getElementById('guestNav').classList.add('hidden');
        if (profileId) initProfile(profileId, user);
    }
});

document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.href='index.html');
document.getElementById('profileBtn').onclick = () => {
    const user = auth.currentUser;
    if(user) location.href = '?user=' + btoa(clean(user.email).toLowerCase());
}

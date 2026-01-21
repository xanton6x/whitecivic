import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAexYNdpzOgbji6Se7XCdeNBdQfn_LG0LQ", 
    authDomain: "whitecivic-21e7f.firebaseapp.com", 
    databaseURL: "https://whitecivic-21e7f-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "whitecivic-21e7f" 
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const SUPER_ADMIN = "anton";
export const clean = (e) => e ? e.split('@')[0] : "";
 

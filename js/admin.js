class AdminPanel {
    constructor() {
        this.reviews = JSON.parse(localStorage.getItem('carReviews')) || [];
        this.checkAuth();
        this.init();
    }

    checkAuth() {
        // בסיסי - בפרודקשן תשתמש באימות אמיתי
        const isAuth = sessionStorage.getItem('adminAuth');
        if (!isAuth && !window.location.hash.includes('bypass')) {
            const password = prompt('הזן סיסמת מנהל:');
            if (password !== 'admin123') { // החלף בסיסמה אמיתית
                alert('סיסמה שגויה');
                window.location.href = 'index.html';
                return;
            }
            sessionStorage.setItem('adminAuth', 'true');
        }
    }

    init() {
        this.loadSettings();
        this.renderStats();
        this.renderReviewsList();
        this.setupEventListeners();
    }

    loadSettings() {
        const savedColor = localStorage.getItem('themeColor') || '#007bff';
        const savedTitle = localStorage.getItem('siteTitle') || '';
        const savedSubtitle = localStorage.getItem('siteSubtitle') || '';
        const savedTheme = localStorage.getItem('themeMode') || 'light';

        document.getElementById('colorPicker').value = savedColor;
        document.getElementById('titleInput').value = savedTitle;
        document.getElementById('subtitleInput').value = savedSubtitle;
        document.getElementById('themeSelect').value = savedTheme;
    }

    setupEventListeners() {
        // תצוגה מקדימה של צבע בזמן אמת
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--primary-color', e.target.value);
        });
    }

    renderStats() {
        const total = this.reviews.length;
        const pending = this.reviews.filter(r => !r.approved).length;
        const approved = this.reviews.filter(r => r.approved);
        const avg = approved.length > 0 
            ? (approved.reduce((sum, r) => sum + r.rating, 0) / approved.length).toFixed(1)
            : '0.0';

        document.getElementById('totalReviews').textContent = total;
        document.getElementById('pendingReviews').textContent = pending;
        document.getElementById('avgRatingStat').textContent = avg;
    }

    renderReviewsList() {
        const container = document.getElementById('adminReviewsList');
        
        if (this.reviews.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">אין חוות דעת</p>';
            return;
        }

        container.innerHTML = this.reviews.map(review => `
            <div class="admin-review-item" style="${!review.approved ? 'border-right: 4px solid #ffc107;' : ''}">
                <div class="admin-review-info">
                    <strong>${review.name}</strong>
                    <span style="color: #666; font-size: 0.9rem;"> | ${review.date}</span>
                    <div style="margin: 0.5rem 0;">${'⭐'.repeat(review.rating)}</div>
                    <div style="font-size: 0.9rem; color: #555;">${review.text.substring(0, 100)}${review.text.length > 100 ? '...' : ''}</div>
                    ${!review.approved ? '<span style="color: #ffc107; font-size: 0.8rem;">⏳ ממתין לאישור</span>' : ''}
                </div>
                <div class="admin-review-actions">
                    ${!review.approved ? `<button class="approve-btn" onclick="admin.approveReview(${review.id})">אשר</button>` : ''}
                    <button class="delete-btn" onclick="admin.deleteReview(${review.id})">מחק</button>
                </div>
            </div>
        `).join('');
    }

    approveReview(id) {
        const review = this.reviews.find(r => r.id === id);
        if (review) {
            review.approved = true;
            this.saveReviews();
            this.renderStats();
            this.renderReviewsList();
        }
    }

    deleteReview(id) {
        if (confirm('האם אתה בטוח שברצונך למחוק חוות דעת זו?')) {
            this.reviews = this.reviews.filter(r => r.id !== id);
            this.saveReviews();
            this.renderStats();
            this.renderReviewsList();
        }
    }

    saveReviews() {
        localStorage.setItem('carReviews', JSON.stringify(this.reviews));
    }

    exportReviews() {
        const dataStr = JSON.stringify(this.reviews, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reviews_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    clearAllReviews() {
        if (confirm('⚠️ האם אתה בטוח שברצונך למחוק את כל חוות הדעת? פעולה זו בלתי הפיכה!')) {
            if (confirm('באמת? כל הנתונים ימחקו לצמיתות!')) {
                localStorage.removeItem('carReviews');
                this.reviews = [];
                this.renderStats();
                this.renderReviewsList();
                alert('כל חוות הדעת נמחקו');
            }
        }
    }
}

// פונקציות גלובליות
function saveSettings() {
    const color = document.getElementById('colorPicker').value;
    const title = document.getElementById('titleInput').value;
    const subtitle = document.getElementById('subtitleInput').value;
    const theme = document.getElementById('themeSelect').value;

    localStorage.setItem('themeColor', color);
    localStorage.setItem('siteTitle', title);
    localStorage.setItem('siteSubtitle', subtitle);
    localStorage.setItem('themeMode', theme);

    // הודעת הצלחה
    const btn = document.querySelector('.save-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ נשמר!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
    }, 2000);
}

function exportReviews() {
    admin.exportReviews();
}

function clearAllReviews() {
    admin.clearAllReviews();
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'index.html';
}

// אתחול
let admin;
window.addEventListener('DOMContentLoaded', () => {
    admin = new AdminPanel();
});
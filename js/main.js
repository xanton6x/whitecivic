// אתחול Telegram WebApp
let tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    // הגדרת צבעי header כמו בטלגרם
    tg.setHeaderColor(tg.themeParams.bg_color);
    tg.setBackgroundColor(tg.themeParams.bg_color);
}

// ניהול חוות דעת
class ReviewManager {
    constructor() {
        this.reviews = JSON.parse(localStorage.getItem('carReviews')) || [];
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.renderReviews();
        this.setupStarRating();
        this.setupImagePreview();
    }

    loadSettings() {
        const savedColor = localStorage.getItem('themeColor');
        const savedTitle = localStorage.getItem('siteTitle');
        const savedSubtitle = localStorage.getItem('siteSubtitle');
        const savedTheme = localStorage.getItem('themeMode');

        if (savedColor) {
            document.documentElement.style.setProperty('--primary-color', savedColor);
        }
        if (savedTitle) {
            document.getElementById('site-title').innerText = savedTitle;
        }
        if (savedSubtitle) {
            document.querySelector('.car-subtitle').innerText = savedSubtitle;
        }
        if (savedTheme === 'dark') {
            document.documentElement.style.setProperty('--bg-color', '#1a1a1a');
            document.documentElement.style.setProperty('--text-color', '#ffffff');
            document.documentElement.style.setProperty('--card-bg', '#2d2d2d');
        }
    }

    setupStarRating() {
        const stars = document.querySelectorAll('#starInput span');
        const ratingInput = document.getElementById('ratingValue');

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                const value = index + 1;
                ratingInput.value = value;
                this.updateStars(value);
            });

            star.addEventListener('mouseenter', () => {
                this.updateStars(index + 1, true);
            });
        });

        document.getElementById('starInput').addEventListener('mouseleave', () => {
            this.updateStars(parseInt(ratingInput.value));
        });
    }

    updateStars(value, isHover = false) {
        const stars = document.querySelectorAll('#starInput span');
        stars.forEach((star, index) => {
            if (index < value) {
                star.classList.add('active');
                star.style.opacity = '1';
            } else {
                star.classList.remove('active');
                star.style.opacity = isHover ? '0.3' : '0.3';
            }
        });
    }

    setupImagePreview() {
        const fileInput = document.getElementById('reviewImage');
        const preview = document.getElementById('imagePreview');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    setupEventListeners() {
        document.getElementById('reviewForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitReview();
        });
    }

    submitReview() {
        const name = document.getElementById('reviewerName').value;
        const rating = parseInt(document.getElementById('ratingValue').value);
        const text = document.getElementById('reviewText').value;
        const imagePreview = document.getElementById('imagePreview').innerHTML;
        
        const review = {
            id: Date.now(),
            name: name,
            rating: rating,
            text: text,
            image: imagePreview.includes('img') ? imagePreview.match(/src="([^"]+)"/)?.[1] : null,
            date: new Date().toLocaleDateString('he-IL'),
            approved: false, // דורש אישור מנהל
            timestamp: Date.now()
        };

        this.reviews.unshift(review);
        this.saveReviews();
        
        // איפוס טופס
        document.getElementById('reviewForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('ratingValue').value = 5;
        this.updateStars(5);

        // הודעת הצלחה
        if (tg) {
            tg.showPopup({
                title: 'תודה!',
                message: 'חוות הדעת נשלחה לאישור',
                buttons: [{type: 'ok'}]
            });
        } else {
            alert('חוות הדעת נשלחה לאישור!');
        }

        this.renderReviews();
    }

    saveReviews() {
        localStorage.setItem('carReviews', JSON.stringify(this.reviews));
    }

    renderReviews() {
        const container = document.getElementById('reviewsList');
        const approvedReviews = this.reviews.filter(r => r.approved);
        
        // עדכון סטטיסטיקה
        this.updateStats(approvedReviews);

        if (approvedReviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>עדיין אין חוות דעת</p>
                    <p>היו הראשונים לכתוב!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = approvedReviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="reviewer-name">${review.name}</span>
                    <span class="review-date">${review.date}</span>
                </div>
                <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                <div class="review-text">${review.text}</div>
                ${review.image ? `<div class="review-image"><img src="${review.image}" alt="תמונה מהחווה"ד"></div>` : ''}
            </div>
        `).join('');
    }

    updateStats(approvedReviews) {
        const count = approvedReviews.length;
        document.getElementById('review-count').textContent = `(${count} חוות דעת)`;
        
        if (count > 0) {
            const avg = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / count;
            const roundedAvg = Math.round(avg);
            document.getElementById('avg-rating').textContent = '⭐'.repeat(roundedAvg) + (avg % 1 >= 0.5 ? '½' : '');
        }
    }
}

// פונקציות גלובליות
function shareApp() {
    const text = `בואו לראות את הרכב שלי! ${window.location.href}`;
    
    if (tg) {
        tg.shareUrl(window.location.href);
    } else {
        if (navigator.share) {
            navigator.share({
                title: 'הרכב שלי למכירה',
                text: 'בואו לראות את הרכב ולתת חוות דעת!',
                url: window.location.href
            });
        } else {
            // העתקה ללוח
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('הקישור הועתק!');
            });
        }
    }
}

function contactSeller() {
    if (tg) {
        tg.openTelegramLink('https://t.me/your_username'); // החלף עם היוזר שלך
    } else {
        window.open('https://t.me/your_username', '_blank');
    }
}

// אתחול
window.addEventListener('DOMContentLoaded', () => {
    window.reviewManager = new ReviewManager();
});
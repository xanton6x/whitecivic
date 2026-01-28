window.onload = function() {
    const savedColor = localStorage.getItem('themeColor');
    const savedTitle = localStorage.getItem('siteTitle');

    if (savedColor) {
        document.documentElement.style.setProperty('--primary-color', savedColor);
    }
    if (savedTitle) {
        document.getElementById('site-title').innerText = savedTitle;
    }
};
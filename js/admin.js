// פונקציה לשמירת הגדרות
function saveSettings() {
    const color = document.getElementById('colorPicker').value;
    const title = document.getElementById('titleInput').value;

    localStorage.setItem('themeColor', color);
    localStorage.setItem('siteTitle', title);

    alert('ההגדרות נשמרו בהצלחה!');
}
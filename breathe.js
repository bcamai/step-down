let timeLeft = 5;
const timerEl = document.getElementById('timer');
const btn = document.getElementById('continueBtn');

const urlParams = new URLSearchParams(window.location.search);
const targetUrl = urlParams.get('target');
const domain = urlParams.get('domain'); 

const countdown = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Poczekaj ${timeLeft} sekund...`;
    
    if (timeLeft <= 0) {
        clearInterval(countdown);
        timerEl.style.display = 'none';
        btn.style.display = 'block';
    }
}, 1000);

btn.addEventListener('click', () => {
    browser.storage.local.set({ ['allowed_' + domain]: Date.now() }).then(() => {
        window.location.href = targetUrl;
    });
});

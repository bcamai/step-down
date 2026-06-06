const timerContainer = document.getElementById('timer-container');
const timeLeftSpan = document.getElementById('time-left');
const btn = document.getElementById('continueBtn');

const urlParams = new URLSearchParams(window.location.search);
const targetUrl = urlParams.get('target');
const domain = urlParams.get('domain');

// Fallback zabezpieczający gdyby DOM elementów nie było
if (timerContainer && timeLeftSpan && btn) {
    browser.storage.local.get({ waitTime: 10 }).then(res => {
        let timeLeft = res.waitTime;
        timeLeftSpan.innerText = timeLeft;

        const countdown = setInterval(() => {
            timeLeft--;
            timeLeftSpan.innerText = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(countdown);
                timerContainer.style.display = 'none';
                btn.style.display = 'block';
            }
        }, 1000);
    });

    btn.addEventListener('click', () => {
        if (targetUrl) {
            browser.storage.local.set({ ['allowed_' + domain]: Date.now() }).then(() => {
                window.location.href = targetUrl;
            });
        }
    });
} else {
    console.error("Brak elementów HTML na stronie.");
}

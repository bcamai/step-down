document.addEventListener('DOMContentLoaded', () => {
    const waitTimeInput = document.getElementById('waitTime');
    const blockedSitesInput = document.getElementById('blockedSites');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Wczytaj obecne ustawienia
    browser.storage.local.get({
        waitTime: 10,
        blockedSites: ["facebook.com", "instagram.com", "reddit.com"]
    }).then(res => {
        waitTimeInput.value = res.waitTime;
        blockedSitesInput.value = res.blockedSites.join(', ');
    });

    saveBtn.addEventListener('click', () => {
        const waitTime = parseInt(waitTimeInput.value, 10);
        const sitesStr = blockedSitesInput.value;
        const blockedSites = sitesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

        browser.storage.local.set({
            waitTime: waitTime,
            blockedSites: blockedSites
        }).then(() => {
            statusDiv.textContent = 'Ustawienia zapisane!';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
        });
    });
});

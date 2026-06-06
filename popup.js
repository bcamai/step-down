document.addEventListener('DOMContentLoaded', () => {
    const statsList = document.getElementById('statsList');
    const noData = document.getElementById('noData');
    const openOptionsBtn = document.getElementById('openOptions');

    const today = new Date().toISOString().split('T')[0];

    browser.storage.local.get(null).then(res => {
        const todayStats = Object.keys(res)
            .filter(key => key.startsWith(`${today}_`))
            .map(key => ({
                domain: key.replace(`${today}_`, ''),
                timeMs: res[key]
            }))
            .sort((a, b) => b.timeMs - a.timeMs);

        if (todayStats.length === 0) {
            noData.style.display = 'block';
        } else {
            todayStats.forEach(stat => {
                const li = document.createElement('li');
                
                const min = Math.floor(stat.timeMs / 60000);
                const sec = Math.floor((stat.timeMs % 60000) / 1000);
                
                let timeStr = '';
                if (min > 0) timeStr += `${min} min `;
                timeStr += `${sec} s`;

                li.innerHTML = `<span class="domain">${stat.domain}</span> <span class="time">${timeStr}</span>`;
                statsList.appendChild(li);
            });
        }
    });

    openOptionsBtn.addEventListener('click', () => {
        browser.runtime.openOptionsPage();
    });
});

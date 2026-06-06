let blockedSites = ["facebook.com", "instagram.com", "reddit.com"];
let waitTime = 10;

browser.storage.local.get({
    blockedSites: ["facebook.com", "instagram.com", "reddit.com"],
    waitTime: 10
}).then(res => {
    blockedSites = res.blockedSites;
    waitTime = res.waitTime;
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.blockedSites) {
            blockedSites = changes.blockedSites.newValue;
        }
        if (changes.waitTime) {
            waitTime = changes.waitTime.newValue;
        }
    }
});

let activeTabInfo = {
    id: null,
    domain: null,
    startTime: null,
    sessionStart: null,
    lastNotified: null
};

browser.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return; // Tylko główna ramka

    let targetUrl = new URL(details.url);

    let blockedSiteMatch = blockedSites.find(site => targetUrl.hostname.includes(site));

    if (blockedSiteMatch) {
        browser.storage.local.get(['allowed_' + blockedSiteMatch]).then(res => {
            const allowedTime = res['allowed_' + blockedSiteMatch];
            const now = Date.now();

            if (!allowedTime || (now - allowedTime > 900000)) {
                let extensionUrl = browser.runtime.getURL(`breathe.html?target=${encodeURIComponent(details.url)}&domain=${blockedSiteMatch}`);
                browser.tabs.update(details.tabId, { url: extensionUrl });
            }
        });
    }
});

browser.tabs.onActivated.addListener((activeInfo) => {
    handleTabSwitch(activeInfo.tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) {
        handleTabSwitch(tabId);
    }
});

function handleTabSwitch(tabId) {
    const now = Date.now();

    if (activeTabInfo.id && activeTabInfo.domain) {
        const timeSpent = now - activeTabInfo.startTime;
        updateTimeSpent(activeTabInfo.domain, timeSpent);
    }

    browser.tabs.get(tabId).then(tab => {
        if (tab.url) {
            try {
                let tabUrl = new URL(tab.url);
                let matchedDomain = blockedSites.find(site => tabUrl.hostname.includes(site));

                if (matchedDomain) {
                    if (activeTabInfo.domain !== matchedDomain) {
                        activeTabInfo = {
                            id: tabId,
                            domain: matchedDomain,
                            startTime: now,
                            sessionStart: now,
                            lastNotified: now
                        };
                    } else {
                        activeTabInfo.id = tabId;
                        activeTabInfo.startTime = now;
                    }
                } else {
                    activeTabInfo = { id: null, domain: null, startTime: null, sessionStart: null, lastNotified: null };
                }
            } catch (e) {
                activeTabInfo = { id: null, domain: null, startTime: null, sessionStart: null, lastNotified: null };
            }
        } else {
            activeTabInfo = { id: null, domain: null, startTime: null, sessionStart: null, lastNotified: null };
        }
    }).catch(() => {
        activeTabInfo = { id: null, domain: null, startTime: null, sessionStart: null, lastNotified: null };
    });
}

function updateTimeSpent(domain, timeAddedMs) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${today}_${domain}`;

    browser.storage.local.get([key]).then(res => {
        let currentTotal = res[key] || 0;
        browser.storage.local.set({ [key]: currentTotal + timeAddedMs });
    });
}

browser.alarms.create("mindfulTimer", { periodInMinutes: 1 });

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "mindfulTimer") {
        const now = Date.now();
        if (activeTabInfo.id && activeTabInfo.domain) {
            const timeSpentSinceLastCheck = now - activeTabInfo.startTime;
            updateTimeSpent(activeTabInfo.domain, timeSpentSinceLastCheck);
            activeTabInfo.startTime = now; // reset chunk

            if (activeTabInfo.sessionStart) {
                const sessionTime = now - activeTabInfo.sessionStart;
                const timeSinceLastNotify = now - activeTabInfo.lastNotified;

                if (sessionTime >= 5 * 60 * 1000 && timeSinceLastNotify >= 5 * 60 * 1000) {
                    const sessionMinutes = Math.floor(sessionTime / 60000);

                    browser.scripting.executeScript({
                        target: { tabId: activeTabInfo.id },
                        func: (domain, minutes) => {
                            if (document.getElementById('mindful-browser-notification')) return;

                            const container = document.createElement('div');
                            container.id = 'mindful-browser-notification';
                            container.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                background: #ffffff;
                                color: #333333;
                                border-radius: 8px;
                                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                                padding: 15px 20px;
                                z-index: 2147483647;
                                font-family: system-ui, -apple-system, sans-serif;
                                font-size: 14px;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                min-width: 300px;
                                border-left: 4px solid #3498db;
                                transition: opacity 0.3s ease;
                            `;

                            const text = document.createElement('div');
                            text.innerHTML = `<strong>Mindful Browser</strong><br>Ciągle przeglądasz ${domain} już ${minutes} minut. Zrób przerwę!`;

                            const closeBtn = document.createElement('button');
                            closeBtn.innerText = '✕';
                            closeBtn.style.cssText = `
                                background: none;
                                border: none;
                                cursor: pointer;
                                font-size: 16px;
                                color: #999;
                                margin-left: 15px;
                                padding: 5px;
                            `;
                            closeBtn.onclick = () => {
                                container.style.opacity = '0';
                                setTimeout(() => container.remove(), 300);
                            };

                            container.appendChild(text);
                            container.appendChild(closeBtn);
                            document.body.appendChild(container);

                            // Auto close after 10 seconds
                            setTimeout(() => {
                                if (container.parentElement) {
                                    container.style.opacity = '0';
                                    setTimeout(() => {
                                        if (container.parentElement) container.remove();
                                    }, 300);
                                }
                            }, 10000);
                        },
                        args: [activeTabInfo.domain, sessionMinutes]
                    }).catch(err => {
                        console.error('Failed to inject in-page notification:', err);
                        // Fallback do systemowego w razie błędu (np. strony systemowe)
                        browser.notifications.create({
                            type: "basic",
                            title: "Mindful Browser",
                            message: `Ciągle przeglądasz ${activeTabInfo.domain} już ${sessionMinutes} minut. Zrób przerwę!`,
                            iconUrl: "icon.png"
                        });
                    });

                    activeTabInfo.lastNotified = now;
                }
            }
        }
    }
});

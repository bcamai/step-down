const blockedSites = ["facebook.com", "instagram.com", "reddit.com"];

let activeTabInfo = { id: null, domain: null, startTime: null };

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
    if (activeTabInfo.id && activeTabInfo.domain) {
        const timeSpent = Date.now() - activeTabInfo.startTime;
        updateTimeSpent(activeTabInfo.domain, timeSpent);
    }

    browser.tabs.get(tabId).then(tab => {
        if (tab.url) {
            try {
                let tabUrl = new URL(tab.url);
                let matchedDomain = blockedSites.find(site => tabUrl.hostname.includes(site)) || tabUrl.hostname;
                
                activeTabInfo = { 
                    id: tabId, 
                    domain: matchedDomain, 
                    startTime: Date.now() 
                };
            } catch(e) {
            }
        }
    });
}

function updateTimeSpent(domain, timeAddedMs) {
    browser.storage.local.get([domain]).then(res => {
        let currentTotal = res[domain] || 0;
        browser.storage.local.set({ [domain]: currentTotal + timeAddedMs });
    });
}

browser.alarms.create("mindfulTimer", { periodInMinutes: 1 });

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "mindfulTimer") {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs.length > 0 && tabs[0].url) {
                try {
                    let tabUrl = new URL(tabs[0].url);
                    let isTrackedSite = blockedSites.find(site => tabUrl.hostname.includes(site));
                    
                    if (isTrackedSite) {
                        browser.notifications.create({
                            type: "basic",
                            title: "Mindful Browser",
                            message: `Ciągle przeglądasz ${isTrackedSite}. Zrób przerwę na oddech!`,
                            iconUrl: "icon.png"
                        });
                    }
                } catch(e) {
                }
            }
        });
    }
});

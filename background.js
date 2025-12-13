// Background service worker for FocusFlow extension

// Constants
const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes in milliseconds
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('FocusFlow installed');

    // Set default settings
    chrome.storage.local.set({
        declutterAggressiveness: 'medium',
        tabThreshold: 10,
        inactiveMinutes: 30
    });

    // Initialize parked tabs array
    chrome.storage.local.set({ parkedTabs: [] });
});

// Initialize on startup (every time service worker loads)
chrome.runtime.onStartup.addListener(() => {
    console.log('FocusFlow started');
    startTabMonitoring();
});


// Also start monitoring when service worker first loads
startTabMonitoring();

// Helper function to save tab activity to storage
async function saveTabActivity(tabId, timestamp) {
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};
    tabActivity[tabId] = timestamp;
    await chrome.storage.local.set({ tabActivity });
}

// Helper function to get tab activity from storage
async function getTabActivity(tabId) {
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};
    return tabActivity[tabId] || null;
}

// Helper function to remove tab activity from storage
async function removeTabActivity(tabId) {
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};
    delete tabActivity[tabId];
    await chrome.storage.local.set({ tabActivity });
}

// Start tab monitoring
async function startTabMonitoring() {
    // Track when tabs are activated
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
        await saveTabActivity(activeInfo.tabId, Date.now());
        console.log(`Tab ${activeInfo.tabId} activated`);
    });

    // Track when tabs are updated
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') {
            await saveTabActivity(tabId, Date.now());
            console.log(`Tab ${tabId} updated`);
        }
    });

    // Clean up closed tabs
    chrome.tabs.onRemoved.addListener(async (tabId) => {
        await removeTabActivity(tabId);
        console.log(`Tab ${tabId} removed from tracking`);
    });

    // Initialize activity for all current tabs (only if not already tracked)
    const tabs = await chrome.tabs.query({});
    const result = await chrome.storage.local.get(['tabActivity']);
    const existingActivity = result.tabActivity || {};

    const now = Date.now();
    const thirtyMinutesAgo = now - (30 * 60 * 1000);

    for (const tab of tabs) {
        // If we don't have activity data for this tab, set it to 30 minutes ago
        // This makes existing tabs immediately parkable for testing
        if (!existingActivity[tab.id]) {
            existingActivity[tab.id] = thirtyMinutesAgo;
            console.log(`New tab ${tab.id} initialized with activity 30 min ago`);
        }
    }

    await chrome.storage.local.set({ tabActivity: existingActivity });

    // Periodic check for inactive tabs
    setInterval(checkInactiveTabs, CHECK_INTERVAL);
}

// Check for inactive tabs
async function checkInactiveTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const now = Date.now();

    // Only check if we have 10+ tabs
    if (tabs.length < 10) {
        chrome.action.setBadgeText({ text: '' });
        return;
    }

    // Get activity data from storage
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};

    let inactiveCount = 0;

    tabs.forEach(tab => {
        // If we don't have activity data, assume tab was opened 31 minutes ago
        const lastActivity = tabActivity[tab.id] || (now - (31 * 60 * 1000));
        const inactiveDuration = now - lastActivity;

        if (inactiveDuration > INACTIVE_THRESHOLD) {
            inactiveCount++;
        }
    });

    // Update badge if there are inactive tabs
    if (inactiveCount > 0) {
        chrome.action.setBadgeText({ text: inactiveCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea' });

        // Show notification
        chrome.notifications.create('inactive-tabs', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'FocusFlow - Inactive Tabs Detected',
            message: `You have ${inactiveCount} inactive tab${inactiveCount !== 1 ? 's' : ''}. Park them to free up memory?`,
            buttons: [
                { title: 'Park Now' }
            ],
            priority: 1,
            requireInteraction: false
        });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Park inactive tabs
async function parkInactiveTabs() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const now = Date.now();
    const settings = await chrome.storage.local.get(['inactiveMinutes']);
    const threshold = (settings.inactiveMinutes || 30) * 60 * 1000;

    // Get activity data from storage
    const result = await chrome.storage.local.get(['tabActivity']);
    const tabActivity = result.tabActivity || {};

    const tabsToPark = [];

    console.log(`Checking ${tabs.length} tabs for parking (threshold: ${threshold / 60000} minutes)`);

    for (const tab of tabs) {
        // Don't park pinned tabs or the active tab
        if (tab.pinned || tab.active) continue;

        // If we don't have activity data, assume tab was opened 31 minutes ago
        // This allows for immediate parking of tabs we haven't tracked yet
        const lastActivity = tabActivity[tab.id] || (now - (31 * 60 * 1000));
        const inactiveDuration = now - lastActivity;

        console.log(`Tab ${tab.id} (${tab.title}): inactive for ${Math.round(inactiveDuration / 60000)} minutes`);

        if (inactiveDuration > threshold) {
            tabsToPark.push({
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl,
                parkedAt: now
            });
        }
    }

    console.log(`Found ${tabsToPark.length} tabs to park`);

    if (tabsToPark.length > 0) {
        // Save parked tabs
        const parkedResult = await chrome.storage.local.get(['parkedTabs']);
        const parkedTabs = parkedResult.parkedTabs || [];
        parkedTabs.push(...tabsToPark);
        await chrome.storage.local.set({ parkedTabs });

        // Close the tabs
        const tabIds = tabs
            .filter(tab => {
                const lastActivity = tabActivity[tab.id] || (now - (31 * 60 * 1000));
                const inactiveDuration = now - lastActivity;
                return !tab.pinned && !tab.active && inactiveDuration > threshold;
            })
            .map(tab => tab.id);

        await chrome.tabs.remove(tabIds);

        // Clear badge
        chrome.action.setBadgeText({ text: '' });
    }

    return tabsToPark.length;
}

// Restore parked tabs
async function restoreParkedTabs() {
    const result = await chrome.storage.local.get(['parkedTabs']);
    const parkedTabs = result.parkedTabs || [];

    if (parkedTabs.length === 0) return 0;

    // Restore all parked tabs
    for (const tab of parkedTabs) {
        await chrome.tabs.create({
            url: tab.url,
            active: false
        });
    }

    const restoredCount = parkedTabs.length;

    // Clear parked tabs
    await chrome.storage.local.set({ parkedTabs: [] });

    return restoredCount;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'parkInactiveTabs') {
        parkInactiveTabs().then(count => {
            sendResponse({ parkedCount: count });
        });
        return true; // Keep channel open for async response
    }
    else if (request.action === 'restoreParkedTabs') {
        restoreParkedTabs().then(count => {
            sendResponse({ restoredCount: count });
        });
        return true;
    }
    else if (request.action === 'getTabActivity') {
        const activity = Array.from(tabActivity.entries()).map(([tabId, timestamp]) => ({
            tabId,
            lastActivity: timestamp
        }));
        sendResponse({ activity });
    }
});

// Update badge on tab count changes
chrome.tabs.onCreated.addListener(() => {
    checkInactiveTabs();
});

chrome.tabs.onRemoved.addListener(() => {
    checkInactiveTabs();
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (notificationId === 'inactive-tabs' && buttonIndex === 0) {
        // Park Now button clicked
        const count = await parkInactiveTabs();
        chrome.notifications.clear('inactive-tabs');

        // Show success notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'FocusFlow',
            message: `Parked ${count} inactive tab${count !== 1 ? 's' : ''}`,
            priority: 0
        });
    } else if (notificationId.startsWith('heavy-page-') && buttonIndex === 0) {
        // Pause Scripts button clicked
        const tabId = parseInt(notificationId.replace('heavy-page-', ''));
        chrome.tabs.sendMessage(tabId, { action: 'pauseHeavyScripts' });
        chrome.notifications.clear(notificationId);
    }
});

// Monitor tab updates for performance
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Wait a bit for page to settle
        setTimeout(async () => {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: 'getPerformanceData' });

                if (response && response.score >= 20) {
                    // Light-Medium, Medium, or Heavy page detected - auto-pause scripts
                    chrome.tabs.sendMessage(tabId, { action: 'pauseHeavyScripts' });

                    // Show notification for Medium and Heavy pages
                    if (response.score >= 30) {
                        chrome.notifications.create(`heavy-page-${tabId}`, {
                            type: 'basic',
                            iconUrl: 'icons/icon128.png',
                            title: `FocusFlow - ${response.label} Page Detected`,
                            message: `Performance score: ${response.score} (${response.label}). Scripts automatically paused to improve performance.`,
                            priority: response.score >= 70 ? 2 : 1,
                            requireInteraction: false
                        });
                    }

                    console.log(`Auto-paused scripts for page with score: ${response.score} (${response.label})`);
                }
            } catch (error) {
                // Ignore errors for tabs that can't receive messages
            }
        }, 2000);
    }
});

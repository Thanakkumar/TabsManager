// Popup script for FocusFlow extension

// DOM elements
const declutterToggle = document.getElementById('declutterToggle');
const declutterStatus = document.getElementById('declutterStatus');
const declutterStats = document.getElementById('declutterStats');
const tabCount = document.getElementById('tabCount');
const parkTabsBtn = document.getElementById('parkTabsBtn');
const restoreTabsBtn = document.getElementById('restoreTabsBtn');
const parkedCount = document.getElementById('parkedCount');
const scoreValue = document.getElementById('scoreValue');
const scoreLabel = document.getElementById('scoreLabel');
const pauseScriptsBtn = document.getElementById('pauseScriptsBtn');
const muteMediaBtn = document.getElementById('muteMediaBtn');
const openOptionsBtn = document.getElementById('openOptionsBtn');

// Initialize popup
async function init() {
  await loadDeclutterState();
  await updateTabInfo();
  await updatePerformanceInfo();
  setupEventListeners();
}

// Load global declutter state
async function loadDeclutterState() {
  try {
    const result = await chrome.storage.local.get(['declutterGlobalEnabled']);
    const isEnabled = result.declutterGlobalEnabled || false;

    declutterToggle.checked = isEnabled;
    updateDeclutterUI(isEnabled);
  } catch (error) {
    console.error('Error loading declutter state:', error);
  }
}

// Update declutter UI
function updateDeclutterUI(isEnabled) {
  declutterStatus.textContent = isEnabled ? 'On' : 'Off';
  if (isEnabled) {
    declutterStats.classList.add('active');
    declutterStats.textContent = '✓ All pages decluttered';
  } else {
    declutterStats.classList.remove('active');
    declutterStats.textContent = '';
  }
}

// Update tab information
async function updateTabInfo() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabCountText = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''} open`;
    tabCount.textContent = tabCountText;

    // Update parked tabs count
    const parkedTabs = await chrome.storage.local.get(['parkedTabs']);
    const parkedTabsArray = parkedTabs.parkedTabs || [];
    parkedCount.textContent = parkedTabsArray.length;

    // Enable/disable restore button
    restoreTabsBtn.disabled = parkedTabsArray.length === 0;

    // Show park button only if 10+ tabs
    if (tabs.length >= 10) {
      parkTabsBtn.style.display = 'flex';
    } else {
      parkTabsBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error updating tab info:', error);
  }
}

// Update performance information
async function updatePerformanceInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    // Request performance data from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getPerformanceData' }, (response) => {
      if (chrome.runtime.lastError) {
        scoreValue.textContent = '--';
        scoreLabel.textContent = 'Unable to analyze';
        return;
      }

      if (response && response.score !== undefined) {
        scoreValue.textContent = response.score;
        scoreLabel.textContent = response.label;

        // Update score color based on value
        if (response.score < 30) {
          scoreLabel.style.color = '#48bb78'; // Green
        } else if (response.score < 70) {
          scoreLabel.style.color = '#ed8936'; // Orange
        } else {
          scoreLabel.style.color = '#f56565'; // Red
        }

        // Auto-pause scripts if score is high enough
        if (response.score >= 20) {
          chrome.tabs.sendMessage(tab.id, { action: 'pauseHeavyScripts' });
          console.log(`Auto-paused scripts (score: ${response.score})`);
        }
      }
    });
  } catch (error) {
    console.error('Error updating performance info:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Declutter toggle
  declutterToggle.addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    await toggleDeclutter(isEnabled);
  });

  // Park tabs button
  parkTabsBtn.addEventListener('click', async () => {
    await parkInactiveTabs();
  });

  // Restore tabs button
  restoreTabsBtn.addEventListener('click', async () => {
    await restoreParkedTabs();
  });

  // Pause scripts button
  pauseScriptsBtn.addEventListener('click', async () => {
    await pauseHeavyScripts();
  });

  // Mute media button
  muteMediaBtn.addEventListener('click', async () => {
    await muteMedia();
  });

  // Options button
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// Toggle declutter mode globally
async function toggleDeclutter(isEnabled) {
  try {
    // Save global state
    await chrome.storage.local.set({ declutterGlobalEnabled: isEnabled });

    // Send message to ALL tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleDeclutter',
        enabled: isEnabled
      }).catch(() => { }); // Ignore errors for tabs that can't receive messages
    });

    updateDeclutterUI(isEnabled);

    // Show notification to reload pages
    if (isEnabled) {
      showNotification('Declutter enabled! Reload pages to see the effect.');
    } else {
      showNotification('Declutter disabled');
    }
  } catch (error) {
    console.error('Error toggling declutter:', error);
  }
}

// Park inactive tabs
async function parkInactiveTabs() {
  try {
    parkTabsBtn.disabled = true;
    parkTabsBtn.textContent = 'Parking...';

    // Send message to background script
    chrome.runtime.sendMessage({ action: 'parkInactiveTabs' }, async (response) => {
      if (response && response.parkedCount > 0) {
        showNotification(`Parked ${response.parkedCount} inactive tab${response.parkedCount !== 1 ? 's' : ''}`);
      } else {
        showNotification('No inactive tabs to park');
      }

      parkTabsBtn.disabled = false;
      parkTabsBtn.innerHTML = '<span class="btn-icon">📦</span> Park Inactive Tabs';
      await updateTabInfo();
    });
  } catch (error) {
    console.error('Error parking tabs:', error);
    parkTabsBtn.disabled = false;
    parkTabsBtn.innerHTML = '<span class="btn-icon">📦</span> Park Inactive Tabs';
  }
}

// Restore parked tabs
async function restoreParkedTabs() {
  try {
    restoreTabsBtn.disabled = true;
    restoreTabsBtn.innerHTML = '<span class="btn-icon">↩️</span> Restoring...';

    chrome.runtime.sendMessage({ action: 'restoreParkedTabs' }, async (response) => {
      if (response && response.restoredCount > 0) {
        showNotification(`Restored ${response.restoredCount} tab${response.restoredCount !== 1 ? 's' : ''}`);
      }

      restoreTabsBtn.innerHTML = '<span class="btn-icon">↩️</span> Restore Parked (<span id="parkedCount">0</span>)';
      await updateTabInfo();
    });
  } catch (error) {
    console.error('Error restoring tabs:', error);
    restoreTabsBtn.innerHTML = '<span class="btn-icon">↩️</span> Restore Parked (<span id="parkedCount">0</span>)';
  }
}

// Pause heavy scripts
async function pauseHeavyScripts() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: 'pauseHeavyScripts' });
    showNotification('Heavy scripts paused');
  } catch (error) {
    console.error('Error pausing scripts:', error);
  }
}

// Mute media
async function muteMedia() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: 'muteMedia' }, (response) => {
      if (response && response.muted !== undefined) {
        const message = response.muted ? 'Media muted' : 'Media unmuted';
        showNotification(message);

        // Update button text
        muteMediaBtn.textContent = response.muted ? '🔇 Unmute Media' : '🔊 Mute Media';
      }
    });
  } catch (error) {
    console.error('Error toggling media:', error);
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #48bb78;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Listen for score updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scriptsPaused") {
    scoreValue.textContent = request.scoreAfter;
    scoreLabel.textContent = request.label;
    if (request.scoreAfter < 30) {
      scoreLabel.style.color = "#48bb78";
    } else if (request.scoreAfter < 70) {
      scoreLabel.style.color = "#ed8936";
    } else {
      scoreLabel.style.color = "#f56565";
    }
    const statusEl = document.getElementById("scriptsPausedStatus");
    if (statusEl) {
      statusEl.textContent = "✓ Scripts paused";
      statusEl.style.display = "block";
    }
  }
});
// Initialize on load
init();


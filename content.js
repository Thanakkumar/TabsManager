// Content script for FocusFlow extension

// Common selectors for elements to hide
const DECLUTTER_SELECTORS = [
    // Sidebars
    'aside', '[class*="sidebar"]', '[id*="sidebar"]', '[class*="side-bar"]',
    '[class*="rail"]', '[id*="rail"]',

    // Ads and banners - Basic
    '[class*="ad-banner"]', '[class*="advertisement"]', '[id*="ad-"]',
    '[class*="ad-container"]', '[class*="ad-wrapper"]', '[class*="ad-slot"]',
    '[class*="ad-unit"]', '[class*="ad-space"]', '[class*="ad-block"]',
    '.ad', '#ad', '[data-ad]', '[data-ad-slot]', '[data-ad-unit]',

    // Ads - More variations
    '[class*="advert"]', '[id*="advert"]', '[class*="_ad_"]', '[class*="-ad-"]',
    '[class*="ads-"]', '[id*="ads-"]', '[class*="adbox"]', '[class*="ad_box"]',
    '[class*="sponsored"]', '[class*="promo"]', '[class*="promotion"]',

    // Google AdSense
    'ins.adsbygoogle', '.adsbygoogle', '[data-ad-client]',
    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',

    // Common ad networks
    '[class*="taboola"]', '[id*="taboola"]',
    '[class*="outbrain"]', '[id*="outbrain"]',
    '[class*="revcontent"]', '[id*="revcontent"]',
    '[class*="mgid"]', '[id*="mgid"]',
    '[class*="zergnet"]', '[id*="zergnet"]',

    // Sponsored content
    '[class*="sponsor"]', '[id*="sponsor"]',
    '[aria-label*="sponsor" i]', '[aria-label*="advertisement" i]',
    'article[class*="sponsor"]', 'div[class*="sponsor"]',

    // Native ads
    '[class*="native-ad"]', '[class*="native_ad"]',
    '[class*="recommended"]', '[class*="recommendation"]',
    '[class*="related-content"]', '[class*="you-may-like"]',

    // Cookie notices
    '[class*="cookie"]', '[id*="cookie"]', '[class*="gdpr"]', '[class*="consent"]',
    '[data-testid*="cookie"]', '[aria-label*="cookie" i]',
    '[class*="privacy-banner"]', '[class*="cookie-banner"]',
    '[class*="cookie-notice"]', '[class*="cookie-consent"]',

    // Popups and overlays
    '[class*="popup"]', '[class*="modal"]', '[class*="overlay"]',
    '[class*="lightbox"]', '[class*="dialog"]',
    '[role="dialog"][class*="newsletter"]', '[role="dialog"][class*="subscribe"]',

    // Newsletter/Subscribe prompts
    '[class*="newsletter"]', '[class*="subscribe"]', '[class*="subscription"]',
    '[class*="email-capture"]', '[class*="signup"]', '[class*="sign-up"]',
    '[class*="join-us"]', '[class*="mailing-list"]',

    // Autoplay videos (floating)
    '[class*="floating-video"]', '[class*="sticky-video"]',
    '[class*="video-player"][class*="sticky"]', '[class*="video-player"][class*="floating"]',

    // Social widgets
    '[class*="social-share"]', '[class*="share-buttons"]',
    '[class*="social-buttons"]', '[class*="share-bar"]',
    '[class*="social-media-share"]', '[class*="share-tools"]',

    // Infinite scroll footers
    '[class*="infinite-scroll"]', '[class*="load-more"]',

    // Notification prompts
    '[class*="notification-prompt"]', '[class*="push-notification"]',
    '[class*="enable-notifications"]', '[class*="allow-notifications"]',

    // App download prompts
    '[class*="app-banner"]', '[class*="app-download"]', '[class*="download-app"]',
    '[class*="mobile-app"]', '[class*="get-app"]', '[class*="install-app"]',

    // Tracking pixels and beacons
    'img[width="1"][height="1"]', 'img[style*="width:1px"]',
    'iframe[width="1"][height="1"]', 'iframe[style*="width:1px"]',

    // Interstitials
    '[class*="interstitial"]', '[id*="interstitial"]',

    // Sticky headers/footers (often contain ads)
    '[class*="sticky-header"][class*="ad"]', '[class*="sticky-footer"][class*="ad"]',
    '[class*="fixed-banner"]', '[class*="sticky-banner"]'
];

// State
let declutterEnabled = false;
let hiddenElements = [];
let observer = null;

// Initialize
async function init() {
    // Check if declutter is enabled globally
    const result = await chrome.storage.local.get(['declutterGlobalEnabled']);
    declutterEnabled = result.declutterGlobalEnabled || false;

    if (declutterEnabled) {
        applyDeclutter();
    }

    // Setup mutation observer for dynamic content
    setupObserver();
}

// Apply declutter
function applyDeclutter() {
    const selector = DECLUTTER_SELECTORS.join(', ');
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
        if (!element.dataset.focusflowHidden) {
            element.dataset.focusflowHidden = 'true';
            element.dataset.focusflowOriginalDisplay = element.style.display;
            element.style.display = 'none';
            hiddenElements.push(element);
        }
    });

    // Also hide autoplay videos
    muteAutoplayVideos();
}

// Remove declutter
function removeDeclutter() {
    hiddenElements.forEach(element => {
        if (element.dataset.focusflowHidden) {
            element.style.display = element.dataset.focusflowOriginalDisplay || '';
            delete element.dataset.focusflowHidden;
            delete element.dataset.focusflowOriginalDisplay;
        }
    });
    hiddenElements = [];
}

// Mute autoplay videos
function muteAutoplayVideos() {
    const videos = document.querySelectorAll('video[autoplay]');
    videos.forEach(video => {
        video.muted = true;
        video.pause();
    });
}

// Setup mutation observer
function setupObserver() {
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
        if (declutterEnabled) {
            // Debounce to avoid excessive processing
            clearTimeout(observer.timeout);
            observer.timeout = setTimeout(() => {
                applyDeclutter();
            }, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Calculate performance score
function calculatePerformanceScore() {
    // Count scripts
    const scripts = document.querySelectorAll('script').length;

    // Count iframes (potential trackers)
    const iframes = document.querySelectorAll('iframe').length;

    // Count images
    const images = document.querySelectorAll('img').length;

    // Simple heuristic: normalize to 0-100 scale
    const scriptScore = Math.min(scripts * 2, 40);
    const iframeScore = Math.min(iframes * 5, 30);
    const imageScore = Math.min(images * 0.5, 30);

    const totalScore = Math.round(scriptScore + iframeScore + imageScore);

    let label = 'Light';
    if (totalScore >= 70) {
        label = 'Heavy';
    } else if (totalScore >= 30) {
        label = 'Medium';
    }

    return { score: totalScore, label };
}

// Pause heavy scripts (aggressive approach)
function pauseHeavyScripts() {
    // Get score before pausing
    const scoreBefore = calculatePerformanceScore();

    // Clear all intervals and timeouts
    const highestId = window.setTimeout(() => { }, 0);
    for (let i = 0; i < highestId; i++) {
        window.clearInterval(i);
        window.clearTimeout(i);
    }

    // Pause animations
    let style = document.getElementById('focusflow-pause-animations');
    if (!style) {
        style = document.createElement('style');
        style.id = 'focusflow-pause-animations';
        style.textContent = '* { animation-play-state: paused !important; transition: none !important; }';
        document.head.appendChild(style);
    }

    // Stop requestAnimationFrame
    window.requestAnimationFrame = function () { return 0; };

    console.log('FocusFlow: Heavy scripts paused');

    // Recalculate score after pausing (wait 1 second for changes to take effect)
    setTimeout(() => {
        const scoreAfter = calculatePerformanceScore();
        console.log(`Performance improved: ${scoreBefore.score} → ${scoreAfter.score}`);

        // Send updated score to popup
        chrome.runtime.sendMessage({
            action: 'scriptsPaused',
            scoreBefore: scoreBefore.score,
            scoreAfter: scoreAfter.score,
            label: scoreAfter.label
        }).catch(() => { });
    }, 1000);
}

// Toggle mute for all media
let mediaMuted = false;
const mediaStates = new Map(); // Store original states

function toggleMuteMedia() {
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');

    if (!mediaMuted) {
        // Mute all media
        videos.forEach(video => {
            mediaStates.set(video, {
                wasMuted: video.muted,
                wasPlaying: !video.paused
            });
            video.muted = true;
            video.pause();
        });

        audios.forEach(audio => {
            mediaStates.set(audio, {
                wasMuted: audio.muted,
                wasPlaying: !audio.paused
            });
            audio.muted = true;
            audio.pause();
        });

        mediaMuted = true;
    } else {
        // Unmute and restore state
        videos.forEach(video => {
            const state = mediaStates.get(video);
            if (state) {
                video.muted = state.wasMuted;
                if (state.wasPlaying) {
                    video.play().catch(() => { }); // Ignore autoplay errors
                }
            }
        });

        audios.forEach(audio => {
            const state = mediaStates.get(audio);
            if (state) {
                audio.muted = state.wasMuted;
                if (state.wasPlaying) {
                    audio.play().catch(() => { }); // Ignore autoplay errors
                }
            }
        });

        mediaStates.clear();
        mediaMuted = false;
    }

    return mediaMuted;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDeclutter') {
        declutterEnabled = request.enabled;

        if (declutterEnabled) {
            applyDeclutter();
        } else {
            removeDeclutter();
        }

        sendResponse({ success: true });
    }
    else if (request.action === 'getPerformanceData') {
        const perfData = calculatePerformanceScore();
        sendResponse(perfData);
    }
    else if (request.action === 'pauseHeavyScripts') {
        pauseHeavyScripts();
        sendResponse({ success: true });
    }
    else if (request.action === 'muteMedia') {
        const isMuted = toggleMuteMedia();
        sendResponse({ success: true, muted: isMuted });
    }

    return true; // Keep message channel open for async response
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

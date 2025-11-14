/**
 * Application Entry Point for Solitaire On Demand
 * Initializes the game and handles global app lifecycle, PWA features, and error handling
 * This is the main bootstrap file that sets up the entire application
 */

// Global game instance - holds the main SolitaireGame controller
let solitaireGame = null;

/**
 * Initialize the application and all its subsystems
 * This is the main entry point called when the DOM is ready
 */
function initializeApp() {
    console.log('Initializing Solitaire On Demand...');
    
    try {
        // Load and display version from manifest
        loadVersionFromManifest();
        
        // Create the main game instance which coordinates all other systems
        solitaireGame = new SolitaireGame();
        
        // Make game instance globally accessible for debugging and console access
        window.solitaireGame = solitaireGame;
        
        // Setup global error handling to catch and display unexpected errors
        setupErrorHandling();
        
        // Setup service worker for Progressive Web App (PWA) functionality
        setupServiceWorker();
        
        // Setup Fire TV remote button handlers
        setupTVRemoteHandlers();
        
        // Setup debug panel for Fire TV remote testing
        setupDebugPanel();
        
        // Set up custom card back image
        setupCustomCardBack();
        
        // Disable continue game functionality - removed due to blank board issues
        // checkForSavedGame();
        
        console.log('Solitaire On Demand initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showFatalError('Failed to start the game. Please refresh the page and try again.');
    }
}

/**
 * Setup Fire TV remote button handlers using standard keydown events
 * Maps Fire TV remote buttons to game functions using reliable key codes
 */
function setupTVRemoteHandlers() {
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        const code = event.code;
        
        // Log all key events to debug panel
        logKeyEvent(event);
        
        // Handle debug panel toggle (F12 key)
        if (key === 'F12') {
            event.preventDefault();
            toggleDebugPanel();
            return;
        }
        
        // Only handle Fire TV remote keys when solitaire game is active
        if (!solitaireGame) return;
        
        const currentScreen = document.querySelector('.screen.active');
        
        console.log('Fire TV Key pressed:', key, 'Code:', code);
        
        switch (key) {
            // Play/Pause button - Draw from stock
            case 'MediaPlayPause':
                if (currentScreen?.id === 'game-screen') {
                    event.preventDefault();
                    console.log('Play/Pause button pressed - Drawing from stock');
                    logFunctionCall('Draw from stock', 'MediaPlayPause button triggered');
                    const stockPile = document.querySelector('.stock-pile');
                    if (stockPile) {
                        stockPile.click();
                    }
                }
                break;
                
            // Fast Forward button - Show hint  
            case 'MediaFastForward':
                if (currentScreen?.id === 'game-screen') {
                    event.preventDefault();
                    console.log('Fast Forward button pressed - Showing hint');
                    logFunctionCall('Show hint', 'MediaFastForward button triggered');
                    const hintBtn = document.getElementById('hint-btn');
                    if (hintBtn && !hintBtn.disabled) {
                        hintBtn.click();
                    }
                }
                break;
                
            // Rewind button - Undo move
            case 'MediaRewind':
                if (currentScreen?.id === 'game-screen') {
                    event.preventDefault();
                    console.log('Rewind button pressed - Undo move');
                    logFunctionCall('Undo move', 'MediaRewind button triggered');
                    const undoBtn = document.getElementById('undo-btn');
                    if (undoBtn && !undoBtn.disabled) {
                        undoBtn.click();
                    }
                }
                break;
                
            // Menu button
            case 'ContextMenu':
            case 'F1': // Some Fire TV devices map menu to F1
                event.preventDefault();
                console.log('Menu button pressed');
                logFunctionCall('Menu action', 'ContextMenu/F1 button triggered');
                if (currentScreen?.id === 'game-screen') {
                    solitaireGame.uiManager.showScreen('main-menu');
                } else {
                    solitaireGame.uiManager.showScreen('main-menu');
                }
                break;
                
            // Back button handling removed - let ui.js handle all back navigation
            // This prevents double triggering when multiple listeners process same key
            case 'GoBack':
            case 'back':
                // Let ui.js handle back button via its own keydown listener
                console.log('Back button event detected in app.js - delegating to ui.js');
                logFunctionCall('Back navigation', 'GoBack button triggered (delegated to ui.js)');
                break;
                
            // Additional Fire TV remote mappings
            case 'MediaTrackPrevious': // Skip backward
                if (currentScreen?.id === 'game-screen') {
                    event.preventDefault();
                    console.log('Skip Backward button pressed - Undo move');
                    logFunctionCall('Undo move', 'MediaTrackPrevious button triggered');
                    const undoBtn = document.getElementById('undo-btn');
                    if (undoBtn && !undoBtn.disabled) {
                        undoBtn.click();
                    } else {
                        solitaireGame.uiManager.showScreen('main-menu');
                    }
                }
                break;
        }
        
        // Handle numeric keys for quick column selection in game
        if (currentScreen?.id === 'game-screen' && /^Digit[1-7]$/.test(code)) {
            const column = parseInt(key) - 1;
            if (column >= 0 && column < 7) {
                event.preventDefault();
                logFunctionCall('Column selection', `Select column ${column + 1}`);
                solitaireGame.uiManager.selectTableauColumn(column);
            }
        }
    });
    
    console.log('Fire TV remote handlers initialized with standard keydown events');
}

/**
 * Setup debug panel for Fire TV remote testing
 */
function setupDebugPanel() {
    // Setup debug panel toggle and clear buttons
    const debugToggle = document.getElementById('debug-toggle');
    const debugClear = document.getElementById('debug-clear');
    
    if (debugToggle) {
        debugToggle.addEventListener('click', toggleDebugPanel);
    }
    
    if (debugClear) {
        debugClear.addEventListener('click', clearDebugLog);
    }
    
    // Hide debug panel by default - can be toggled with F12
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        debugPanel.classList.remove('active');
        console.log('Debug panel initialized (hidden). Press F12 to toggle.');
    }
}

/**
 * Toggle debug panel visibility
 */
function toggleDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    const debugToggle = document.getElementById('debug-toggle');
    
    if (debugPanel) {
        if (debugPanel.classList.contains('active')) {
            debugPanel.classList.remove('active');
            if (debugToggle) debugToggle.textContent = 'Show';
            logInfo('Debug panel hidden');
        } else {
            debugPanel.classList.add('active');
            if (debugToggle) debugToggle.textContent = 'Hide';
            logInfo('Debug panel shown');
        }
    }
}

/**
 * Clear debug log
 */
function clearDebugLog() {
    const debugLog = document.getElementById('debug-log');
    if (debugLog) {
        debugLog.innerHTML = '';
        logInfo('Debug log cleared');
    }
}

/**
 * Log key event to debug panel
 */
function logKeyEvent(event) {
    const debugLog = document.getElementById('debug-log');
    if (!debugLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'debug-entry key-event';
    
    entry.innerHTML = `
        <span class="debug-timestamp">[${timestamp}]</span>
        KEY EVENT: "${event.key}" (${event.code})
        <div class="debug-key-details">
            ctrlKey: ${event.ctrlKey}, altKey: ${event.altKey}, shiftKey: ${event.shiftKey}, metaKey: ${event.metaKey}
        </div>
    `;
    
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

/**
 * Log function call to debug panel
 */
function logFunctionCall(functionName, details) {
    const debugLog = document.getElementById('debug-log');
    if (!debugLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'debug-entry function-call';
    
    entry.innerHTML = `
        <span class="debug-timestamp">[${timestamp}]</span>
        FUNCTION: ${functionName}
        <div class="debug-key-details">${details}</div>
    `;
    
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

/**
 * Log info message to debug panel
 */
function logInfo(message) {
    const debugLog = document.getElementById('debug-log');
    if (!debugLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'debug-entry info';
    
    entry.innerHTML = `
        <span class="debug-timestamp">[${timestamp}]</span>
        INFO: ${message}
    `;
    
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

/**
 * Log error message to debug panel
 */
function logError(message) {
    const debugLog = document.getElementById('debug-log');
    if (!debugLog) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'debug-entry error';
    
    entry.innerHTML = `
        <span class="debug-timestamp">[${timestamp}]</span>
        ERROR: ${message}
    `;
    
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

/**
 * Setup global error handling
 */
function setupErrorHandling() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
        console.error('Uncaught error:', event.error);
        logError(`Uncaught error: ${event.error?.message || 'Unknown error'}`);
        
        if (solitaireGame) {
            solitaireGame.showErrorMessage('An unexpected error occurred. The game will continue, but you may want to refresh the page.');
        }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        logError(`Unhandled promise rejection: ${event.reason}`);
        
        if (solitaireGame) {
            solitaireGame.showErrorMessage('A background error occurred. The game should continue normally.');
        }
        
        // Prevent the default browser behavior
        event.preventDefault();
    });
}

/**
 * Setup service worker for PWA functionality
 */
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }
}

/**
 * Show update notification
 */
function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #2196F3;
        color: white;
        padding: 1rem;
        text-align: center;
        z-index: 5000;
        font-size: 0.9rem;
    `;
    
    updateBanner.innerHTML = `
        <span>A new version is available!</span>
        <button onclick="reloadApp()" style="margin-left: 1rem; padding: 0.5rem 1rem; background: white; color: #2196F3; border: none; border-radius: 4px; cursor: pointer;">
            Update Now
        </button>
        <button onclick="dismissUpdate()" style="margin-left: 0.5rem; padding: 0.5rem 1rem; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer;">
            Later
        </button>
    `;
    
    document.body.appendChild(updateBanner);
}

/**
 * Reload the app to get the latest version
 */
function reloadApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.update();
            });
        });
    }
    
    // Continue game functionality disabled - no need to save state
    // if (solitaireGame) {
    //     solitaireGame.saveGameState();
    // }
    
    window.location.reload();
}

/**
 * Dismiss update notification
 */
function dismissUpdate() {
    const banner = document.getElementById('update-banner');
    if (banner) {
        banner.remove();
    }
}

/**
 * Show fatal error message
 */
function showFatalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #d32f2f;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 2rem;
    `;
    
    errorDiv.innerHTML = `
        <h1 style="margin-bottom: 2rem;">Oops! Something went wrong</h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; max-width: 600px;">${message}</p>
        <button onclick="window.location.reload()" style="padding: 1rem 2rem; font-size: 1.1rem; background: white; color: #d32f2f; border: none; border-radius: 8px; cursor: pointer;">
            Refresh Page
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Load version from manifest.toml and display it
 */
function loadVersionFromManifest() {
    fetch('./manifest.toml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(tomlText => {
            // Parse TOML to extract version
            const versionMatch = tomlText.match(/version\s*=\s*"([^"]+)"/);
            if (versionMatch && versionMatch[1]) {
                const version = versionMatch[1];
                const versionDisplay = document.getElementById('version-display');
                if (versionDisplay) {
                    versionDisplay.textContent = `v${version}`;
                }
                console.log(`Version loaded from manifest: ${version}`);
            } else {
                console.warn('Could not parse version from manifest.toml');
            }
        })
        .catch(error => {
            console.warn('Failed to load version from manifest.toml:', error);
            // Fallback - try to get version from package.json or use default
            const versionDisplay = document.getElementById('version-display');
            if (versionDisplay) {
                versionDisplay.textContent = 'v1.0.0'; // Fallback version
            }
        });
}

/**
 * Setup custom card back image
 */
function setupCustomCardBack() {
    try {
        // Set the custom card back image to the user's specified file
        Card.setCustomCardBackImage('assets/image/my-card-back.jpg');
        console.log('Custom card back image set to: assets/image/my-card-back.jpg');
    } catch (error) {
        console.warn('Failed to set custom card back image:', error);
        // Fallback to default card back if there's an issue
    }
}

/**
 * Debug functions (available in console)
 */
window.debugSolitaire = {
    // Game state functions
    getGameState: () => solitaireGame?.gameState,
    getDifficulty: () => solitaireGame?.difficultyManager?.currentDifficulty,
    getDebugInfo: () => solitaireGame?.getDebugInfo(),
    exportGame: () => solitaireGame?.exportGameState(),
    importGame: (data) => solitaireGame?.importGameState(data),
    resetStats: () => solitaireGame?.resetStatistics(),
    getAnalytics: () => solitaireGame?.getGameAnalytics(),
    isWinnable: () => solitaireGame?.isGameWinnable(),
    getAvailableMoves: () => solitaireGame?.getAvailableMovesCount(),
    
    // Testing functions
    testDistance: () => solitaireGame?.tvRemote?.testCalculateDistance(),
    testKeyboard: () => solitaireGame?.uiManager?.testKeyboardNavigation(),
    testNavigation: (direction) => solitaireGame?.uiManager?.testNavigationDirection(direction),
    
    // Quick navigation tests
    testUp: () => solitaireGame?.uiManager?.testNavigationDirection('up'),
    testDown: () => solitaireGame?.uiManager?.testNavigationDirection('down'),
    testLeft: () => solitaireGame?.uiManager?.testNavigationDirection('left'),
    testRight: () => solitaireGame?.uiManager?.testNavigationDirection('right'),
    
    // Audio troubleshooting functions for Fire TV
    getAudioDiagnostics: () => solitaireGame?.soundManager?.getAudioDiagnostics(),
    forceAudioInit: () => solitaireGame?.soundManager?.forceAudioInitialization(),
    testAudioBeep: () => solitaireGame?.soundManager?.playAudibleTest(),
    resumeAudio: () => solitaireGame?.soundManager?.resumeAudio(),
    
    // Audio testing shortcuts
    testCardSound: () => solitaireGame?.soundManager?.cardFlip(),
    testMoveSound: () => solitaireGame?.soundManager?.moveSuccess(),
    testMenuSound: () => solitaireGame?.soundManager?.menuClick(),
    
    // Helper functions
    startGame: (difficulty = 'medium') => solitaireGame?.uiManager?.startNewGame(difficulty),
    getCurrentFocus: () => solitaireGame?.uiManager?.getCurrentFocusElement(),
    getNavState: () => solitaireGame?.uiManager?.keyboardNavigation,
    
    // Debug panel functions
    toggleDebug: () => toggleDebugPanel(),
    clearDebug: () => clearDebugLog(),
    logTest: (message) => logInfo(`Test: ${message}`)
};

/**
 * Performance monitoring
 */
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('App load performance:', {
                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                totalTime: perfData.loadEventEnd - perfData.fetchStart
            });
        }, 0);
    });
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}

// Make functions globally available
window.reloadApp = reloadApp;
window.dismissUpdate = dismissUpdate;
window.toggleDebugPanel = toggleDebugPanel;
window.clearDebugLog = clearDebugLog;

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
 * Supports both key names and Android KeyEvent constants for different Fire TV remote types
 */
function setupTVRemoteHandlers() {
    document.addEventListener('keydown', (event) => {
        const key = event.key;
        const code = event.code;
        const keyCode = event.keyCode;
        
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
        
        console.log('Fire TV Key pressed:', key, 'Code:', code, 'KeyCode:', keyCode);
        
        // Handle Android KeyEvent constants for Fire TV remotes
        // These correspond to the KEYCODE_* constants from Android KeyEvent class
        handleFireTVKeyCode(keyCode, currentScreen, event);
        
        // Handle key names for other Fire TV remote types
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
    
    console.log('Fire TV remote handlers initialized with standard keydown events and Android KeyEvent support');
}

/**
 * Handle Fire TV remote buttons using Android KeyEvent constants
 * Maps keyCode numbers to corresponding Fire TV remote actions
 * 
 * Reference: Android KeyEvent constants
 * KEYCODE_DPAD_CENTER = 23, KEYCODE_BUTTON_A = 96
 * KEYCODE_DPAD_LEFT = 21, KEYCODE_DPAD_RIGHT = 22  
 * KEYCODE_DPAD_UP = 19, KEYCODE_DPAD_DOWN = 20
 * KEYCODE_BACK = 4, KEYCODE_MENU = 82
 * KEYCODE_MEDIA_PLAY_PAUSE = 85, KEYCODE_MEDIA_REWIND = 89, KEYCODE_MEDIA_FAST_FORWARD = 90
 */
function handleFireTVKeyCode(keyCode, currentScreen, event) {
    // Map Android KeyEvent constants to actions
    switch (keyCode) {
        // D-Pad Center (Select) - KEYCODE_DPAD_CENTER = 23
        case 23:
        // Game Controller A Button - KEYCODE_BUTTON_A = 96  
        case 96:
            console.log('Fire TV D-Pad Center/A button pressed (KeyCode:', keyCode, ')');
            logFunctionCall('D-Pad Center/A Button', `Android KeyCode ${keyCode} (KEYCODE_DPAD_CENTER/BUTTON_A)`);
            // Let the TV remote handler manage focus and selection
            if (solitaireGame?.tvRemote) {
                event.preventDefault();
                solitaireGame.tvRemote.handleSelect();
            }
            break;
            
        // D-Pad Left - KEYCODE_DPAD_LEFT = 21
        case 21:
            console.log('Fire TV D-Pad Left pressed (KeyCode:', keyCode, ')');
            logFunctionCall('D-Pad Left', `Android KeyCode ${keyCode} (KEYCODE_DPAD_LEFT)`);
            if (solitaireGame?.tvRemote) {
                event.preventDefault();
                solitaireGame.tvRemote.navigateLeft();
            }
            break;
            
        // D-Pad Right - KEYCODE_DPAD_RIGHT = 22  
        case 22:
            console.log('Fire TV D-Pad Right pressed (KeyCode:', keyCode, ')');
            logFunctionCall('D-Pad Right', `Android KeyCode ${keyCode} (KEYCODE_DPAD_RIGHT)`);
            if (solitaireGame?.tvRemote) {
                event.preventDefault();
                solitaireGame.tvRemote.navigateRight();
            }
            break;
            
        // D-Pad Up - KEYCODE_DPAD_UP = 19
        case 19:
            console.log('Fire TV D-Pad Up pressed (KeyCode:', keyCode, ')');
            logFunctionCall('D-Pad Up', `Android KeyCode ${keyCode} (KEYCODE_DPAD_UP)`);
            if (solitaireGame?.tvRemote) {
                event.preventDefault();
                solitaireGame.tvRemote.navigateUp();
            }
            break;
            
        // D-Pad Down - KEYCODE_DPAD_DOWN = 20
        case 20:
            console.log('Fire TV D-Pad Down pressed (KeyCode:', keyCode, ')');
            logFunctionCall('D-Pad Down', `Android KeyCode ${keyCode} (KEYCODE_DPAD_DOWN)`);
            if (solitaireGame?.tvRemote) {
                event.preventDefault();
                solitaireGame.tvRemote.navigateDown();
            }
            break;
            
        // Back Button - KEYCODE_BACK = 4
        case 4:
            console.log('Fire TV Back button pressed (KeyCode:', keyCode, ')');
            logFunctionCall('Back Button', `Android KeyCode ${keyCode} (KEYCODE_BACK)`);
            event.preventDefault();
            event.stopPropagation();
            // Directly call UI manager's back button handler to avoid event conflicts
            if (solitaireGame?.uiManager) {
                solitaireGame.uiManager.handleBackButton();
            } else {
                // Fallback: dispatch custom event
                document.dispatchEvent(new CustomEvent('tvback'));
            }
            break;
            
        // Menu Button - KEYCODE_MENU = 82
        case 82:
            console.log('Fire TV Menu button pressed (KeyCode:', keyCode, ')');
            logFunctionCall('Menu Button', `Android KeyCode ${keyCode} (KEYCODE_MENU)`);
            event.preventDefault();
            if (currentScreen?.id === 'game-screen') {
                solitaireGame.uiManager.showScreen('main-menu');
            } else {
                solitaireGame.uiManager.showScreen('main-menu');
            }
            break;
            
        // Play/Pause Button - KEYCODE_MEDIA_PLAY_PAUSE = 85
        case 85:
            if (currentScreen?.id === 'game-screen') {
                event.preventDefault();
                console.log('Fire TV Play/Pause button pressed (KeyCode:', keyCode, ') - Drawing from stock');
                logFunctionCall('Play/Pause Button - Draw from stock', `Android KeyCode ${keyCode} (KEYCODE_MEDIA_PLAY_PAUSE)`);
                const stockPile = document.querySelector('.stock-pile');
                if (stockPile) {
                    stockPile.click();
                }
            }
            break;
            
        // Rewind Button - KEYCODE_MEDIA_REWIND = 89  
        case 89:
            if (currentScreen?.id === 'game-screen') {
                event.preventDefault();
                console.log('Fire TV Rewind button pressed (KeyCode:', keyCode, ') - Undo move');
                logFunctionCall('Rewind Button - Undo move', `Android KeyCode ${keyCode} (KEYCODE_MEDIA_REWIND)`);
                const undoBtn = document.getElementById('undo-btn');
                if (undoBtn && !undoBtn.disabled) {
                    undoBtn.click();
                }
            }
            break;
            
        // Fast Forward Button - KEYCODE_MEDIA_FAST_FORWARD = 90
        case 90:
            if (currentScreen?.id === 'game-screen') {
                event.preventDefault();
                console.log('Fire TV Fast Forward button pressed (KeyCode:', keyCode, ') - Show hint');
                logFunctionCall('Fast Forward Button - Show hint', `Android KeyCode ${keyCode} (KEYCODE_MEDIA_FAST_FORWARD)`);
                const hintBtn = document.getElementById('hint-btn');
                if (hintBtn && !hintBtn.disabled) {
                    hintBtn.click();
                }
            }
            break;
            
        // Channel Up Button - KEYCODE_CHANNEL_UP = 166
        case 166:
            if (currentScreen?.id === 'game-screen') {
                event.preventDefault();
                console.log('Fire TV Channel Up button pressed (KeyCode:', keyCode, ') - Show hint');
                logFunctionCall('Channel Up Button - Show hint', `Android KeyCode ${keyCode} (KEYCODE_CHANNEL_UP)`);
                const hintBtn = document.getElementById('hint-btn');
                if (hintBtn && !hintBtn.disabled) {
                    hintBtn.click();
                }
            }
            break;
            
        // Channel Down Button - KEYCODE_CHANNEL_DOWN = 167
        case 167:
            if (currentScreen?.id === 'game-screen') {
                event.preventDefault();
                console.log('Fire TV Channel Down button pressed (KeyCode:', keyCode, ') - Undo move');
                logFunctionCall('Channel Down Button - Undo move', `Android KeyCode ${keyCode} (KEYCODE_CHANNEL_DOWN)`);
                const undoBtn = document.getElementById('undo-btn');
                if (undoBtn && !undoBtn.disabled) {
                    undoBtn.click();
                }
            }
            break;
    }
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
    // Don't stack prompts if the SW reports an update more than once.
    const existing = document.getElementById('update-banner');
    if (existing) {
        if (existing._cleanup) existing._cleanup();
        existing.remove();
    }

    // A centered modal, not a top banner. This lives on document.body, OUTSIDE
    // any .screen — and the TV remote's focus scan only accepts .focusable
    // elements inside .screen.active, so a body-level element can never join
    // that list. It therefore owns its own D-pad handling, the same way the
    // exit-confirmation modal in ui.js does. (The old version had mouse-only
    // onclick handlers, making it unreachable by remote.)
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.className = 'modal active';
    updateBanner.style.zIndex = '6000';

    updateBanner.innerHTML = `
        <div class="modal-content" style="text-align: center; padding: 3rem; max-width: 900px;">
            <h2 style="margin-bottom: 1rem; color: #ffdd44; font-size: 2.5rem;">A new version is available</h2>
            <p style="margin-bottom: 2rem; font-size: 1.5rem; line-height: 1.5;">
                Update now to get the latest Solitaire on Demand.
            </p>
            <div class="modal-buttons" style="display: flex; gap: 1.5rem; justify-content: center;">
                <button id="update-now-btn" class="modal-btn focusable"
                        style="padding: 1.25rem 2.5rem; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 1.5rem;">
                    Update Now
                </button>
                <button id="update-later-btn" class="modal-btn focusable"
                        style="padding: 1.25rem 2.5rem; background: transparent; color: white; border: 2px solid white; border-radius: 8px; font-size: 1.5rem;">
                    Later
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(updateBanner);

    const buttons = [
        updateBanner.querySelector('#update-now-btn'),
        updateBanner.querySelector('#update-later-btn'),
    ];
    let current = 0;

    const paint = () => {
        buttons.forEach((b, i) => b.classList.toggle('focused', i === current));
        buttons[current].focus();
    };

    buttons[0].addEventListener('click', reloadApp);
    buttons[1].addEventListener('click', dismissUpdate);

    // Capture-phase handler so the prompt gets keys before the game's own
    // listeners, and nothing leaks through to the board behind it.
    const onKeydown = (event) => {
        const key = event.key;
        const code = event.keyCode;
        let handled = true;

        // Left/Up (Android KEYCODE_DPAD_LEFT=21, UP=19)
        if (key === 'ArrowLeft' || key === 'ArrowUp' || code === 21 || code === 19) {
            current = current > 0 ? current - 1 : buttons.length - 1;
            paint();
        }
        // Right/Down/Tab (RIGHT=22, DOWN=20)
        else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab' || code === 22 || code === 20) {
            current = current < buttons.length - 1 ? current + 1 : 0;
            paint();
        }
        // Select (DPAD_CENTER=23, BUTTON_A=96)
        else if (key === 'Enter' || key === ' ' || code === 23 || code === 96) {
            buttons[current].click();
        }
        // Back dismisses = "Later" (BACK=4, ESCAPE=27)
        else if (key === 'Escape' || code === 4 || code === 27) {
            dismissUpdate();
        } else {
            handled = false;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    // Fire TV Back can also arrive as the app's custom 'tvback' event.
    const onTvBack = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dismissUpdate();
    };

    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('tvback', onTvBack, true);

    updateBanner._cleanup = () => {
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('tvback', onTvBack, true);
    };

    // Default to "Update Now"; give the DOM a beat to lay out first.
    setTimeout(paint, 100);
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
        // Remove the capture-phase key listeners, or they'd keep swallowing
        // D-pad input after the prompt is gone.
        if (banner._cleanup) banner._cleanup();
        banner.remove();
    }

    // Hand D-pad focus back to whatever screen is underneath, otherwise the
    // remote is left pointing at a detached button and Select does nothing.
    if (solitaireGame?.tvRemote) {
        setTimeout(() => solitaireGame.tvRemote.refresh(), 100);
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
        <h1 style="margin-bottom: 2rem; font-size: 2.5rem;">Oops! Something went wrong</h1>
        <p style="font-size: 1.5rem; margin-bottom: 2rem; max-width: 800px;">${message}</p>
        <button id="fatal-refresh-btn" style="padding: 1.25rem 2.5rem; font-size: 1.5rem; background: white; color: #d32f2f; border: 3px solid #ffdd44; border-radius: 8px; cursor: pointer;">
            Refresh Page
        </button>
    `;

    document.body.appendChild(errorDiv);

    // Remote-reachable: this screen appears when init failed, so the normal
    // TV-remote focus system may not exist. Wire the key handling directly and
    // give the button DOM focus, otherwise a TV player is stuck on a screen
    // whose only control needs a mouse.
    const refreshBtn = errorDiv.querySelector('#fatal-refresh-btn');
    refreshBtn.addEventListener('click', () => window.location.reload());

    document.addEventListener('keydown', (event) => {
        // Any Select or Back press reloads — there's only one action here.
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape' ||
            event.keyCode === 23 || event.keyCode === 96 ||
            event.keyCode === 4 || event.keyCode === 27) {
            event.preventDefault();
            window.location.reload();
        }
    }, true);

    setTimeout(() => refreshBtn.focus(), 100);
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

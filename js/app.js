/**
 * Application Entry Point for Solitaire On Demand
 * Initializes the game and handles global app lifecycle
 */

// Global game instance
let solitaireGame = null;

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Solitaire On Demand...');
    
    try {
        // Create the main game instance
        solitaireGame = new SolitaireGame();
        
        // Make game instance globally accessible for debugging
        window.solitaireGame = solitaireGame;
        
        // Setup global error handling
        setupErrorHandling();
        
        // Setup service worker for PWA functionality
        setupServiceWorker();
        
        // Check for saved game and offer to restore
        checkForSavedGame();
        
        console.log('Solitaire On Demand initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showFatalError('Failed to start the game. Please refresh the page and try again.');
    }
}

/**
 * Setup global error handling
 */
function setupErrorHandling() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
        console.error('Uncaught error:', event.error);
        
        if (solitaireGame) {
            solitaireGame.showErrorMessage('An unexpected error occurred. The game will continue, but you may want to refresh the page.');
        }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
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
    
    // Save current game state before reloading
    if (solitaireGame) {
        solitaireGame.saveGameState();
    }
    
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
 * Check for saved game and offer to restore
 */
function checkForSavedGame() {
    setTimeout(() => {
        if (solitaireGame && solitaireGame.loadGameState()) {
            const restoreBanner = document.createElement('div');
            restoreBanner.id = 'restore-banner';
            restoreBanner.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 1rem 2rem;
                border-radius: 8px;
                z-index: 5000;
                font-size: 1rem;
                text-align: center;
            `;
            
            restoreBanner.innerHTML = `
                <div style="margin-bottom: 1rem;">Continue your previous game?</div>
                <button onclick="restoreGame()" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Continue
                </button>
                <button onclick="dismissRestore()" style="padding: 0.5rem 1rem; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer;">
                    New Game
                </button>
            `;
            
            document.body.appendChild(restoreBanner);
            
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                dismissRestore();
            }, 10000);
        }
    }, 1000);
}

/**
 * Restore saved game
 */
function restoreGame() {
    if (solitaireGame) {
        solitaireGame.uiManager.showScreen('game-screen');
        solitaireGame.uiManager.renderGameBoard();
    }
    
    dismissRestore();
}

/**
 * Dismiss restore notification and clear saved game
 */
function dismissRestore() {
    const banner = document.getElementById('restore-banner');
    if (banner) {
        banner.remove();
    }
    
    if (solitaireGame) {
        solitaireGame.clearSavedGame();
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
 * Handle app installation prompt
 */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    
    // Save the event so it can be triggered later
    deferredPrompt = event;
    
    // Show install button or banner
    showInstallPrompt();
});

/**
 * Show install prompt
 */
function showInstallPrompt() {
    const installBanner = document.createElement('div');
    installBanner.id = 'install-banner';
    installBanner.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 5000;
        font-size: 0.9rem;
        max-width: 300px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;
    
    installBanner.innerHTML = `
        <div style="margin-bottom: 1rem;">Install Solitaire On Demand for quick access!</div>
        <button onclick="installApp()" style="margin-right: 1rem; padding: 0.5rem 1rem; background: white; color: #4CAF50; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
            Install
        </button>
        <button onclick="dismissInstall()" style="padding: 0.5rem 1rem; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
            Not Now
        </button>
    `;
    
    document.body.appendChild(installBanner);
    
    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        dismissInstall();
    }, 15000);
}

/**
 * Install the app
 */
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            deferredPrompt = null;
        });
    }
    
    dismissInstall();
}

/**
 * Dismiss install prompt
 */
function dismissInstall() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.remove();
    }
}

/**
 * Handle app lifecycle events
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden - pausing game');
    } else {
        console.log('App visible - resuming game');
    }
});

/**
 * Debug functions (available in console)
 */
window.debugSolitaire = {
    getGameState: () => solitaireGame?.gameState,
    getDifficulty: () => solitaireGame?.difficultyManager?.currentDifficulty,
    getDebugInfo: () => solitaireGame?.getDebugInfo(),
    exportGame: () => solitaireGame?.exportGameState(),
    importGame: (data) => solitaireGame?.importGameState(data),
    resetStats: () => solitaireGame?.resetStatistics(),
    getAnalytics: () => solitaireGame?.getGameAnalytics(),
    isWinnable: () => solitaireGame?.isGameWinnable(),
    getAvailableMoves: () => solitaireGame?.getAvailableMovesCount()
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
window.restoreGame = restoreGame;
window.dismissRestore = dismissRestore;
window.installApp = installApp;
window.dismissInstall = dismissInstall;

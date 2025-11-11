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
 * Setup Fire TV remote button handlers
 * Maps Fire TV remote buttons to game functions:
 * - Menu button → Menu action
 * - Play button → Hint action
 * - Back button → Undo action
 */
function setupTVRemoteHandlers() {
    // Handle Menu button press
    document.addEventListener('tvmenu', (event) => {
        console.log('TV Menu button pressed');
        
        if (solitaireGame) {
            const currentScreen = document.querySelector('.screen.active');
            
            if (currentScreen && currentScreen.id === 'game-screen') {
                // In game screen - return to main menu
                solitaireGame.uiManager.showScreen('main-menu');
            } else {
                // In other screens - try to go back or to main menu
                solitaireGame.uiManager.showScreen('main-menu');
            }
        }
    });
    
    // Handle Play button press (for Hint functionality)
    document.addEventListener('tvplay', (event) => {
        console.log('TV Play button pressed (Hint)');
        
        if (solitaireGame) {
            const currentScreen = document.querySelector('.screen.active');
            
            if (currentScreen && currentScreen.id === 'game-screen') {
                // Only show hints in game screen
                const hintBtn = document.getElementById('hint-btn');
                if (hintBtn && !hintBtn.disabled) {
                    hintBtn.click();
                }
            }
        }
    });
    
    // Handle Back button press (for Undo functionality)
    document.addEventListener('tvback', (event) => {
        console.log('TV Back button pressed');
        
        if (solitaireGame) {
            const currentScreen = document.querySelector('.screen.active');
            
            if (currentScreen && currentScreen.id === 'game-screen') {
                // In game screen - try to undo move
                const undoBtn = document.getElementById('undo-btn');
                if (undoBtn && !undoBtn.disabled) {
                    undoBtn.click();
                } else {
                    // If undo not available, go back to menu
                    solitaireGame.uiManager.showScreen('main-menu');
                }
            } else {
                // In other screens - go back to main menu
                solitaireGame.uiManager.showScreen('main-menu');
            }
        }
    });
    
    console.log('Fire TV remote handlers initialized');
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
        // The game state was already loaded in checkForSavedGame()
        // Now we need to properly restore the UI and render the board
        try {
            // Switch to game screen
            solitaireGame.uiManager.showScreen('game-screen');
            
            // Update difficulty display
            solitaireGame.uiManager.updateDifficultyDisplay();
            
            // Render the game board with the loaded state
            solitaireGame.uiManager.renderGameBoard();
            
            // Update UI elements (timer, score, moves)
            solitaireGame.uiManager.updateGameInfo();
            
            // Update button states
            solitaireGame.uiManager.updateButtonStates();
            
            // Resume the game timer if the game was in progress
            if (solitaireGame.gameState.startTime && !solitaireGame.gameState.gameWon) {
                solitaireGame.uiManager.startGameTimer();
            }
            
            // Refresh TV remote focus
            solitaireGame.tvRemote.refresh();
            
            console.log('Game restored successfully');
        } catch (error) {
            console.error('Failed to restore game:', error);
            // If restore fails, start a new game instead
            solitaireGame.uiManager.startNewGame('medium');
        }
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
    
    // Helper functions
    startGame: (difficulty = 'medium') => solitaireGame?.uiManager?.startNewGame(difficulty),
    getCurrentFocus: () => solitaireGame?.uiManager?.getCurrentFocusElement(),
    getNavState: () => solitaireGame?.uiManager?.keyboardNavigation
};

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

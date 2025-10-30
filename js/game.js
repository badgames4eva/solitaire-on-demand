/**
 * Main Game Controller for Solitaire On Demand
 * Coordinates all game systems and manages the overall game flow
 */
class SolitaireGame {
    constructor() {
        this.gameState = null;
        this.difficultyManager = null;
        this.tvRemote = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the game
     */
    init() {
        try {
            // Initialize core systems
            this.gameState = new GameState();
            this.difficultyManager = new DifficultyManager();
            this.tvRemote = new TVRemoteHandler();
            
            // Initialize UI manager with dependencies
            this.uiManager = new UIManager(
                this.gameState, 
                this.difficultyManager, 
                this.tvRemote
            );
            
            // Setup game-specific event handlers
            this.setupGameEventHandlers();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('Solitaire On Demand initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showErrorMessage('Failed to initialize game. Please refresh the page.');
        }
    }

    /**
     * Setup game-specific event handlers
     */
    setupGameEventHandlers() {
        // Hint button handler
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                this.showHint();
            });
        }

        // Undo button handler
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undoMove();
            });
        }

        // Menu button handler
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.uiManager.showScreen('main-menu');
            });
        }

        // Settings change handlers
        const autoCompleteCheckbox = document.getElementById('auto-complete');
        if (autoCompleteCheckbox) {
            autoCompleteCheckbox.addEventListener('change', () => {
                this.uiManager.saveSettings();
            });
        }

        const showHintsCheckbox = document.getElementById('show-hints');
        if (showHintsCheckbox) {
            showHintsCheckbox.addEventListener('change', () => {
                this.uiManager.saveSettings();
                this.uiManager.updateButtonStates();
            });
        }

        const soundEffectsCheckbox = document.getElementById('sound-effects');
        if (soundEffectsCheckbox) {
            soundEffectsCheckbox.addEventListener('change', () => {
                this.uiManager.saveSettings();
            });
        }

        // Modal close handlers
        const gameOverModal = document.getElementById('game-over-modal');
        if (gameOverModal) {
            gameOverModal.addEventListener('click', (event) => {
                if (event.target === gameOverModal) {
                    this.closeModal();
                }
            });
        }

        // Keyboard shortcuts for non-TV environments
        if (!this.tvRemote.isFireTV) {
            document.addEventListener('keydown', (event) => {
                this.handleKeyboardShortcuts(event);
            });
        }

        // Visibility change handler (pause/resume)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Before unload handler (save game state)
        window.addEventListener('beforeunload', () => {
            this.saveGameState();
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (this.uiManager.currentScreen !== 'game-screen') return;

        switch (event.key.toLowerCase()) {
            case 'h':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.showHint();
                }
                break;
            case 'u':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.undoMove();
                }
                break;
            case 'n':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.startNewGame();
                }
                break;
            case 'm':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.uiManager.showScreen('main-menu');
                }
                break;
        }
    }

    /**
     * Handle visibility change (tab switching, minimizing)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Game is hidden, pause timer and save state
            this.pauseGame();
        } else {
            // Game is visible, resume timer
            this.resumeGame();
        }
    }

    /**
     * Show hint
     */
    showHint() {
        if (!this.difficultyManager.canShowHints()) {
            this.uiManager.showMessage('Hints are not available in this difficulty mode.');
            return;
        }

        const settings = this.uiManager.getSettings();
        if (!settings.showHints) {
            this.uiManager.showMessage('Hints are disabled in settings.');
            return;
        }

        this.uiManager.showHint();
    }

    /**
     * Undo last move
     */
    undoMove() {
        const undoCount = this.gameState.moveHistory.length;
        
        if (!this.difficultyManager.canUndo(undoCount)) {
            const limit = this.difficultyManager.getUndoLimit();
            this.uiManager.showMessage(`Undo limit reached (${limit} undos allowed in this difficulty).`);
            return;
        }

        this.uiManager.undoMove();
    }

    /**
     * Start a new game with current or specified difficulty
     */
    startNewGame(difficulty = null) {
        const targetDifficulty = difficulty || this.gameState.difficulty || 'medium';
        this.uiManager.startNewGame(targetDifficulty);
    }

    /**
     * Pause the game
     */
    pauseGame() {
        this.uiManager.stopGameTimer();
        this.saveGameState();
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.uiManager.currentScreen === 'game-screen' && 
            this.gameState.startTime && 
            !this.gameState.gameWon) {
            this.uiManager.startGameTimer();
        }
    }

    /**
     * Save current game state to localStorage
     */
    saveGameState() {
        if (!this.gameState || this.gameState.gameWon) return;

        try {
            const gameData = {
                gameState: this.gameState.toJSON(),
                difficulty: this.difficultyManager.currentDifficulty,
                timestamp: Date.now()
            };
            
            localStorage.setItem('solitaire-current-game', JSON.stringify(gameData));
        } catch (error) {
            console.warn('Failed to save game state:', error);
        }
    }

    /**
     * Load saved game state from localStorage
     */
    loadGameState() {
        try {
            const saved = localStorage.getItem('solitaire-current-game');
            if (!saved) return false;

            const gameData = JSON.parse(saved);
            
            // Check if saved game is not too old (24 hours)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            if (Date.now() - gameData.timestamp > maxAge) {
                localStorage.removeItem('solitaire-current-game');
                return false;
            }

            // Restore game state
            this.gameState = GameState.fromJSON(gameData.gameState);
            this.difficultyManager.setDifficulty(gameData.difficulty);
            
            return true;
        } catch (error) {
            console.warn('Failed to load game state:', error);
            localStorage.removeItem('solitaire-current-game');
            return false;
        }
    }

    /**
     * Clear saved game state
     */
    clearSavedGame() {
        localStorage.removeItem('solitaire-current-game');
    }

    /**
     * Close modal dialogs
     */
    closeModal() {
        const modal = document.getElementById('game-over-modal');
        if (modal) {
            modal.classList.remove('active');
            this.tvRemote.refresh();
        }
    }

    /**
     * Get game statistics for analytics
     */
    getGameAnalytics() {
        if (!this.gameState) return null;

        const analysis = this.difficultyManager.hintSystem.analyzeGameState(this.gameState);
        const stats = this.gameState.getGameStats();

        return {
            ...stats,
            ...analysis,
            difficulty: this.difficultyManager.currentDifficulty,
            hintsUsed: 0, // Could track this if needed
            autoCompleteUsed: false // Could track this if needed
        };
    }

    /**
     * Check if the game is in a winnable state
     */
    isGameWinnable() {
        if (!this.gameState) return false;
        
        return !this.difficultyManager.hintSystem.isGameStuck(this.gameState);
    }

    /**
     * Get available moves count
     */
    getAvailableMovesCount() {
        if (!this.gameState) return 0;
        
        const moves = this.difficultyManager.hintSystem.findAvailableMoves(this.gameState);
        return moves.filter(move => move.type !== 'draw-stock').length;
    }

    /**
     * Reset game statistics
     */
    resetStatistics() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            localStorage.removeItem('solitaire-stats');
            this.uiManager.updateStatsDisplay();
            this.uiManager.showMessage('Statistics have been reset.');
        }
    }

    /**
     * Export game state for sharing or debugging
     */
    exportGameState() {
        if (!this.gameState) return null;

        return {
            version: '1.0',
            gameState: this.gameState.toJSON(),
            difficulty: this.difficultyManager.currentDifficulty,
            timestamp: Date.now(),
            analytics: this.getGameAnalytics()
        };
    }

    /**
     * Import game state from exported data
     */
    importGameState(exportedData) {
        try {
            if (!exportedData || exportedData.version !== '1.0') {
                throw new Error('Invalid or unsupported game data format');
            }

            this.gameState = GameState.fromJSON(exportedData.gameState);
            this.difficultyManager.setDifficulty(exportedData.difficulty);
            
            this.uiManager.showScreen('game-screen');
            this.uiManager.renderGameBoard();
            
            return true;
        } catch (error) {
            console.error('Failed to import game state:', error);
            this.uiManager.showMessage('Failed to import game data.');
            return false;
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        // Create error display if it doesn't exist
        let errorEl = document.getElementById('error-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'error-message';
            errorEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #d32f2f;
                color: white;
                padding: 2rem;
                border-radius: 8px;
                z-index: 4000;
                font-size: 1.1rem;
                text-align: center;
                max-width: 400px;
            `;
            document.body.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    /**
     * Check for updates or new features
     */
    checkForUpdates() {
        // This could check for app updates in a real deployment
        console.log('Checking for updates...');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentScreen: this.uiManager?.currentScreen,
            gameState: this.gameState?.toJSON(),
            difficulty: this.difficultyManager?.currentDifficulty,
            tvRemoteEnabled: this.tvRemote?.isEnabled,
            isFireTV: this.tvRemote?.isFireTV,
            availableMoves: this.getAvailableMovesCount(),
            isWinnable: this.isGameWinnable()
        };
    }

    /**
     * Cleanup and destroy the game
     */
    destroy() {
        // Save current game state
        this.saveGameState();
        
        // Cleanup components
        if (this.uiManager) {
            this.uiManager.destroy();
        }
        
        if (this.tvRemote) {
            this.tvRemote.destroy();
        }
        
        // Clear timers and intervals
        this.pauseGame();
        
        // Remove event listeners
        window.removeEventListener('beforeunload', this.saveGameState);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        console.log('Solitaire On Demand destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolitaireGame;
}

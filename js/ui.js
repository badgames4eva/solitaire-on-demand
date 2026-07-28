/**
 * UI Manager for Solitaire On Demand
 * Handles all user interface interactions, rendering, and screen management
 * Coordinates between game state, user input, and visual representation
 */
class UIManager {
    /**
     * Create the UI manager with references to core game systems
     * @param {GameState} gameState - The game state manager
     * @param {DifficultyManager} difficultyManager - The difficulty settings manager
     * @param {TVRemoteHandler} tvRemote - The TV remote navigation handler
     * @param {SoundManager} soundManager - The sound effects manager
     */
    constructor(gameState, difficultyManager, tvRemote, soundManager) {
        // Core system references
        this.gameState = gameState;                    // Access to game logic and state
        this.difficultyManager = difficultyManager;    // Access to difficulty rules
        this.tvRemote = tvRemote;                     // Access to navigation system
        this.soundManager = soundManager;             // Access to audio effects
        
        // UI state management
        this.currentScreen = 'main-menu';             // Currently active screen
        this.selectedCards = [];                      // Cards currently selected for moving
        this.selectedSource = null;                   // Where selected cards came from
        
        // Animation and timing
        this.gameTimer = null;                        // Timer for game duration tracking
        this.animationQueue = [];                     // Queue of animations to play
        this.isAnimating = false;                     // Whether animations are currently playing
        
        // Navigation state for keyboard/TV remote
        this.focusedElement = null;                   // Currently focused UI element
        this.keyboardNavigation = {
            currentColumn: 0,                         // Current column in tableau (0-6)
            currentRow: 0,                           // Current row within column
            currentArea: 'tableau'                   // Current game area: tableau, foundation, stock, waste, controls
        };
        
        // Screen navigation history for proper back button handling
        this.screenHistory = [];                      // Stack of previous screens for back navigation
        this.exitWarningShown = false;               // Flag to track if exit warning has been shown
        
        this.init(); // Initialize the UI system
    }

    /**
     * Initialize the UI manager by setting up event listeners and showing the main menu
     */
    init() {
        this.setupEventListeners(); // Set up all UI event handlers
        this.showScreen('main-menu'); // Start on the main menu screen
        this.loadSettings(); // Load user preferences from localStorage
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Menu button handlers
        document.addEventListener('click', (event) => {
            // Look for data-action attribute on clicked element or any parent
            const target = event.target.closest('[data-action]');
            
            if (target) {
                // Resume audio context on first user interaction
                if (this.soundManager) {
                    this.soundManager.resumeAudio();
                }
                
                // Play menu click sound
                if (this.soundManager) {
                    this.soundManager.menuClick();
                }
                
                this.handleAction(target.dataset.action, target);
            }
        });
        
        // Button hover sound effects
        document.addEventListener('mouseover', (event) => {
            if (event.target.matches('.menu-btn, .control-btn, .modal-btn') && this.soundManager) {
                this.soundManager.buttonHover();
            }
        });

        // Comprehensive Fire TV back button detection
        document.addEventListener('keydown', (event) => {
            // Comprehensive Fire TV back button detection
            const isFireTVBack = (
                event.keyCode === 27 ||                    // Standard Escape keyCode
                event.key === 'GoBack' ||                  // Fire TV specific
                event.key === 'BrowserBack' ||             // Alternative Fire TV key
                event.code === 'Escape' ||                 // Key code
                (event.keyCode === 8 && event.target.tagName !== 'INPUT') || // Backspace (not in input)
                event.key === 'Back'                       // Generic back key
            );
            
            if (isFireTVBack) {
                console.log('Fire TV Back button detected:', {
                    key: event.key,
                    keyCode: event.keyCode,
                    code: event.code,
                    type: 'back'
                });
                event.preventDefault();
                event.stopPropagation();
                this.handleBackButton();
                return;
            }
            
            
            this.handleKeyboard(event);
        });

        // TV remote back button handler
        document.addEventListener('tvback', (event) => {
            this.handleBackButton();
        });


        // Card interaction handlers
        document.addEventListener('click', (event) => {
            if (event.target.closest('.stock-pile')) {
                this.handleStockClick();
            } else if (event.target.closest('.tableau-column, .foundation-pile, .waste-pile')) {
                this.handleAreaClick(event.target.closest('.tableau-column, .foundation-pile, .waste-pile'));
            }
        });

        // Long press handlers for TV remote
        document.addEventListener('tvlongselect', (event) => {
            this.handleLongSelect(event.detail.element);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.updateLayout();
        });

        // Custom TV remote navigation for game screen
        this.setupGameNavigation();
        
        // Setup no moves indicator event handlers
        this.setupNoMovesIndicatorHandlers();
    }

    /**
     * Setup custom game navigation for TV remote
     */
    setupGameNavigation() {
        // Override TV remote navigation when in game screen
        const originalTVRemoteHandleKeyPress = this.tvRemote.handleKeyPress.bind(this.tvRemote);
        
        this.tvRemote.handleKeyPress = (eventType) => {
            // If we're in game screen, use our custom navigation
            if (this.currentScreen === 'game-screen') {
                this.handleGameNavigation(eventType);
            } else {
                // Use default TV remote navigation for other screens
                originalTVRemoteHandleKeyPress(eventType);
            }
        };
    }

    /**
     * Handle game-specific navigation
     */
    handleGameNavigation(eventType) {
        switch (eventType) {
            case 'up':
                this.navigateUp();
                this.updateKeyboardFocus();
                break;
            case 'down':
                this.navigateDown();
                this.updateKeyboardFocus();
                break;
            case 'left':
                this.navigateLeft();
                this.updateKeyboardFocus();
                break;
            case 'right':
                this.navigateRight();
                this.updateKeyboardFocus();
                break;
            case 'select':
                this.activateCurrentSelection();
                break;
            case 'back':
                this.handleBackButton();
                break;
            case 'menu':
                this.handleMenuButton();
                break;
        }
    }

    /**
     * Handle keyboard input for game navigation and actions
     */
    handleKeyboard(event) {
        // Only handle keyboard in game screen
        if (this.currentScreen !== 'game-screen') {
            return;
        }

        const key = event.key.toLowerCase();
        
        // Prevent default for game keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', ' ', 'escape', 'h', 'u', 'n', 'a'].includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            // Navigation - handled by TV remote system
            case 'arrowleft':
                // Navigation handled by handleGameNavigation via TV remote system
                break;
            case 'arrowright':
                // Navigation handled by handleGameNavigation via TV remote system
                break;
            case 'arrowup':
                // Navigation handled by handleGameNavigation via TV remote system
                break;
            case 'arrowdown':
                // Navigation handled by handleGameNavigation via TV remote system
                break;
            
            // Actions
            case 'Enter':
            case ' ':
                this.activateCurrentSelection();
                break;
            case 'escape':
                this.clearSelection();
                break;
            
            // Game shortcuts (require Ctrl modifier to prevent accidental activation)
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
                    this.startNewGame(this.gameState.difficulty);
                }
                break;
            case 'a':
                if (event.ctrlKey || event.metaKey && this.gameState.autoCompleteAvailable) {
                    event.preventDefault();
                    this.performAutoComplete();
                }
                break;
            
            // Number keys for quick column selection
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
                const column = parseInt(key) - 1;
                this.selectTableauColumn(column);
                break;
            
            // Tab to switch between areas
            case 'tab':
                this.switchArea();
                break;
        }
        
        this.updateKeyboardFocus();
    }

    /**
     * Navigate left in current area
     * Left/Right should allow navigation between foundation and stock/waste areas
     */
    navigateLeft() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                if (nav.currentColumn > 0) {
                    nav.currentColumn--;
                    // Always go to the last card (bottom) of the new column
                    const leftColumn = this.gameState.tableau[nav.currentColumn];
                    nav.currentRow = Math.max(0, leftColumn.length - 1);
                }
                break;
            case 'foundation':
                if (nav.currentColumn > 0) {
                    // Move within foundation piles
                    nav.currentColumn--;
                } else {
                    // From leftmost foundation pile, go to waste area
                    nav.currentArea = 'waste';
                    nav.currentColumn = 0;
                    nav.currentRow = 0;
                }
                break;
            case 'stock':
                // From stock, go to rightmost foundation pile
                nav.currentArea = 'foundation';
                nav.currentColumn = 3; // Rightmost foundation pile
                nav.currentRow = 0;
                break;
            case 'waste':
                // From waste, go to stock
                nav.currentArea = 'stock';
                nav.currentColumn = 0;
                nav.currentRow = 0;
                break;
            case 'controls':
                // Move between control buttons (Hint, Undo, Menu, Give Up)
                nav.currentColumn = Math.max(0, nav.currentColumn - 1);
                break;
        }
    }

    /**
     * Navigate right in current area
     * Left/Right should allow navigation between foundation and stock/waste areas
     */
    navigateRight() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                if (nav.currentColumn < 6) {
                    nav.currentColumn++;
                    // Always go to the last card (bottom) of the new column
                    const rightColumn = this.gameState.tableau[nav.currentColumn];
                    nav.currentRow = Math.max(0, rightColumn.length - 1);
                }
                break;
            case 'foundation':
                if (nav.currentColumn < 3) {
                    // Move within foundation piles
                    nav.currentColumn++;
                } else {
                    // From rightmost foundation pile, go to stock area
                    nav.currentArea = 'stock';
                    nav.currentColumn = 0;
                    nav.currentRow = 0;
                }
                break;
            case 'stock':
                // From stock, go to waste
                nav.currentArea = 'waste';
                nav.currentColumn = 0;
                nav.currentRow = 0;
                break;
            case 'waste':
                // From waste, go to leftmost foundation pile
                nav.currentArea = 'foundation';
                nav.currentColumn = 0; // Leftmost foundation pile
                nav.currentRow = 0;
                break;
            case 'controls':
                // Move between control buttons (Hint, Undo, Menu, Give Up)
                nav.currentColumn = Math.min(3, nav.currentColumn + 1);
                break;
        }
    }

    /**
     * Navigate up in current area using distance-based navigation when possible
     */
    navigateUp() {
        const nav = this.keyboardNavigation;
        
        // For tableau area, prioritize within-column navigation
        if (nav.currentArea === 'tableau') {
            const currentColumn = this.gameState.tableau[nav.currentColumn];
            if (currentColumn.length > 0 && nav.currentRow > 0) {
                // Move up within the column (to a lower index card)
                nav.currentRow--;
                return;
            } else if (currentColumn.length > 0 && nav.currentRow === 0) {
                // At top of column, move to foundation area above it
                nav.currentArea = 'foundation';
                // Map tableau columns to foundation piles (0-6 tableau -> 0-3 foundation)
                nav.currentColumn = Math.min(nav.currentColumn, 3);
                nav.currentRow = 0;
                return;
            }
        }
        
        // For other areas or when fallback is needed, use distance-based navigation
        const currentElement = this.getCurrentFocusElement();
        if (!currentElement) {
            // Fallback to hardcoded navigation
            this.navigateUpFallback();
            return;
        }
        
        // Try to find the best element above using distance calculation
        const bestElement = this.findBestElementInDirection(currentElement, 'up');
        if (bestElement) {
            this.focusElementAndUpdateNavigation(bestElement);
        } else {
            // Fallback to hardcoded navigation
            this.navigateUpFallback();
        }
    }

    /**
     * Navigate down in current area using distance-based navigation when possible
     */
    navigateDown() {
        const nav = this.keyboardNavigation;
        
        // For tableau area, prioritize within-column navigation
        if (nav.currentArea === 'tableau') {
            const currentColumn = this.gameState.tableau[nav.currentColumn];
            if (currentColumn.length > 0 && nav.currentRow < currentColumn.length - 1) {
                // Move down within the column (to a higher index card)
                nav.currentRow++;
                return;
            }
            // If already at bottom of column or empty column, stay there
            return;
        }
        
        // For other areas, use distance-based navigation
        const currentElement = this.getCurrentFocusElement();
        if (!currentElement) {
            // Fallback to hardcoded navigation
            this.navigateDownFallback();
            return;
        }
        
        // Try to find the best element below using distance calculation
        const bestElement = this.findBestElementInDirection(currentElement, 'down');
        if (bestElement) {
            this.focusElementAndUpdateNavigation(bestElement);
        } else {
            // Fallback to hardcoded navigation
            this.navigateDownFallback();
        }
    }

    /**
     * Fallback navigation up using hardcoded logic
     * Up/Down should navigate between control buttons and game areas
     */
    navigateUpFallback() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                // Allow vertical movement within tableau columns for multi-card selection
                const currentColumn = this.gameState.tableau[nav.currentColumn];
                if (currentColumn.length > 0 && nav.currentRow > 0) {
                    // Move up within the column (to a lower index card)
                    nav.currentRow--;
                } else {
                    // At top of column, move to foundation area above it
                    nav.currentArea = 'foundation';
                    // Map tableau columns to foundation piles (0-6 tableau -> 0-3 foundation)
                    nav.currentColumn = Math.min(nav.currentColumn, 3);
                    nav.currentRow = 0;
                }
                break;
            case 'foundation':
                // From foundation, go to control buttons (Hint, Undo, Menu)
                nav.currentArea = 'controls';
                // Map foundation column to control button (0-3 foundation -> 0-2 controls)
                nav.currentColumn = Math.min(nav.currentColumn, 2);
                nav.currentRow = 0;
                break;
            case 'stock':
                // From stock, go to control buttons
                nav.currentArea = 'controls';
                nav.currentColumn = 0; // Go to Hint button
                nav.currentRow = 0;
                break;
            case 'waste':
                // From waste, go to control buttons
                nav.currentArea = 'controls';
                nav.currentColumn = 1; // Go to Undo button
                nav.currentRow = 0;
                break;
            case 'controls':
                // Stay in controls, can't go higher (this is the top area)
                break;
        }
    }

    /**
     * Fallback navigation down using hardcoded logic
     * Up/Down should navigate between control buttons and game areas
     */
    navigateDownFallback() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'controls':
                // From controls, go to foundation area based on button position
                nav.currentArea = 'foundation';
                nav.currentColumn = Math.min(nav.currentColumn, 3);
                nav.currentRow = 0;
                break;
            case 'foundation':
                // From foundation, go to tableau below it
                nav.currentArea = 'tableau';
                // Map foundation piles to tableau columns (0-3 foundation -> 0-6 tableau)
                nav.currentColumn = Math.min(nav.currentColumn + 3, 6);
                const column = this.gameState.tableau[nav.currentColumn];
                nav.currentRow = Math.max(0, column.length - 1);
                break;
            case 'tableau':
                // Allow vertical movement within tableau columns for multi-card selection
                const currentColumn = this.gameState.tableau[nav.currentColumn];
                if (currentColumn.length > 0 && nav.currentRow < currentColumn.length - 1) {
                    // Move down within the column (to a higher index card)
                    nav.currentRow++;
                }
                // If already at bottom of column, stay there
                break;
            case 'stock':
                // From stock (menu area), go to foundation area
                nav.currentArea = 'foundation';
                nav.currentColumn = 0; // Go to first foundation pile
                nav.currentRow = 0;
                break;
            case 'waste':
                // From waste (menu area), go to foundation area
                nav.currentArea = 'foundation';
                nav.currentColumn = 1; // Go to second foundation pile
                nav.currentRow = 0;
                break;
        }
    }

    /**
     * Get the currently focused DOM element
     */
    getCurrentFocusElement() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                const columnElement = document.querySelector(`[data-column="${nav.currentColumn}"]`);
                if (columnElement) {
                    const cards = columnElement.querySelectorAll('.card');
                    return cards[nav.currentRow] || columnElement;
                }
                return columnElement;
            case 'foundation':
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                return document.querySelector(`[data-suit="${suits[nav.currentColumn]}"]`);
            case 'stock':
                return document.querySelector('.stock-pile');
            case 'waste':
                return document.querySelector('.waste-pile');
            case 'controls':
                // Control buttons: 0=Hint, 1=Undo, 2=Menu, 3=Give Up
                const controlButtons = ['hint-btn', 'undo-btn', 'menu-btn', 'give-up-btn'];
                return document.getElementById(controlButtons[nav.currentColumn]);
            default:
                return null;
        }
    }

    /**
     * Find the best element in a given direction using distance calculation
     */
    findBestElementInDirection(currentElement, direction) {
        if (!currentElement) return null;
        
        const currentRect = currentElement.getBoundingClientRect();
        let bestCandidate = null;
        let bestDistance = Infinity;
        
        // Get all possible focusable elements in the game area
        const candidates = this.getAllFocusableGameElements();
        
        for (const element of candidates) {
            if (element === currentElement) continue;
            
            const rect = element.getBoundingClientRect();
            let isInDirection = false;
            
            // Check if element is in the correct direction
            switch (direction) {
                case 'up':
                    isInDirection = rect.bottom <= currentRect.top;
                    break;
                case 'down':
                    isInDirection = rect.top >= currentRect.bottom;
                    break;
                case 'left':
                    isInDirection = rect.right <= currentRect.left;
                    break;
                case 'right':
                    isInDirection = rect.left >= currentRect.right;
                    break;
            }
            
            if (isInDirection) {
                // Use the TV remote's improved distance calculation
                const distance = this.tvRemote.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }
        
        return bestCandidate;
    }

    /**
     * Get all focusable game elements (cards, piles, etc.)
     */
    getAllFocusableGameElements() {
        const elements = [];
        
        // Add tableau columns and cards
        for (let col = 0; col < 7; col++) {
            const columnElement = document.querySelector(`[data-column="${col}"]`);
            if (columnElement) {
                elements.push(columnElement);
                const cards = columnElement.querySelectorAll('.card');
                elements.push(...cards);
            }
        }
        
        // Add foundation piles
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        for (const suit of suits) {
            const foundationElement = document.querySelector(`[data-suit="${suit}"]`);
            if (foundationElement) {
                elements.push(foundationElement);
            }
        }
        
        // Add stock and waste piles
        const stockElement = document.querySelector('.stock-pile');
        const wasteElement = document.querySelector('.waste-pile');
        if (stockElement) elements.push(stockElement);
        if (wasteElement) elements.push(wasteElement);
        
        return elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }

    /**
     * Handle TV remote back button with history tracking
     * Back button from game screen shows confirmation dialog to prevent accidental game loss
     */
    handleBackButton() {
        try {
            console.log('Back button pressed. Current screen:', this.currentScreen, 'History:', this.screenHistory);
            
            // Support (voluntary ad) screen: end the ad cleanly (cancels its
            // timers via ads.js resume()) and drop back to the menu. Do this
            // before the generic history pop so no countdown keeps running.
            if (this.currentScreen === 'support-ad-screen') {
                if (typeof playSupportAd === 'function' && typeof playSupportAd._resume === 'function') {
                    playSupportAd._resume();
                } else {
                    this.showScreen('main-menu');
                }
                return;
            }
            // Special case: game screen - ALWAYS show confirmation dialog to prevent accidental game loss
            if (this.currentScreen === 'game-screen') {
                console.log('Back button pressed in game - showing leave game confirmation');
                this.showLeaveGameConfirmation();
                return;
            }
            // Main menu - show exit dialog
            else if (this.currentScreen === 'main-menu') {
                console.log('Already on main menu, showing exit dialog');
                this.handleAppExit();
                return;
            }
            // Other screens with history - go back to previous screen
            else if (this.screenHistory.length > 0) {
                const previousScreen = this.screenHistory.pop();
                console.log('Going back to:', previousScreen);
                this.showScreen(previousScreen, false); // Don't add to history when going back
                this.exitWarningShown = false; // Reset exit warning
                return;
            }
            // For other screens without history, go to main menu directly
            else if (this.currentScreen !== 'main-menu') {
                console.log('No history, navigating to main menu');
                this.showScreen('main-menu');
                return;
            }
            else {
                console.log('No action taken');
            } 
        } catch (error) {
            console.error('Error in handleBackButton:', error);
            // Fallback: ensure we're on main menu and reset state
            try {
                if (this.currentScreen !== 'main-menu') {
                    this.showScreen('main-menu');
                }
                this.exitWarningShown = false;
            } catch (fallbackError) {
                console.error('Error in handleBackButton fallback:', fallbackError);
            }
        }
    }
    /**
     * Handle application exit with Fire TV best practices
     * Only called by dedicated Exit button, not by back navigation
     */
    handleAppExit() {
        // Always show exit confirmation - never exit automatically
        this.showExitConfirmation();
        this.exitWarningShown = true;
    }

    /**
     * Show exit confirmation popup following Fire TV guidelines
     */
    showExitConfirmation() {
        // Prevent multiple modals - remove existing if any
        const existingModal = document.getElementById('exit-confirmation-modal');
        if (existingModal) {
            if (existingModal._cleanup) {
                existingModal._cleanup();
            }
            existingModal.remove();
        }
        
        // Create exit confirmation modal
        const modal = document.createElement('div');
        modal.id = 'exit-confirmation-modal';
        modal.className = 'modal active';
        modal.style.zIndex = '5000';
        
        modal.innerHTML = `
            <div class="modal-content" style="text-align: center; padding: 2rem; max-width: 500px;">
                <h2 style="margin-bottom: 1rem; color: #ffdd44;">Exit Solitaire On Demand?</h2>
               
                <div class="modal-buttons" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="exit-stay-btn" class="modal-btn focusable" data-action="stay" 
                            style="padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Stay & Play
                    </button>
                    <button id="exit-confirm-btn" class="modal-btn" data-action="exit"
                            style="padding: 1rem 2rem; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Exit App
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup exit modal handlers
        this.setupExitModalHandlers(modal);
        
        // Focus the "Stay" button by default (safer choice)
        setTimeout(() => {
            const stayButton = modal.querySelector('#exit-stay-btn');
            if (stayButton) {
                stayButton.focus();
                stayButton.classList.add('focused');
                // Also use TV remote focus if available
                if (this.tvRemote) {
                    this.tvRemote.focusElement(stayButton);
                }
            }
        }, 100);
        
        // Auto-dismiss after 10 seconds (stay in app)
        setTimeout(() => {
            if (document.getElementById('exit-confirmation-modal')) {
                this.dismissExitConfirmation();
            }
        }, 10000);
    }

    /**
     * Setup exit confirmation modal handlers
     */
    setupExitModalHandlers(modal) {
        const stayButton = modal.querySelector('#exit-stay-btn');
        const exitButton = modal.querySelector('#exit-confirm-btn');
        
        // Make modal focusable and trap focus
        modal.setAttribute('tabindex', '-1');
        modal.style.outline = 'none';
        
        // Handle stay button
        stayButton.addEventListener('click', () => {
            this.dismissExitConfirmation();
        });
        
        // Handle exit button
        exitButton.addEventListener('click', () => {
            this.exitApp();
        });
        
        // Handle keyboard/remote navigation within modal
        const buttons = [stayButton, exitButton];
        let currentFocus = 0;
        
        const handleModalKeydown = (event) => {
            // Stop all events from propagating to background
            event.stopPropagation();
            event.preventDefault();
            
            // Handle both string keys and Android KeyEvent constants
            const key = event.key;
            const keyCode = event.keyCode;
            
            // Navigation: Left/Up (Android KeyEvent constants: 21=LEFT, 19=UP)
            if (key === 'ArrowLeft' || key === 'ArrowUp' || keyCode === 21 || keyCode === 19) {
                currentFocus = currentFocus > 0 ? currentFocus - 1 : buttons.length - 1;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Navigation: Right/Down/Tab (Android KeyEvent constants: 22=RIGHT, 20=DOWN)
            else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab' || keyCode === 22 || keyCode === 20) {
                currentFocus = currentFocus < buttons.length - 1 ? currentFocus + 1 : 0;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Select: Enter/Space (Android KeyEvent constants: 23=CENTER, 96=BUTTON_A)
            else if (key === 'Enter' || key === ' ' || keyCode === 23 || keyCode === 96) {
                buttons[currentFocus].click();
            }
            // Back: Escape (Android KeyEvent constants: 4=BACK, 27=ESCAPE)
            else if (key === 'Escape' || keyCode === 4 || keyCode === 27) {
                this.dismissExitConfirmation();
            }
            // Prevent any other keys from reaching background
        };
        
        // Add event listener to modal itself to capture all events
        modal.addEventListener('keydown', handleModalKeydown, true);
        
        // Also add to document as backup, but with lower priority
        const documentKeydownHandler = (event) => {
            if (modal.classList.contains('active')) {
                event.stopPropagation();
                event.preventDefault();
                handleModalKeydown(event);
            }
        };
        document.addEventListener('keydown', documentKeydownHandler, true);
        
        // Handle TV remote back button in modal (dismiss modal - stay in app)
        const handleModalBack = (event) => {
            if (modal.classList.contains('active')) {
                event.preventDefault();
                event.stopPropagation();
                this.dismissExitConfirmation(); // Back button dismisses modal - stays in app
            }
        };
        
        document.addEventListener('tvback', handleModalBack, true);
        
        // Prevent clicks outside modal from closing it (force explicit choice)
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                event.preventDefault();
                event.stopPropagation();
                // Don't close modal - force explicit button choice
            }
        });
        
        // Store cleanup function on modal for later removal
        modal._cleanup = () => {
            document.removeEventListener('keydown', documentKeydownHandler, true);
            document.removeEventListener('tvback', handleModalBack, true);
        };
        
        // Focus trap: ensure focus stays within modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    /**
     * Dismiss exit confirmation and return to game
     */
    dismissExitConfirmation() {
        const modal = document.getElementById('exit-confirmation-modal');
        if (modal) {
            // Clean up event listeners
            if (modal._cleanup) {
                modal._cleanup();
            }
            modal.remove();
        }
        this.exitWarningShown = false; // Reset exit warning
        
        // Refresh TV remote focus
        setTimeout(() => {
            if (this.tvRemote) {
                this.tvRemote.refresh();
            }
        }, 100);
    }

    /**
     * Exit the application using Fire TV best practices
     */
    exitApp() {
        console.log('Exiting Solitaire On Demand application');
        
        // Save any pending game state or settings
        try {
            // if (this.gameState && this.currentScreen === 'game-screen') {
            //     this.gameState.saveGameState(); // Disabled due to blank board issues
            // }
            this.saveSettings();
        } catch (error) {
            console.error('Error saving state before exit:', error);
        }
        
        // For Fire TV apps, attempt different exit strategies
        console.log('Attempting to close application window...');
        
        // Method 1: Direct window.close()
        try {
            if (typeof window.close === 'function') {
                console.log('Calling window.close()');
                window.close();
                
                // Give it time to work, then try alternatives
                setTimeout(() => {
                    console.log('window.close() may not have worked, trying alternatives...');
                    this.attemptAlternativeExit();
                }, 1000);
            } else {
                console.log('window.close() not available, trying alternatives...');
                this.attemptAlternativeExit();
            }
        } catch (error) {
            console.error('Error calling window.close():', error);
            this.attemptAlternativeExit();
        }
    }
    
    /**
     * Attempt alternative exit methods for Fire TV
     */
    attemptAlternativeExit() {
        // Method 2: Fire TV specific exit event
        try {
            if (typeof AndroidInterface !== 'undefined' && AndroidInterface.exitApp) {
                console.log('Calling AndroidInterface.exitApp()');
                AndroidInterface.exitApp();
                return;
            }
        } catch (error) {
            console.log('AndroidInterface not available:', error);
        }
        
        // Method 3: History back (if available)
        try {
            if (window.history && window.history.length > 1) {
                console.log('Calling window.history.back()');
                window.history.back();
                return;
            }
        } catch (error) {
            console.log('History back not available:', error);
        }
        
        // Method 4: Navigate to launcher (Fire TV specific)
        try {
            console.log('Attempting to navigate to Fire TV launcher');
            window.location.href = 'fire://tv/home';
            return;
        } catch (error) {
            console.log('Fire TV launcher navigation failed:', error);
        }
        
        // Fallback: Show exit confirmation screen
        console.log('All exit methods failed, showing exit confirmation screen');
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; 
                        background: #2d5a27; color: white; font-family: Arial, sans-serif; text-align: center;">
                <div>
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">Thank You!</h1>
                    <p style="font-size: 1.2rem;">Thanks for playing Solitaire On Demand</p>
                    <p style="font-size: 1rem; margin-top: 2rem; opacity: 0.8;">
                        Press the Home button on your remote to return to Fire TV
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Handle TV remote menu button
     */
    handleMenuButton() {
        // Show leave game confirmation when in active game, same as back button
        if (this.currentScreen === 'game-screen') {
            console.log('Menu button pressed in game - showing leave game confirmation');
            this.showLeaveGameConfirmation();
        } else {
            this.showScreen('main-menu');
        }
    }

    /**
     * Handle long select (long press on TV remote select button)
     */
    handleLongSelect(element) {
        // Show additional information or context menu for the focused element
        if (element && element.classList.contains('card')) {
            this.showCardInfo(element);
        }
    }

    /**
     * Show screen by ID and manage screen transitions with history tracking
     */
    showScreen(screenId, addToHistory = true) {
        // Add current screen to history before switching (unless it's the first screen)
        if (addToHistory && this.currentScreen && this.currentScreen !== screenId) {
            this.screenHistory.push(this.currentScreen);
            console.log('Added to history:', this.currentScreen, 'History:', this.screenHistory);
        }
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            
            // Reset exit warning when changing screens
            this.exitWarningShown = false;
            
            // Initialize screen-specific functionality
            switch (screenId) {
                case 'game-screen':
                    this.renderGameBoard();
                    this.initializeKeyboardNavigation();
                    this.startGameTimer();
                    break;
                case 'stats-screen':
                    this.updateStatsDisplay();
                    break;
                case 'settings-screen':
                    this.loadSettings();
                    break;
            }
            
            // Refresh TV remote navigation for new screen
            setTimeout(() => {
                this.tvRemote.refresh();
            }, 100);
        }
    }

    /**
     * Focus an element and update navigation state accordingly
     */
    focusElementAndUpdateNavigation(element) {
        // Determine what type of element this is and update navigation state
        if (element.matches('[data-column]')) {
            // Tableau column
            const column = parseInt(element.dataset.column);
            this.keyboardNavigation.currentArea = 'tableau';
            this.keyboardNavigation.currentColumn = column;
            this.keyboardNavigation.currentRow = Math.max(0, this.gameState.tableau[column].length - 1);
        } else if (element.matches('[data-suit]')) {
            // Foundation pile
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const suit = element.dataset.suit;
            const column = suits.indexOf(suit);
            this.keyboardNavigation.currentArea = 'foundation';
            this.keyboardNavigation.currentColumn = column;
            this.keyboardNavigation.currentRow = 0;
        } else if (element.matches('.stock-pile')) {
            // Stock pile
            this.keyboardNavigation.currentArea = 'stock';
            this.keyboardNavigation.currentColumn = 0;
            this.keyboardNavigation.currentRow = 0;
        } else if (element.matches('.waste-pile')) {
            // Waste pile
            this.keyboardNavigation.currentArea = 'waste';
            this.keyboardNavigation.currentColumn = 0;
            this.keyboardNavigation.currentRow = 0;
        } else if (element.matches('.card')) {
            // Individual card - find its parent column
            const columnElement = element.closest('[data-column]');
            if (columnElement) {
                const column = parseInt(columnElement.dataset.column);
                const cards = columnElement.querySelectorAll('.card');
                const cardIndex = Array.from(cards).indexOf(element);
                this.keyboardNavigation.currentArea = 'tableau';
                this.keyboardNavigation.currentColumn = column;
                this.keyboardNavigation.currentRow = cardIndex;
            }
        }
    }

    /**
     * Switch between game areas
     */
    switchArea() {
        const nav = this.keyboardNavigation;
        const areas = ['tableau', 'foundation', 'stock'];
        const currentIndex = areas.indexOf(nav.currentArea);
        const nextIndex = (currentIndex + 1) % areas.length;
        
        nav.currentArea = areas[nextIndex];
        nav.currentColumn = 0;
        nav.currentRow = 0;
    }

    /**
     * Select specific tableau column
     */
    selectTableauColumn(column) {
        if (column >= 0 && column < 7) {
            this.keyboardNavigation.currentArea = 'tableau';
            this.keyboardNavigation.currentColumn = column;
            this.keyboardNavigation.currentRow = Math.max(0, this.gameState.tableau[column].length - 1);
            this.updateKeyboardFocus();
        }
    }

    /**
     * Activate current keyboard selection
     */
    activateCurrentSelection() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                this.handleTableauCardClick(nav.currentColumn, nav.currentRow);
                break;
            case 'foundation':
                this.handleFoundationClick(nav.currentColumn);
                break;
            case 'stock':
                this.handleStockClick();
                break;
            case 'waste':
                this.handleWasteClick();
                break;
            case 'controls':
                // Activate control buttons: 0=Hint, 1=Undo, 2=Menu, 3=Give Up
                switch (nav.currentColumn) {
                    case 0: // Hint button
                        this.showHint();
                        break;
                    case 1: // Undo button
                        this.undoMove();
                        break;
                    case 2: // Menu button
                        this.showScreen('main-menu');
                        break;
                    case 3: // Give Up button
                        this.handleGiveUp();
                        break;
                }
                break;
        }
    }

    /**
     * Update visual keyboard focus indicator
     */
    updateKeyboardFocus() {
        // Remove existing focus
        document.querySelectorAll('.keyboard-focus').forEach(el => {
            el.classList.remove('keyboard-focus');
        });

        const nav = this.keyboardNavigation;
        let focusElement = null;

        switch (nav.currentArea) {
            case 'tableau':
                focusElement = document.querySelector(`[data-column="${nav.currentColumn}"]`);
                if (focusElement) {
                    const cards = focusElement.querySelectorAll('.card');
                    if (cards[nav.currentRow]) {
                        // Focus on the specific card
                        focusElement = cards[nav.currentRow];
                    } else if (cards.length === 0) {
                        // Empty column - focus on the column container itself
                        // focusElement is already set to the column container
                    } else {
                        // Invalid row index, focus on the column container
                        // focusElement is already set to the column container
                    }
                }
                break;
            case 'foundation':
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                focusElement = document.querySelector(`[data-suit="${suits[nav.currentColumn]}"]`);
                break;
            case 'stock':
                focusElement = document.querySelector('.stock-pile');
                break;
            case 'waste':
                focusElement = document.querySelector('.waste-pile');
                break;
            case 'controls':
                // Control buttons: 0=Hint, 1=Undo, 2=Menu, 3=Give Up
                const controlButtons = ['hint-btn', 'undo-btn', 'menu-btn', 'give-up-btn'];
                focusElement = document.getElementById(controlButtons[nav.currentColumn]);
                break;
        }

        if (focusElement) {
            focusElement.classList.add('keyboard-focus');
            this.focusedElement = focusElement;
        }
    }

    /**
     * Handle action button clicks
     */
    handleAction(action, element) {
        switch (action) {
            case 'new-game':
                const difficulty = element.dataset.difficulty || 'medium';
                this.startNewGame(difficulty);
                break;
            case 'stats':
                this.showScreen('stats-screen');
                break;
            case 'settings':
                this.showScreen('settings-screen');
                break;
            case 'back-to-menu':
                this.showScreen('main-menu');
                break;
            case 'new-game-same':
                this.startNewGame(this.gameState.difficulty);
                break;
            case 'give-up':
                this.handleGiveUp();
                break;
            case 'support':
                this.playSupportAd();
                break;
            case 'exit':
                this.handleAppExit();
                break;
            default:
                console.log('Unknown action:', action);
        }
    }


    /**
     * Initialize keyboard navigation for game screen
     */
    initializeKeyboardNavigation() {
        // Start with the first tableau column, focusing on the last (selectable) card
        const firstColumn = this.gameState.tableau[0];
        this.keyboardNavigation = {
            currentColumn: 0,
            currentRow: Math.max(0, firstColumn.length - 1),
            currentArea: 'tableau'
        };
        this.updateKeyboardFocus();
    }

    /**
     * Start a new game
     */
    startNewGame(difficulty) {
        this.difficultyManager.setDifficulty(difficulty);
        this.gameState.newGame(difficulty);
        
        // Update difficulty display
        document.getElementById('difficulty-display').textContent = 
            this.difficultyManager.getCurrentDifficulty().name;
        
        this.showScreen('game-screen');
        this.updateGameDisplay();
    }

    /**
     * Render the game board
     */
    renderGameBoard() {
        this.renderTableau();
        this.renderFoundation();
        this.renderStock();
        this.renderWaste();
        this.updateGameDisplay();
    }

    /**
     * Render tableau columns
     */
    renderTableau() {
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            const columnElement = document.querySelector(`[data-column="${col}"]`);
            
            // Clear existing cards
            columnElement.innerHTML = '';
            
            // Add empty column indicator if needed
            if (column.length === 0) {
                columnElement.classList.add('empty');
            } else {
                columnElement.classList.remove('empty');
            }

            // Render cards
            column.forEach((card, index) => {
                const cardElement = card.createElement();
                cardElement.style.top = `${index * 20}px`; // Cascade cards
                cardElement.style.zIndex = index;
                
                // Add click handler
                cardElement.addEventListener('click', () => {
                    this.handleTableauCardClick(col, index);
                });
                
                columnElement.appendChild(cardElement);
            });
        }
    }

    /**
     * Render foundation piles
     */
    renderFoundation() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        
        for (let i = 0; i < 4; i++) {
            const pile = this.gameState.foundation[i];
            const pileElement = document.querySelector(`[data-suit="${suits[i]}"]`);
            
            // Clear existing cards
            const existingCards = pileElement.querySelectorAll('.card');
            existingCards.forEach(card => card.remove());
            
            // Render top card if any
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                const cardElement = topCard.createElement();
                
                cardElement.addEventListener('click', () => {
                    this.handleFoundationClick(i);
                });
                
                pileElement.appendChild(cardElement);
            }
        }
    }

    /**
     * Render stock pile
     */
    renderStock() {
        const stockElement = document.querySelector('.stock-pile');
        
        // Clear existing cards
        const existingCards = stockElement.querySelectorAll('.card');
        existingCards.forEach(card => card.remove());
        
        // Show stock indicator if cards remain
        if (this.gameState.stock.length > 0) {
            stockElement.classList.add('has-cards');
            
            // Apply custom card back image if active
            if (Card.getCardBackPattern() === 'custom-image') {
                stockElement.classList.add('custom-image');
            } else {
                stockElement.classList.remove('custom-image');
            }
        } else {
            stockElement.classList.remove('has-cards');
            stockElement.classList.remove('custom-image');
        }
    }

    /**
     * Render waste pile
     */
    renderWaste() {
        const wasteElement = document.querySelector('.waste-pile');
        
        // Clear existing cards
        const existingCards = wasteElement.querySelectorAll('.card');
        existingCards.forEach(card => card.remove());
        
        // Render visible waste cards (up to 3 for hard mode)
        const visibleCount = Math.min(3, this.gameState.waste.length);
        const startIndex = Math.max(0, this.gameState.waste.length - visibleCount);
        
        for (let i = startIndex; i < this.gameState.waste.length; i++) {
            const card = this.gameState.waste[i];
            const cardElement = card.createElement();
            
            // Position cards with more visible offset (especially for hard mode with 3 cards)
            const offset = (i - startIndex) * 20; // Increased from 2px to 20px for better visibility
            cardElement.style.left = `${offset}px`;
            cardElement.style.top = `${offset}px`;
            cardElement.style.zIndex = i;
            cardElement.style.position = 'absolute';
            
            // Only top card is clickable
            if (i === this.gameState.waste.length - 1) {
                cardElement.addEventListener('click', () => {
                    this.handleWasteClick();
                });
            } else {
                cardElement.style.pointerEvents = 'none';
            }
            
            wasteElement.appendChild(cardElement);
        }
    }

    /**
     * Handle tableau card click
     */
    handleTableauCardClick(column, cardIndex) {
        const columnCards = this.gameState.tableau[column];
        const clickedCard = columnCards[cardIndex];
        
        // Handle empty tableau columns when cards are already selected
        if (!clickedCard && this.selectedCards.length > 0) {
            // Try to move selected cards to empty column (e.g., King to empty slot)
            this.attemptMove('tableau', column);
            return;
        }
        
        // Handle clicking on existing cards
        if (!clickedCard || !clickedCard.faceUp) return; // Can't select face-down cards
        
        if (this.selectedCards.length === 0) {
            // Select cards from this position to end of column
            this.selectCards('tableau', column, cardIndex);
        } else {
            // Try to move selected cards here
            this.attemptMove('tableau', column);
        }
    }

    /**
     * Handle foundation pile click
     */
    handleFoundationClick(foundationIndex) {
        const foundationPile = this.gameState.foundation[foundationIndex];
        
        if (this.selectedCards.length === 0) {
            // No cards selected - try to select from foundation if it has cards
            if (foundationPile.length > 0) {
                this.selectCards('foundation', foundationIndex, foundationPile.length - 1);
            }
        } else {
            // Cards already selected - try to move them to this foundation
            this.attemptMove('foundation', foundationIndex);
        }
    }

    /**
     * Handle waste pile click
     */
    handleWasteClick() {
        if (this.gameState.waste.length === 0) return;
        
        if (this.selectedCards.length === 0) {
            this.selectCards('waste', 0, this.gameState.waste.length - 1);
        }
    }

    /**
     * Handle stock pile click
     */
    handleStockClick() {
        this.clearSelection();
        
        if (this.gameState.drawFromStock()) {
            // Play stock draw sound
            if (this.soundManager) {
                this.soundManager.stockDraw();
            }
            
            this.renderStock();
            this.renderWaste();
            this.updateGameDisplay();
            
            // Auto-select the newly revealed card from waste pile for intuitive gameplay
            if (this.gameState.waste.length > 0) {
                this.selectCards('waste', 0, this.gameState.waste.length - 1);
            }
        }
    }

    /**
     * Handle area click (empty areas and foundation piles)
     */
    handleAreaClick(element) {
        if (element.classList.contains('tableau-column')) {
            const column = parseInt(element.dataset.column);
            if (this.gameState.tableau[column].length === 0) {
                this.attemptMove('tableau', column);
            }
        } else if (element.classList.contains('foundation-pile')) {
            const suit = element.dataset.suit;
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const foundationIndex = suits.indexOf(suit);
            if (foundationIndex !== -1) {
                this.handleFoundationClick(foundationIndex);
            }
        }
    }

    /**
     * Select cards for moving
     */
    selectCards(area, index, cardIndex) {
        this.clearSelection();
        
        this.selectedSource = { area, index };
        
        if (area === 'tableau') {
            const column = this.gameState.tableau[index];
            this.selectedCards = column.slice(cardIndex);
            
            // Highlight selected cards
            const columnElement = document.querySelector(`[data-column="${index}"]`);
            const cardElements = columnElement.querySelectorAll('.card');
            
            for (let i = cardIndex; i < cardElements.length; i++) {
                cardElements[i].classList.add('selected');
            }
        } else if (area === 'waste') {
            this.selectedCards = [this.gameState.waste[this.gameState.waste.length - 1]];
            
            // Highlight selected card
            const wasteElement = document.querySelector('.waste-pile');
            const topCard = wasteElement.querySelector('.card:last-child');
            if (topCard) {
                topCard.classList.add('selected');
            }
        } else if (area === 'foundation') {
            const foundationPile = this.gameState.foundation[index];
            this.selectedCards = [foundationPile[foundationPile.length - 1]];
            
            // Highlight selected card
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const foundationElement = document.querySelector(`[data-suit="${suits[index]}"]`);
            const topCard = foundationElement.querySelector('.card');
            if (topCard) {
                topCard.classList.add('selected');
            }
        }
        
        this.updateSelectedCardsDisplay();
    }

    /**
     * Attempt to move selected cards
     */
    attemptMove(targetArea, targetIndex) {
        if (this.selectedCards.length === 0) return;
        
        const success = this.gameState.moveCards(
            this.selectedSource.area,
            this.selectedSource.index,
            targetArea,
            targetIndex,
            this.selectedCards.length
        );
        
        if (success) {
            // Play successful move sound
            if (this.soundManager) {
                this.soundManager.moveSuccess();
            }
            
            // Clear selection immediately and ensure it stays cleared
            this.clearSelection();
            
            // Animate move and ensure selection is cleared after rendering
            this.animateMove(this.selectedSource, { area: targetArea, index: targetIndex }, () => {
                // Callback to ensure selection is fully cleared after animation
                this.clearSelection();
                this.updateGameDisplay();
            });
            
            // Check for auto-complete
            if (this.gameState.autoCompleteAvailable && 
                this.difficultyManager.canAutoComplete() &&
                this.getSettings().autoComplete) {
                this.offerAutoComplete();
            }
            
            // Check for game win
            if (this.gameState.gameWon) {
                this.handleGameWin();
            }
        } else {
            // Clear selection if move failed
            this.clearSelection();
        }
    }

    /**
     * Clear card selection
     */
    clearSelection() {
        // Remove selection highlights
        document.querySelectorAll('.card.selected').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedCards = [];
        this.selectedSource = null;
        this.updateSelectedCardsDisplay();
    }

    /**
     * Update selected cards display
     */
    updateSelectedCardsDisplay() {
        const selectedContainer = document.getElementById('selected-cards');
        if (!selectedContainer) return;
        
        selectedContainer.innerHTML = '';
        
        this.selectedCards.forEach((card, index) => {
            const cardElement = card.createElement();
            cardElement.style.marginLeft = index > 0 ? '-60px' : '0';
            cardElement.style.zIndex = index;
            selectedContainer.appendChild(cardElement);
        });
    }

    /**
     * Animate card movement
     */
    animateMove(from, to, callback = null) {
        // Add animation to queue with callback
        this.animationQueue.push({ from, to, callback });
        this.processAnimationQueue();
    }

    /**
     * Process animation queue
     */
    processAnimationQueue() {
        if (this.isAnimating || this.animationQueue.length === 0) return;
        
        this.isAnimating = true;
        const animation = this.animationQueue.shift();
        
        // Perform animation (simplified for now)
        setTimeout(() => {
            this.renderGameBoard();
            
            // Execute callback if provided
            if (animation.callback) {
                animation.callback();
            }
            
            this.isAnimating = false;
            this.processAnimationQueue();
        }, 300);
    }

    /**
     * Update game display (score, moves, time)
     */
    updateGameDisplay() {
        document.getElementById('moves-counter').textContent = `Moves: ${this.gameState.moves}`;
        document.getElementById('score').textContent = `Score: ${this.gameState.score}`;
        
        // Update timer
        if (this.gameState.startTime) {
            document.getElementById('timer').textContent = this.gameState.getFormattedTime();
        }
        
        // Update button states
        this.updateButtonStates();
        
        // Check for no moves left after every display update (includes after moves)
        // Add small delay to ensure all rendering is complete
        setTimeout(() => {
            this.checkNoMovesLeft();
        }, 100);
    }

    /**
     * Update difficulty display
     */
    updateDifficultyDisplay() {
        const difficultyElement = document.getElementById('difficulty-display');
        if (difficultyElement) {
            difficultyElement.textContent = this.difficultyManager.getCurrentDifficulty().name;
        }
    }

    /**
     * Update game info (alias for updateGameDisplay for compatibility)
     */
    updateGameInfo() {
        this.updateGameDisplay();
    }

    /**
     * Update button states based on game state and difficulty
     */
    updateButtonStates() {
        const hintBtn = document.getElementById('hint-btn');
        const undoBtn = document.getElementById('undo-btn');
        
        // Hint button
        if (this.difficultyManager.canShowHints()) {
            hintBtn.style.display = 'block';
            hintBtn.disabled = false;
        } else {
            hintBtn.style.display = 'none';
        }
        
        // Undo button - use new canUndo method from GameState
        const canUndo = this.gameState.canUndo(this.difficultyManager);
        undoBtn.disabled = !canUndo;
        
        // Add visual indication when undo limit is reached
        if (this.gameState.actualMovesMade > 0 && !canUndo) {
            undoBtn.title = `Undo limit reached (${this.difficultyManager.getUndoLimit()} max)`;
            undoBtn.classList.add('limit-reached');
        } else {
            undoBtn.title = 'Undo last move';
            undoBtn.classList.remove('limit-reached');
        }
    }

    /**
     * Start game timer
     */
    startGameTimer() {
        this.stopGameTimer();
        
        this.gameTimer = setInterval(() => {
            if (this.gameState.startTime && !this.gameState.gameWon) {
                document.getElementById('timer').textContent = this.gameState.getFormattedTime();
            }
        }, 1000);
    }

    /**
     * Stop game timer
     */
    stopGameTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    /**
     * Handle hint button click
     */
    showHint() {
        if (!this.difficultyManager.canShowHints()) return;
        
        const hint = this.difficultyManager.hintSystem.getBestMove(this.gameState);
        
        if (hint) {
            this.highlightHint(hint);
        } else {
            this.showMessage('No moves available. Try drawing from the stock pile.');
        }
    }

    /**
     * Highlight a hint move
     */
    highlightHint(hint) {
        // Clear existing hints
        document.querySelectorAll('.hint-highlight').forEach(el => {
            el.classList.remove('hint-highlight');
        });
        
        // Highlight source
        const sourceElement = this.getElementForMove(hint.from);
        if (sourceElement) {
            sourceElement.classList.add('hint-highlight');
        }
        
        // Highlight target
        const targetElement = this.getElementForMove(hint.to);
        if (targetElement) {
            targetElement.classList.add('hint-highlight');
        }
        
        // Remove highlights after a few seconds
        setTimeout(() => {
            document.querySelectorAll('.hint-highlight').forEach(el => {
                el.classList.remove('hint-highlight');
            });
        }, 3000);
    }

    /**
     * Get DOM element for a move location
     */
    getElementForMove(location) {
        switch (location.area) {
            case 'tableau':
                return document.querySelector(`[data-column="${location.index}"]`);
            case 'foundation':
                const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
                return document.querySelector(`[data-suit="${suits[location.index]}"]`);
            case 'waste':
                return document.querySelector('.waste-pile');
            case 'stock':
                return document.querySelector('.stock-pile');
            default:
                return null;
        }
    }

    /**
     * Handle undo button click
     */
    undoMove() {
        if (this.gameState.undoLastMove()) {
            this.renderGameBoard();
            this.updateGameDisplay();
        }
    }

    /**
     * Offer auto-complete
     */
    offerAutoComplete() {
        if (confirm('All cards can be moved to foundations. Auto-complete the game?')) {
            this.performAutoComplete();
        }
    }

    /**
     * Perform auto-complete animation
     */
    performAutoComplete() {
        const moves = this.gameState.autoComplete();
        
        // Animate each move
        moves.forEach((move, index) => {
            setTimeout(() => {
                this.renderGameBoard();
                
                if (index === moves.length - 1) {
                    // Last move, check for win
                    setTimeout(() => {
                        if (this.gameState.gameWon) {
                            this.handleGameWin();
                        }
                    }, 500);
                }
            }, index * 200);
        });
    }

    /**
     * Handle game win
     */
    handleGameWin() {
        this.stopGameTimer();
        
        const stats = this.gameState.getGameStats();
        
        // Update modal content for win
        document.getElementById('game-over-title').textContent = 'Congratulations!';
        document.getElementById('game-over-message').textContent = 'You won the game!';
        document.getElementById('final-time').textContent = this.gameState.getFormattedTime();
        document.getElementById('final-moves').textContent = stats.moves;
        document.getElementById('final-score').textContent = stats.score;
        
        // Save statistics
        this.saveGameStats(stats);
        
        // Show modal
        const modal = document.getElementById('game-over-modal');
        modal.classList.add('active');
        
        // Setup modal button handlers with auto-hide
        this.setupModalHandlers();
        
        // Focus first button in modal for TV remote navigation
        setTimeout(() => {
            this.tvRemote.refresh();
            const firstButton = modal.querySelector('.modal-btn.focusable');
            if (firstButton) {
                this.tvRemote.focusElement(firstButton);
            }
        }, 100);
    }

    /**
     * Handle game loss (no moves available)
     */
    handleGameLoss() {
        this.stopGameTimer();
        
        const stats = this.gameState.getGameStats();
        
        // Update modal content for loss
        document.getElementById('game-over-title').textContent = 'Game Over';
        document.getElementById('game-over-message').textContent = 'No more moves available! Better luck next time.';
        document.getElementById('final-time').textContent = this.gameState.getFormattedTime();
        document.getElementById('final-moves').textContent = stats.moves;
        document.getElementById('final-score').textContent = stats.score;
        
        // Save loss statistics (gameWon will be false)
        this.saveGameStats(stats);
        
        // Show modal
        const modal = document.getElementById('game-over-modal');
        modal.classList.add('active');
        
        // Setup modal button handlers with auto-hide
        this.setupModalHandlers();
        
        // Focus first button in modal for TV remote navigation
        setTimeout(() => {
            this.tvRemote.refresh();
            const firstButton = modal.querySelector('.modal-btn.focusable');
            if (firstButton) {
                this.tvRemote.focusElement(firstButton);
            }
        }, 100);
    }

    /**
     * Show confirmation dialog when back button is pressed during active gameplay
     */
    showLeaveGameConfirmation() {
        // Prevent multiple modals - remove existing if any
        const existingModal = document.getElementById('leave-game-confirmation-modal');
        if (existingModal) {
            if (existingModal._cleanup) {
                existingModal._cleanup();
            }
            existingModal.remove();
        }
        
        // Create leave game confirmation modal
        const modal = document.createElement('div');
        modal.id = 'leave-game-confirmation-modal';
        modal.className = 'modal active';
        modal.style.zIndex = '5000';
        
        modal.innerHTML = `
            <div class="modal-content" style="text-align: center; padding: 2rem; max-width: 500px;">
                <h2 style="margin-bottom: 1rem; color: #ffdd44;">Leave Current Game?</h2>
                <p style="margin-bottom: 2rem; color: #ccc;">Your progress will be lost if you leave now.</p>
               
                <div class="modal-buttons" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="leave-stay-btn" class="modal-btn focusable" data-action="stay" 
                            style="padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Stay in Game
                    </button>
                    <button id="leave-confirm-btn" class="modal-btn focusable" data-action="leave"
                            style="padding: 1rem 2rem; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Leave Game
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup leave game modal handlers
        this.setupLeaveGameModalHandlers(modal);
        
        // Focus the "Stay in Game" button by default (safer choice)
        setTimeout(() => {
            const stayButton = modal.querySelector('#leave-stay-btn');
            if (stayButton) {
                stayButton.focus();
                stayButton.classList.add('focused');
                // Also use TV remote focus if available
                if (this.tvRemote) {
                    this.tvRemote.focusElement(stayButton);
                }
            }
        }, 100);
        
        // Auto-dismiss after 10 seconds (stay in game)
        setTimeout(() => {
            if (document.getElementById('leave-game-confirmation-modal')) {
                this.dismissLeaveGameConfirmation();
            }
        }, 10000);
    }

    /**
     * Setup leave game confirmation modal handlers
     */
    setupLeaveGameModalHandlers(modal) {
        const stayButton = modal.querySelector('#leave-stay-btn');
        const leaveButton = modal.querySelector('#leave-confirm-btn');
        
        // Make modal focusable and trap focus
        modal.setAttribute('tabindex', '-1');
        modal.style.outline = 'none';
        
        // Handle stay button
        stayButton.addEventListener('click', () => {
            this.dismissLeaveGameConfirmation();
        });
        
        // Handle leave button
        leaveButton.addEventListener('click', () => {
            this.confirmLeaveGame();
        });
        
        // Handle keyboard/remote navigation within modal
        const buttons = [stayButton, leaveButton];
        let currentFocus = 0;
        
        const handleModalKeydown = (event) => {
            // Stop all events from propagating to background
            event.stopPropagation();
            event.preventDefault();
            
            // Handle both string keys and Android KeyEvent constants
            const key = event.key;
            const keyCode = event.keyCode;
            
            // Navigation: Left/Up (Android KeyEvent constants: 21=LEFT, 19=UP)
            if (key === 'ArrowLeft' || key === 'ArrowUp' || keyCode === 21 || keyCode === 19) {
                currentFocus = currentFocus > 0 ? currentFocus - 1 : buttons.length - 1;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Navigation: Right/Down/Tab (Android KeyEvent constants: 22=RIGHT, 20=DOWN)
            else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab' || keyCode === 22 || keyCode === 20) {
                currentFocus = currentFocus < buttons.length - 1 ? currentFocus + 1 : 0;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Select: Enter/Space (Android KeyEvent constants: 23=CENTER, 96=BUTTON_A)
            else if (key === 'Enter' || key === ' ' || keyCode === 23 || keyCode === 96) {
                buttons[currentFocus].click();
            }
            // Back: Escape (Android KeyEvent constants: 4=BACK, 27=ESCAPE)
            else if (key === 'Escape' || keyCode === 4 || keyCode === 27) {
                this.dismissLeaveGameConfirmation();
            }
            // Prevent any other keys from reaching background
        };
        
        // Add event listener to modal itself to capture all events
        modal.addEventListener('keydown', handleModalKeydown, true);
        
        // Also add to document as backup, but with lower priority
        const documentKeydownHandler = (event) => {
            if (modal.classList.contains('active')) {
                event.stopPropagation();
                event.preventDefault();
                handleModalKeydown(event);
            }
        };
        document.addEventListener('keydown', documentKeydownHandler, true);
        
        // Handle TV remote back button in modal (dismiss modal - stay in game)
        const handleModalBack = (event) => {
            if (modal.classList.contains('active')) {
                event.preventDefault();
                event.stopPropagation();
                this.dismissLeaveGameConfirmation(); // Back button dismisses modal - stays in game
            }
        };
        
        document.addEventListener('tvback', handleModalBack, true);
        
        // Prevent clicks outside modal from closing it (force explicit choice)
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                event.preventDefault();
                event.stopPropagation();
                // Don't close modal - force explicit button choice
            }
        });
        
        // Store cleanup function on modal for later removal
        modal._cleanup = () => {
            document.removeEventListener('keydown', documentKeydownHandler, true);
            document.removeEventListener('tvback', handleModalBack, true);
        };
        
        // Focus trap: ensure focus stays within modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    /**
     * Dismiss leave game confirmation and continue playing
     */
    dismissLeaveGameConfirmation() {
        const modal = document.getElementById('leave-game-confirmation-modal');
        if (modal) {
            // Clean up event listeners
            if (modal._cleanup) {
                modal._cleanup();
            }
            modal.remove();
        }
        
        // Refresh TV remote focus
        setTimeout(() => {
            if (this.tvRemote) {
                this.tvRemote.refresh();
            }
        }, 100);
    }

    /**
     * Confirm leaving the game and return to main menu
     */
    confirmLeaveGame() {
        // Clean up the modal first
        this.dismissLeaveGameConfirmation();
        
        // Play sound effect if available
        if (this.soundManager) {
            this.soundManager.menuClick();
        }
        
        // Stop the game timer to prevent any timer-related state changes
        this.stopGameTimer();
        
        // Clear any selected cards to clean up game state
        this.clearSelection();
        
        // Mark the game as abandoned (not won or lost) to prevent stats modal
        this.gameState.gameAbandoned = true;
        this.gameState.gameEndTime = Date.now();
        
        // Return to main menu directly, bypassing any game-over modals
        this.showScreen('main-menu');
    }

    /**
     * Handle player giving up voluntarily
     */
    handleGiveUp() {
        // Show styled confirmation dialog matching the exit confirmation
        this.showGiveUpConfirmation();
    }

    /**
     * Play the voluntary "Support the Game" ad, then return to the main menu.
     * The ad logic lives in js/ads.js (the ad seam); this just hands it the
     * showScreen/soundManager it needs. Guarded so a build without ads.js loaded
     * simply does nothing rather than throwing.
     */
    playSupportAd() {
        if (typeof playSupportAd !== 'function') {
            console.warn('Support ad seam (js/ads.js) not loaded');
            return;
        }
        playSupportAd(
            {
                showScreen: (id) => this.showScreen(id),
                returnTo: 'main-menu',
                soundManager: this.soundManager,
            },
            () => this.showScreen('main-menu')
        );
    }

    /**
     * Show give up confirmation popup following the same style as exit confirmation
     */
    showGiveUpConfirmation() {
        // Prevent multiple modals - remove existing if any
        const existingModal = document.getElementById('give-up-confirmation-modal');
        if (existingModal) {
            if (existingModal._cleanup) {
                existingModal._cleanup();
            }
            existingModal.remove();
        }
        
        // Create give up confirmation modal
        const modal = document.createElement('div');
        modal.id = 'give-up-confirmation-modal';
        modal.className = 'modal active';
        modal.style.zIndex = '5000';
        
        modal.innerHTML = `
            <div class="modal-content" style="text-align: center; padding: 2rem; max-width: 500px;">
                <h2 style="margin-bottom: 1rem; color: #ffdd44;">Give Up This Game?</h2>
               
                <div class="modal-buttons" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="give-up-continue-btn" class="modal-btn focusable" data-action="continue" 
                            style="padding: 1rem 2rem; background: #4CAF50; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Keep Playing
                    </button>
                    <button id="give-up-confirm-btn" class="modal-btn focusable" data-action="give-up"
                            style="padding: 1rem 2rem; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 1.1rem;">
                        Give Up
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup give up modal handlers
        this.setupGiveUpModalHandlers(modal);
        
        // Focus the "Keep Playing" button by default (safer choice)
        setTimeout(() => {
            const continueButton = modal.querySelector('#give-up-continue-btn');
            if (continueButton) {
                continueButton.focus();
                continueButton.classList.add('focused');
                // Also use TV remote focus if available
                if (this.tvRemote) {
                    this.tvRemote.focusElement(continueButton);
                }
            }
        }, 100);
        
        // Auto-dismiss after 10 seconds (keep playing)
        setTimeout(() => {
            if (document.getElementById('give-up-confirmation-modal')) {
                this.dismissGiveUpConfirmation();
            }
        }, 10000);
    }

    /**
     * Setup give up confirmation modal handlers
     */
    setupGiveUpModalHandlers(modal) {
        const continueButton = modal.querySelector('#give-up-continue-btn');
        const giveUpButton = modal.querySelector('#give-up-confirm-btn');
        
        // Make modal focusable and trap focus
        modal.setAttribute('tabindex', '-1');
        modal.style.outline = 'none';
        
        // Handle continue button
        continueButton.addEventListener('click', () => {
            this.dismissGiveUpConfirmation();
        });
        
        // Handle give up button
        giveUpButton.addEventListener('click', () => {            
            this.confirmGiveUp();
        });
        
        // Handle keyboard/remote navigation within modal
        const buttons = [continueButton, giveUpButton];
        let currentFocus = 0;
        
        const handleModalKeydown = (event) => {
            // Stop all events from propagating to background
            event.stopPropagation();
            event.preventDefault();
            
            // Handle both string keys and Android KeyEvent constants
            const key = event.key;
            const keyCode = event.keyCode;
            
            // Navigation: Left/Up (Android KeyEvent constants: 21=LEFT, 19=UP)
            if (key === 'ArrowLeft' || key === 'ArrowUp' || keyCode === 21 || keyCode === 19) {
                currentFocus = currentFocus > 0 ? currentFocus - 1 : buttons.length - 1;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Navigation: Right/Down/Tab (Android KeyEvent constants: 22=RIGHT, 20=DOWN)
            else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab' || keyCode === 22 || keyCode === 20) {
                currentFocus = currentFocus < buttons.length - 1 ? currentFocus + 1 : 0;
                buttons[currentFocus].focus();
                buttons[currentFocus].classList.add('focused');
                buttons[1 - currentFocus].classList.remove('focused');
            }
            // Select: Enter/Space (Android KeyEvent constants: 23=CENTER, 96=BUTTON_A)
            else if (key === 'Enter' || key === ' ' || keyCode === 23 || keyCode === 96) {
                buttons[currentFocus].click();
            }
            // Back: Escape (Android KeyEvent constants: 4=BACK, 27=ESCAPE)
            else if (key === 'Escape' || keyCode === 4 || keyCode === 27) {
                this.dismissGiveUpConfirmation();
            }
            // Prevent any other keys from reaching background
        };
        
        // Add event listener to modal itself to capture all events
        modal.addEventListener('keydown', handleModalKeydown, true);
        
        // Also add to document as backup, but with lower priority
        const documentKeydownHandler = (event) => {
            if (modal.classList.contains('active')) {
                event.stopPropagation();
                event.preventDefault();
                handleModalKeydown(event);
            }
        };
        document.addEventListener('keydown', documentKeydownHandler, true);
        
        // Handle TV remote back button in modal (dismiss modal - keep playing)
        const handleModalBack = (event) => {
            if (modal.classList.contains('active')) {
                event.preventDefault();
                event.stopPropagation();
                this.dismissGiveUpConfirmation(); // Back button dismisses modal - keeps playing
            }
        };
        
        document.addEventListener('tvback', handleModalBack, true);
        
        // Prevent clicks outside modal from closing it (force explicit choice)
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                event.preventDefault();
                event.stopPropagation();
                // Don't close modal - force explicit button choice
            }
        });
        
        // Store cleanup function on modal for later removal
        modal._cleanup = () => {
            document.removeEventListener('keydown', documentKeydownHandler, true);
            document.removeEventListener('tvback', handleModalBack, true);
        };
        
        // Focus trap: ensure focus stays within modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    /**
     * Dismiss give up confirmation and continue playing
     */
    dismissGiveUpConfirmation() {
        const modal = document.getElementById('give-up-confirmation-modal');
        if (modal) {
            // Clean up event listeners
            if (modal._cleanup) {
                modal._cleanup();
            }
            modal.remove();
        }
        
        // Refresh TV remote focus
        setTimeout(() => {
            if (this.tvRemote) {
                this.tvRemote.refresh();
            }
        }, 100);
    }

    /**
     * Confirm giving up and end the game
     */
    confirmGiveUp() {
        setTimeout(() => {
            if (document.getElementById('give-up-confirmation-modal')) {
                this.dismissGiveUpConfirmation();
            }
        }, 1);

        // Add a small delay to ensure the give-up modal is fully removed before showing game-over modal
        setTimeout(() => {
            // Play sound effect if available
            if (this.soundManager) {
                this.soundManager.gameOver();
            }

            this.stopGameTimer();
            
            // Mark game as lost (voluntary surrender)
            this.gameState.gameLost = true;
            this.gameState.gameEndTime = Date.now();
            
            const stats = this.gameState.getGameStats();
            
            // Update modal content for voluntary surrender
            document.getElementById('game-over-title').textContent = 'Game Ended';
            document.getElementById('game-over-message').textContent = 'You chose to give up this game. Try again for a better result!';
            document.getElementById('final-time').textContent = this.gameState.getFormattedTime();
            document.getElementById('final-moves').textContent = stats.moves;
            document.getElementById('final-score').textContent = stats.score;
            
            // Save loss statistics (gameWon will be false due to giving up)
            this.saveGameStats(stats);
            
            // Show modal
            const modal = document.getElementById('game-over-modal');
            modal.classList.add('active');
            
            // Setup modal button handlers with auto-hide
            this.setupModalHandlers();
            
            // Focus first button in modal for TV remote navigation
            setTimeout(() => {
                this.tvRemote.refresh();
                const firstButton = modal.querySelector('.modal-btn.focusable');
                if (firstButton) {
                    this.tvRemote.focusElement(firstButton);
                }
            }, 100);
        }, 150); // Small delay to ensure modal cleanup is complete
    }

    /**
     * Setup modal button handlers with keyboard navigation and auto-hide
     */
    setupModalHandlers() {
        const modal = document.getElementById('game-over-modal');
        
        // Store cleanup functions to avoid memory leaks
        if (!modal._modalCleanup) {
            modal._modalCleanup = [];
        } else {
            // Clean up previous handlers
            modal._modalCleanup.forEach(cleanup => cleanup());
            modal._modalCleanup = [];
        }
        
        const modalButtons = modal.querySelectorAll('.modal-btn');
        
        // Add click handlers with auto-hide functionality
        modalButtons.forEach(button => {
            const clickHandler = (event) => {
                const action = button.dataset.action;
                
                // Hide modal immediately
                modal.classList.remove('active');
                
                // Handle the action
                this.handleAction(action, button);
                
                // Refresh TV remote navigation for the new screen
                setTimeout(() => {
                    this.tvRemote.refresh();
                }, 100);
            };
            
            button.addEventListener('click', clickHandler);
            modal._modalCleanup.push(() => button.removeEventListener('click', clickHandler));
        });
        
        // Setup comprehensive keyboard and TV remote navigation within modal
        const handleModalKeydown = (event) => {
            if (!modal.classList.contains('active')) return;
            
            // Stop all events from propagating to background
            event.stopPropagation();
            event.preventDefault();
            
            const buttons = Array.from(modal.querySelectorAll('.modal-btn'));
            const currentButton = document.activeElement;
            let currentIndex = buttons.indexOf(currentButton);
            
            // If no button is focused, focus the first one
            if (currentIndex === -1) {
                currentIndex = 0;
                buttons[0].focus();
                return;
            }
            
            // Handle both string keys and Android KeyEvent constants
            const key = event.key;
            const keyCode = event.keyCode;
            
            // Navigation: Left/Up (Android KeyEvent constants: 21=LEFT, 19=UP)
            if (key === 'ArrowLeft' || key === 'ArrowUp' || keyCode === 21 || keyCode === 19) {
                const nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
                buttons[nextIndex].focus();
                buttons[nextIndex].classList.add('focused');
                buttons[currentIndex].classList.remove('focused');
            }
            // Navigation: Right/Down/Tab (Android KeyEvent constants: 22=RIGHT, 20=DOWN)
            else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab' || keyCode === 22 || keyCode === 20) {
                const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
                buttons[nextIndex].focus();
                buttons[nextIndex].classList.add('focused');
                buttons[currentIndex].classList.remove('focused');
            }
            // Select: Enter/Space (Android KeyEvent constants: 23=CENTER, 96=BUTTON_A)
            else if (key === 'Enter' || key === ' ' || keyCode === 23 || keyCode === 96) {
                buttons[currentIndex].click();
            }
            // Back: Escape (Android KeyEvent constants: 4=BACK, 27=ESCAPE)
            else if (key === 'Escape' || keyCode === 4 || keyCode === 27) {
                modal.classList.remove('active');
                this.tvRemote.refresh();
            }
        };
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleModalKeydown, true);
        modal._modalCleanup.push(() => document.removeEventListener('keydown', handleModalKeydown, true));
        
        // Handle TV remote back button in modal (dismiss modal)
        const handleModalBack = (event) => {
            if (modal.classList.contains('active')) {
                event.preventDefault();
                event.stopPropagation();
                modal.classList.remove('active');
                this.tvRemote.refresh();
            }
        };
        
        document.addEventListener('tvback', handleModalBack, true);
        modal._modalCleanup.push(() => document.removeEventListener('tvback', handleModalBack, true));
        
        // Prevent clicks outside modal from closing it (force explicit choice)
        const modalClickHandler = (event) => {
            if (event.target === modal) {
                event.preventDefault();
                event.stopPropagation();
                // Don't close modal - force explicit button choice
            }
        };
        
        modal.addEventListener('click', modalClickHandler);
        modal._modalCleanup.push(() => modal.removeEventListener('click', modalClickHandler));
        
        // Focus trap: ensure focus stays within modal
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        const focusTrapHandler = (event) => {
            if (!modal.classList.contains('active')) return;
            
            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstFocusable) {
                        event.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastFocusable) {
                        event.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        };
        
        modal.addEventListener('keydown', focusTrapHandler);
        modal._modalCleanup.push(() => modal.removeEventListener('keydown', focusTrapHandler));
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const stats = this.loadGameStats();
        
        document.getElementById('games-played').textContent = stats.gamesPlayed;
        document.getElementById('games-won').textContent = stats.gamesWon;
        
        const winRate = stats.gamesPlayed > 0 ? 
            Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
        document.getElementById('win-rate').textContent = `${winRate}%`;
        
        document.getElementById('avg-time').textContent = this.formatTime(stats.averageTime);
        document.getElementById('best-time').textContent = 
            stats.bestTime > 0 ? this.formatTime(stats.bestTime) : '--:--';
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Save game statistics
     */
    saveGameStats(gameStats) {
        const stats = this.loadGameStats();
        
        stats.gamesPlayed++;
        if (gameStats.gameWon) {
            stats.gamesWon++;
            
            if (stats.bestTime === 0 || gameStats.gameTime < stats.bestTime) {
                stats.bestTime = gameStats.gameTime;
            }
        }
        
        // Update average time
        stats.totalTime += gameStats.gameTime;
        stats.averageTime = stats.totalTime / stats.gamesPlayed;
        
        localStorage.setItem('solitaire-stats', JSON.stringify(stats));
    }

    /**
     * Load game statistics
     */
    loadGameStats() {
        const defaultStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            totalTime: 0,
            averageTime: 0,
            bestTime: 0
        };
        
        try {
            const saved = localStorage.getItem('solitaire-stats');
            return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
        } catch (error) {
            return defaultStats;
        }
    }

    /**
     * Load settings
     */
    loadSettings() {
        const defaultSettings = {
            autoComplete: true,
            showHints: true,
            soundEffects: true
        };
        
        try {
            const saved = localStorage.getItem('solitaire-settings');
            const settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
            
            // Apply settings to UI
            const autoCompleteEl = document.getElementById('auto-complete');
            const showHintsEl = document.getElementById('show-hints');
            const soundEffectsEl = document.getElementById('sound-effects');
            
            if (autoCompleteEl) autoCompleteEl.checked = settings.autoComplete;
            if (showHintsEl) showHintsEl.checked = settings.showHints;
            if (soundEffectsEl) soundEffectsEl.checked = settings.soundEffects;
            
            return settings;
        } catch (error) {
            return defaultSettings;
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        const settings = {
            autoComplete: document.getElementById('auto-complete')?.checked || false,
            showHints: document.getElementById('show-hints')?.checked || false,
            soundEffects: document.getElementById('sound-effects')?.checked || false
        };
        
        localStorage.setItem('solitaire-settings', JSON.stringify(settings));
    }

    /**
     * Get current settings
     */
    getSettings() {
        return this.loadSettings();
    }

    /**
     * Show a temporary message
     */
    showMessage(message, duration = 3000) {
        // Create or update message element
        let messageEl = document.getElementById('game-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'game-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 1rem 2rem;
                border-radius: 8px;
                z-index: 3000;
                font-size: 1.1rem;
            `;
            document.body.appendChild(messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }

    /**
     * Update layout for responsive design
     */
    updateLayout() {
        // Recalculate card positions and sizes if needed
        this.renderGameBoard();
    }

    /**
     * Show card information
     */
    showCardInfo(cardElement) {
        const cardId = cardElement.dataset.cardId;
        const rank = cardElement.dataset.rank;
        const suit = cardElement.dataset.suit;
        
        this.showMessage(`${this.getRankName(rank)} of ${suit}`);
    }

    /**
     * Get rank name for display
     */
    getRankName(rank) {
        switch (parseInt(rank)) {
            case 1: return 'Ace';
            case 11: return 'Jack';
            case 12: return 'Queen';
            case 13: return 'King';
            default: return rank;
        }
    }

    /**
     * Test keyboard navigation and distance calculation
     * This function can be called from the browser console to test navigation
     */
    testKeyboardNavigation() {
        console.log('=== Testing Keyboard Navigation ===');
        
        // First test the distance calculation function
        console.log('Testing distance calculation...');
        const distanceTests = this.tvRemote.testCalculateDistance();
        
        // Test keyboard navigation if we're in game screen
        if (this.currentScreen !== 'game-screen') {
            console.log('Not in game screen. Starting a new game for testing...');
            this.startNewGame('medium');
        }
        
        console.log('Current navigation state:', this.keyboardNavigation);
        
        // Test getting current focus element
        const currentElement = this.getCurrentFocusElement();
        console.log('Current focused element:', currentElement);
        
        if (currentElement) {
            const rect = currentElement.getBoundingClientRect();
            console.log('Current element rect:', rect);
        }
        
        // Test getting all focusable elements
        const allElements = this.getAllFocusableGameElements();
        console.log(`Found ${allElements.length} focusable game elements`);
        
        // Test finding elements in different directions
        if (currentElement) {
            console.log('Testing direction finding...');
            
            const upElement = this.findBestElementInDirection(currentElement, 'up');
            const downElement = this.findBestElementInDirection(currentElement, 'down');
            const leftElement = this.findBestElementInDirection(currentElement, 'left');
            const rightElement = this.findBestElementInDirection(currentElement, 'right');
            
            console.log('Best element UP:', upElement);
            console.log('Best element DOWN:', downElement);
            console.log('Best element LEFT:', leftElement);
            console.log('Best element RIGHT:', rightElement);
        }
        
        // Test navigation state updates
        console.log('Testing navigation state updates...');
        const originalState = { ...this.keyboardNavigation };
        
        // Test moving to different areas
        this.keyboardNavigation.currentArea = 'foundation';
        this.keyboardNavigation.currentColumn = 1;
        this.updateKeyboardFocus();
        console.log('Moved to foundation area:', this.keyboardNavigation);
        
        this.keyboardNavigation.currentArea = 'stock';
        this.updateKeyboardFocus();
        console.log('Moved to stock area:', this.keyboardNavigation);
        
        this.keyboardNavigation.currentArea = 'waste';
        this.updateKeyboardFocus();
        console.log('Moved to waste area:', this.keyboardNavigation);
        
        // Restore original state
        this.keyboardNavigation = originalState;
        this.updateKeyboardFocus();
        console.log('Restored original state:', this.keyboardNavigation);
        
        console.log('=== Keyboard Navigation Tests Completed ===');
        
        return {
            distanceTests,
            currentScreen: this.currentScreen,
            navigationState: this.keyboardNavigation,
            focusableElementsCount: allElements.length,
            currentElement: currentElement ? currentElement.tagName + (currentElement.className ? '.' + currentElement.className : '') : null
        };
    }

    /**
     * Test navigation in a specific direction
     * This simulates pressing an arrow key and shows what happens
     */
    testNavigationDirection(direction) {
        console.log(`=== Testing Navigation: ${direction.toUpperCase()} ===`);
        
        const beforeState = { ...this.keyboardNavigation };
        const beforeElement = this.getCurrentFocusElement();
        
        console.log('Before navigation:', beforeState);
        console.log('Before element:', beforeElement);
        
        // Perform navigation
        switch (direction.toLowerCase()) {
            case 'up':
                this.navigateUp();
                break;
            case 'down':
                this.navigateDown();
                break;
            case 'left':
                this.navigateLeft();
                break;
            case 'right':
                this.navigateRight();
                break;
            default:
                console.log('Invalid direction. Use: up, down, left, right');
                return;
        }
        
        this.updateKeyboardFocus();
        
        const afterState = { ...this.keyboardNavigation };
        const afterElement = this.getCurrentFocusElement();
        
        console.log('After navigation:', afterState);
        console.log('After element:', afterElement);
        
        const moved = JSON.stringify(beforeState) !== JSON.stringify(afterState);
        console.log('Navigation result:', moved ? 'MOVED' : 'NO MOVEMENT');
        
        return {
            direction,
            moved,
            before: { state: beforeState, element: beforeElement },
            after: { state: afterState, element: afterElement }
        };
    }

    /**
     * Setup event handlers for no moves indicator
     */
    setupNoMovesIndicatorHandlers() {
        // Draw stock button in no moves indicator
        const drawStockBtn = document.getElementById('draw-stock-btn');
        if (drawStockBtn) {
            drawStockBtn.addEventListener('click', () => {
                this.hideNoMovesIndicator();
                this.handleStockClick();
            });
        }

        // New game button in no moves indicator
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.hideNoMovesIndicator();
                this.startNewGame(this.gameState.difficulty);
            });
        }

        // Close indicator when clicking outside of it
        const noMovesIndicator = document.getElementById('no-moves-indicator');
        if (noMovesIndicator) {
            noMovesIndicator.addEventListener('click', (event) => {
                if (event.target === noMovesIndicator) {
                    this.hideNoMovesIndicator();
                }
            });
        }

        // Handle escape key to close indicator
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isNoMovesIndicatorVisible()) {
                this.hideNoMovesIndicator();
            }
        });
    }

    /**
     * Check if there are no moves left and show indicator if needed
     */
    checkNoMovesLeft() {
        // Only check during active gameplay
        if (this.currentScreen !== 'game-screen' || this.gameState.gameWon || this.gameState.gameLost) {
            console.log('Skipping move check - not in active gameplay:', {
                currentScreen: this.currentScreen,
                gameWon: this.gameState.gameWon,
                gameLost: this.gameState.gameLost
            });
            return;
        }

        // Don't check if cards are selected (player is in middle of move)
        if (this.selectedCards.length > 0) {
            console.log('Skipping move check - cards are selected');
            return;
        }

        // Use comprehensive move checking
        console.log('=== CHECKING FOR AVAILABLE MOVES ===');
        const hasMovesAvailable = this.checkForMoves();
        console.log('=== MOVES AVAILABLE:', hasMovesAvailable, '===');
        
        if (!hasMovesAvailable) {
            // No moves available - check if undo is possible
            const canUndo = this.gameState.canUndo(this.difficultyManager);
            console.log('=== NO MOVES AVAILABLE ===');
            console.log('Can undo:', canUndo, 'Move history length:', this.gameState.moveHistory.length);
            console.log('Actual moves made:', this.gameState.actualMovesMade);
            console.log('Undo count:', this.gameState.undoCount);
            
            if (!canUndo) {
                // Game is truly unwinnable - mark as lost and handle
                console.log('=== GAME LOST - NO MOVES AND NO UNDO ===');
                this.gameState.gameLost = true;
                this.handleGameLoss();
            } else {
                // Moves unavailable but undo is possible - show hint about undo
                console.log('=== NO MOVES BUT UNDO AVAILABLE ===');
                this.showMessage('No moves available. Try using Undo or start a new game.', 4000);
            }
        } else {
            console.log('=== MOVES ARE AVAILABLE - CONTINUING GAME ===');
        }
    }

    /**
     * Comprehensive check for any available moves in the current game state
     * Based on systematic move preference order for solitaire
     * Returns true if moves are available, false if no moves left
     */
    checkForMoves() {
        // 1. Waste to foundation: Check if top waste card can go to foundation
        if (this.checkWasteToFoundation()) {
            return true;
        }

        // 2. Top of tableau to foundation: Check if any tableau top card can go to foundation
        if (this.checkTableauToFoundation()) {
            return true;
        }

        // 3. King-stack to empty tableau: Kings can move to empty tableaus
        if (this.checkKingStackToEmptyTableau()) {
            return true;
        }

        // 4. Non-king stack to eligible tableau: Face-up sequences between tableaus
        if (this.checkNonKingStackToTableau()) {
            return true;
        }

        // 5. King waste to empty tableau: King from waste to empty tableau
        if (this.checkKingWasteToEmptyTableau()) {
            return true;
        }

        // 6. Non-king waste to eligible tableau: Waste card to tableau
        if (this.checkNonKingWasteToTableau()) {
            return true;
        }

        // 7. Draw: Can draw from stock
        if (this.checkCanDraw()) {
            return true;
        }

        // 8. Reset: Can reset waste back to stock
        if (this.checkCanReset()) {
            return true;
        }

        // If we reach here, no moves are available
        return false;
    }

    /**
     * Check for moves involving stock and waste piles
     */
    checkStockWasteMoves() {
        // If we can draw from stock, that's a move
        if (this.gameState.stock.length > 0) {
            return true;
        }

        // If waste pile is empty, no moves from it
        if (this.gameState.waste.length === 0) {
            return false;
        }

        const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];

        // Check if top waste card can move to any foundation pile
        for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
            if (topWasteCard.canPlaceOnFoundation(this.gameState.foundation[foundIndex])) {
                return true;
            }
        }

        // Check if top waste card can move to any tableau column
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;
            
            if (topWasteCard.canPlaceOnTableau(targetCard)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for moves from tableau to foundations
     */
    checkTableauToFoundationMoves() {
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            if (column.length === 0) continue;

            const topCard = column[column.length - 1];
            if (!topCard.faceUp) continue;

            // Check if this card can move to any foundation pile
            for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                if (topCard.canPlaceOnFoundation(this.gameState.foundation[foundIndex])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check for moves within the tableau (sequences and Kings to empty columns)
     */
    checkTableauMoves() {
        // First, find all empty columns for King placement
        const emptyColumns = [];
        for (let col = 0; col < 7; col++) {
            if (this.gameState.tableau[col].length === 0) {
                emptyColumns.push(col);
            }
        }

        // Check moves for each tableau column
        for (let fromCol = 0; fromCol < 7; fromCol++) {
            const fromColumn = this.gameState.tableau[fromCol];
            if (fromColumn.length === 0) continue;

            // Find all possible movable sequences
            for (let startIndex = 0; startIndex < fromColumn.length; startIndex++) {
                const startCard = fromColumn[startIndex];
                if (!startCard.faceUp) continue;

                // Check if this card can start a movable sequence
                if (!this.isValidSequenceStart(fromColumn, startIndex)) continue;

                const movingCard = startCard;

                // Check if this card/sequence can move to any other tableau column
                for (let toCol = 0; toCol < 7; toCol++) {
                    if (toCol === fromCol) continue;

                    const toColumn = this.gameState.tableau[toCol];

                    // Check for King to empty column
                    if (toColumn.length === 0) {
                        if (movingCard.rank === 13 && emptyColumns.includes(toCol)) {
                            return true;
                        }
                    } else {
                        // Check regular tableau placement
                        const targetCard = toColumn[toColumn.length - 1];
                        if (movingCard.canPlaceOnTableau(targetCard)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Check if a card at a given position can start a valid movable sequence
     */
    isValidSequenceStart(column, startIndex) {
        if (startIndex >= column.length) return false;

        const startCard = column[startIndex];
        if (!startCard.faceUp) return false;

        // A card can start a sequence if:
        // 1. It's face up, AND
        // 2. All cards after it form a valid descending sequence with alternating colors

        for (let i = startIndex; i < column.length - 1; i++) {
            const currentCard = column[i];
            const nextCard = column[i + 1];

            if (!nextCard.faceUp) return false;
            if (!nextCard.canPlaceOnTableau(currentCard)) return false;
        }

        return true;
    }

    /**
     * 1. Waste to foundation: Check if top waste card can go to foundation
     */
    checkWasteToFoundation() {
        if (this.gameState.waste.length === 0) return false;

        const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];
        
        for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
            if (topWasteCard.canPlaceOnFoundation(this.gameState.foundation[foundIndex])) {
                return true;
            }
        }
        return false;
    }

    /**
     * 2. Top of tableau to foundation: Check if any tableau top card can go to foundation  
     */
    checkTableauToFoundation() {
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            if (column.length === 0) continue;

            const topCard = column[column.length - 1];
            if (!topCard.faceUp) continue;

            for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                if (topCard.canPlaceOnFoundation(this.gameState.foundation[foundIndex])) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 3. King-stack to empty tableau: Kings with face-up stacks can move to empty tableaus
     */
    checkKingStackToEmptyTableau() {
        // Find empty tableaus
        const emptyTableaus = [];
        for (let col = 0; col < 7; col++) {
            if (this.gameState.tableau[col].length === 0) {
                emptyTableaus.push(col);
            }
        }

        if (emptyTableaus.length === 0) return false;

        // Check each tableau for movable King stacks
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            if (column.length <= 1) continue; // Need more than one card to move a stack

            // Find the first face-up card
            let firstFaceUpIndex = -1;
            for (let i = 0; i < column.length; i++) {
                if (column[i].faceUp) {
                    firstFaceUpIndex = i;
                    break;
                }
            }

            // Check if the first face-up card is a King and we can move the stack
            if (firstFaceUpIndex >= 0 && 
                firstFaceUpIndex < column.length - 1 && // Must have cards after it to form a stack
                column[firstFaceUpIndex].rank === 13) {
                
                // Verify the sequence is valid (descending, alternating colors)
                if (this.isValidSequenceStart(column, firstFaceUpIndex)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 4. Non-king stack to eligible tableau: Face-up sequences between tableaus
     */
    checkNonKingStackToTableau() {
        // Check each tableau column for movable sequences
        for (let fromCol = 0; fromCol < 7; fromCol++) {
            const fromColumn = this.gameState.tableau[fromCol];
            if (fromColumn.length === 0) continue;

            // Check each possible starting position for a movable sequence
            for (let startIndex = 0; startIndex < fromColumn.length; startIndex++) {
                const startCard = fromColumn[startIndex];
                if (!startCard.faceUp) continue;
                if (startCard.rank === 13) continue; // Skip Kings (handled separately)

                // Check if this forms a valid sequence
                if (!this.isValidSequenceStart(fromColumn, startIndex)) continue;

                // Check if this sequence can move to any other tableau
                for (let toCol = 0; toCol < 7; toCol++) {
                    if (toCol === fromCol) continue;

                    const toColumn = this.gameState.tableau[toCol];
                    if (toColumn.length === 0) continue; // Empty columns handled separately

                    const targetCard = toColumn[toColumn.length - 1];
                    if (startCard.canPlaceOnTableau(targetCard)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 5. King waste to empty tableau: King from waste can go to empty tableau
     */
    checkKingWasteToEmptyTableau() {
        if (this.gameState.waste.length === 0) return false;

        const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];
        if (topWasteCard.rank !== 13) return false; // Not a King

        // Check if any tableau is empty
        for (let col = 0; col < 7; col++) {
            if (this.gameState.tableau[col].length === 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * 6. Non-king waste to eligible tableau: Waste card can go to tableau  
     */
    checkNonKingWasteToTableau() {
        if (this.gameState.waste.length === 0) return false;

        const topWasteCard = this.gameState.waste[this.gameState.waste.length - 1];
        if (topWasteCard.rank === 13) return false; // Kings handled separately

        // Check if waste card can go to any tableau
        for (let col = 0; col < 7; col++) {
            const column = this.gameState.tableau[col];
            if (column.length === 0) continue; // Empty tableaus handled separately

            const targetCard = column[column.length - 1];
            if (topWasteCard.canPlaceOnTableau(targetCard)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 7. Draw: Can draw from stock
     */
    checkCanDraw() {
        return this.gameState.stock.length > 0;
    }

    /**
     * 8. Reset: Can reset waste back to stock (if stock is empty and waste has cards)
     */
    checkCanReset() {
        return this.gameState.stock.length === 0 && this.gameState.waste.length > 0;
    }

    /**
     * Show the no moves left indicator
     */
    showNoMovesIndicator() {
        const indicator = document.getElementById('no-moves-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            
            // Focus the first button for TV remote navigation
            setTimeout(() => {
                const firstBtn = indicator.querySelector('.control-btn');
                if (firstBtn && this.tvRemote) {
                    this.tvRemote.focusElement(firstBtn);
                }
            }, 100);
        }
    }

    /**
     * Hide the no moves left indicator
     */
    hideNoMovesIndicator() {
        const indicator = document.getElementById('no-moves-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
            
            // Refresh TV remote focus
            setTimeout(() => {
                if (this.tvRemote) {
                    this.tvRemote.refresh();
                }
            }, 100);
        }
    }

    /**
     * Check if the no moves indicator is currently visible
     */
    isNoMovesIndicatorVisible() {
        const indicator = document.getElementById('no-moves-indicator');
        return indicator && !indicator.classList.contains('hidden');
    }

    /**
     * Test function to simulate a no-moves scenario for debugging
     * This function can be called from the browser console
     */
    testNoMovesScenario() {
        console.log('=== TESTING NO MOVES SCENARIO ===');
        
        if (this.currentScreen !== 'game-screen') {
            console.log('Not in game screen. Starting a new game...');
            this.startNewGame('hard');
            
            // Wait a moment for the game to initialize
            setTimeout(() => {
                this.testNoMovesScenario();
            }, 500);
            return;
        }
        
        console.log('Creating a test scenario with no moves available...');
        
        // Create a scenario where no moves are possible
        // Clear all tableaus except for one card that can't move
        for (let col = 0; col < 7; col++) {
            this.gameState.tableau[col] = [];
        }
        
        // Put a single black King in tableau[0] that can't go anywhere
        if (typeof Card !== 'undefined') {
            const blackKing = new Card(13, 'spades'); // King of Spades
            blackKing.faceUp = true;
            this.gameState.tableau[0] = [blackKing];
            
            // Put a red Queen in tableau[1] that can't accept the black King
            const redQueen = new Card(12, 'hearts'); // Queen of Hearts  
            redQueen.faceUp = true;
            this.gameState.tableau[1] = [redQueen];
        }
        
        // Clear stock and waste
        this.gameState.stock = [];
        this.gameState.waste = [];
        
        // Clear foundations 
        this.gameState.foundation = [[], [], [], []];
        
        // Clear move history so undo isn't available
        this.gameState.moveHistory = [];
        this.gameState.actualMovesMade = 0;
        this.gameState.undoCount = 0;
        
        // Ensure game isn't won or lost yet
        this.gameState.gameWon = false;
        this.gameState.gameLost = false;
        
        console.log('Test scenario created:');
        console.log('- Tableau 0: King of Spades (black)');
        console.log('- Tableau 1: Queen of Hearts (red)');
        console.log('- All other areas empty');
        console.log('- No undo available');
        
        // Re-render the game
        this.renderGameBoard();
        this.updateGameDisplay();
        
        console.log('Now triggering move check...');
        
        // Trigger the move check manually
        setTimeout(() => {
            this.checkNoMovesLeft();
        }, 200);
        
        return 'Test scenario created - check console for results';
    }

    /**
     * Test the move detection system directly
     */
    testMoveDetection() {
        console.log('=== TESTING MOVE DETECTION SYSTEM ===');
        
        if (this.currentScreen !== 'game-screen') {
            console.log('Not in game screen. Please start a game first.');
            return;
        }
        
        console.log('Current game state:');
        console.log('Stock length:', this.gameState.stock.length);
        console.log('Waste length:', this.gameState.waste.length);
        console.log('Tableau lengths:', this.gameState.tableau.map(col => col.length));
        console.log('Foundation lengths:', this.gameState.foundation.map(pile => pile.length));
        
        // Test each move detection function individually
        console.log('\nTesting individual move detection functions:');
        
        const results = {
            wasteToFoundation: this.checkWasteToFoundation(),
            tableauToFoundation: this.checkTableauToFoundation(), 
            kingStackToEmpty: this.checkKingStackToEmptyTableau(),
            nonKingStackToTableau: this.checkNonKingStackToTableau(),
            kingWasteToEmpty: this.checkKingWasteToEmptyTableau(),
            nonKingWasteToTableau: this.checkNonKingWasteToTableau(),
            canDraw: this.checkCanDraw(),
            canReset: this.checkCanReset()
        };
        
        console.log('Move detection results:', results);
        
        const overallResult = this.checkForMoves();
        console.log('Overall moves available:', overallResult);
        
        const canUndo = this.gameState.canUndo(this.difficultyManager);
        console.log('Can undo:', canUndo);
        
        return results;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopGameTimer();
        
        if (this.animationQueue) {
            this.animationQueue.length = 0;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

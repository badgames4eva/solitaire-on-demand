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
     */
    constructor(gameState, difficultyManager, tvRemote) {
        // Core system references
        this.gameState = gameState;                    // Access to game logic and state
        this.difficultyManager = difficultyManager;    // Access to difficulty rules
        this.tvRemote = tvRemote;                     // Access to navigation system
        
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
            const target = event.target;
            
            if (target.matches('[data-action]')) {
                this.handleAction(target.dataset.action, target);
            }
        });

        // Keyboard event handler
        document.addEventListener('keydown', (event) => {
            this.handleKeyboard(event);
        });

        // TV remote back button handler
        document.addEventListener('tvback', (event) => {
            this.handleBackButton();
        });

        // TV remote menu button handler
        document.addEventListener('tvmenu', (event) => {
            this.handleMenuButton();
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
                this.updateKeyboardFocus();
                break;
            case 'down':
                this.updateKeyboardFocus();
                break;
            case 'left':
                this.updateKeyboardFocus();
                break;
            case 'right':
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
            // Navigation
            case 'arrowleft':
                this.navigateLeft();
                break;
            case 'arrowright':
                this.navigateRight();
                break;
            case 'arrowup':
                this.navigateUp();
                break;
            case 'arrowdown':
                this.navigateDown();
                break;
            
            // Actions
            case 'enter':
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
                // Move between control buttons (Hint, Undo, Menu)
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
                // Move between control buttons (Hint, Undo, Menu)
                nav.currentColumn = Math.min(2, nav.currentColumn + 1);
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
                // Control buttons: 0=Hint, 1=Undo, 2=Menu
                const controlButtons = ['hint-btn', 'undo-btn', 'menu-btn'];
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
     * Handle TV remote back button
     */
    handleBackButton() {
        switch (this.currentScreen) {
            case 'game-screen':
                this.showScreen('main-menu');
                break;
            case 'stats-screen':
            case 'settings-screen':
                this.showScreen('main-menu');
                break;
            case 'main-menu':
                // Could show exit confirmation
                break;
        }
    }

    /**
     * Handle TV remote menu button
     */
    handleMenuButton() {
        // Show game menu or settings based on current screen
        if (this.currentScreen === 'game-screen') {
            this.showScreen('settings-screen');
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
     * Show screen by ID and manage screen transitions
     */
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            
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
                // Activate control buttons: 0=Hint, 1=Undo, 2=Menu
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
                // Control buttons: 0=Hint, 1=Undo, 2=Menu
                const controlButtons = ['hint-btn', 'undo-btn', 'menu-btn'];
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
            
            // Position cards with slight offset
            const offset = (i - startIndex) * 2;
            cardElement.style.left = `${offset}px`;
            cardElement.style.top = `${offset}px`;
            cardElement.style.zIndex = i;
            
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
            this.renderStock();
            this.renderWaste();
            this.updateGameDisplay();
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
            // Clear selection immediately on successful move to prevent re-selection
            this.clearSelection();
            
            this.animateMove(this.selectedSource, { area: targetArea, index: targetIndex });
            this.updateGameDisplay();
            
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
            // Only clear selection if move failed (for retry)
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
    animateMove(from, to) {
        // Add animation to queue
        this.animationQueue.push({ from, to });
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
        
        // Undo button
        const canUndo = this.gameState.moveHistory.length > 0 && 
                       this.difficultyManager.canUndo(this.gameState.moves);
        undoBtn.disabled = !canUndo;
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
        
        // Update modal content
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
     * Setup modal button handlers with keyboard navigation and auto-hide
     */
    setupModalHandlers() {
        const modal = document.getElementById('game-over-modal');
        const modalButtons = modal.querySelectorAll('.modal-btn');
        
        // Remove any existing event listeners to prevent duplicates
        modalButtons.forEach(button => {
            // Clone the button to remove all event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // Get the updated button references after cloning
        const updatedButtons = modal.querySelectorAll('.modal-btn');
        
        // Add click handlers with auto-hide functionality
        updatedButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const action = button.dataset.action;
                
                // Hide modal immediately
                modal.classList.remove('active');
                
                // Handle the action
                this.handleAction(action, button);
                
                // Refresh TV remote navigation for the new screen
                setTimeout(() => {
                    this.tvRemote.refresh();
                }, 100);
            });
            
            // Add keyboard navigation support
            button.addEventListener('keydown', (event) => {
                switch (event.key) {
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        button.click();
                        break;
                    case 'Escape':
                        event.preventDefault();
                        modal.classList.remove('active');
                        this.tvRemote.refresh();
                        break;
                    case 'ArrowLeft':
                    case 'ArrowRight':
                        event.preventDefault();
                        // Navigate between modal buttons
                        const buttons = Array.from(updatedButtons);
                        const currentIndex = buttons.indexOf(button);
                        let nextIndex;
                        
                        if (event.key === 'ArrowLeft') {
                            nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
                        } else {
                            nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
                        }
                        
                        buttons[nextIndex].focus();
                        this.tvRemote.focusElement(buttons[nextIndex]);
                        break;
                }
            });
        });
        
        // Setup TV remote navigation within modal
        const handleModalNavigation = (event) => {
            if (!modal.classList.contains('active')) return;
            
            const buttons = Array.from(modal.querySelectorAll('.modal-btn'));
            const currentButton = document.activeElement;
            const currentIndex = buttons.indexOf(currentButton);
            
            switch (event.detail?.source) {
                case 'remote':
                    // Handle TV remote navigation
                    event.preventDefault();
                    break;
            }
        };
        
        // Add TV remote event listeners for modal
        document.addEventListener('tvleft', handleModalNavigation);
        document.addEventListener('tvright', handleModalNavigation);
        document.addEventListener('tvselect', handleModalNavigation);
        document.addEventListener('tvback', (event) => {
            if (modal.classList.contains('active')) {
                event.preventDefault();
                modal.classList.remove('active');
                this.tvRemote.refresh();
            }
        });
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

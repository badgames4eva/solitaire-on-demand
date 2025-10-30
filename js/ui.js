/**
 * UI Manager for Solitaire On Demand
 * Handles all user interface interactions and updates
 */
class UIManager {
    constructor(gameState, difficultyManager, tvRemote) {
        this.gameState = gameState;
        this.difficultyManager = difficultyManager;
        this.tvRemote = tvRemote;
        this.currentScreen = 'main-menu';
        this.selectedCards = [];
        this.selectedSource = null;
        this.gameTimer = null;
        this.animationQueue = [];
        this.isAnimating = false;
        this.focusedElement = null;
        this.keyboardNavigation = {
            currentColumn: 0,
            currentRow: 0,
            currentArea: 'tableau' // tableau, foundation, stock, waste
        };
        
        this.init();
    }

    /**
     * Initialize the UI manager
     */
    init() {
        this.setupEventListeners();
        this.showScreen('main-menu');
        this.loadSettings();
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

        // Keyboard navigation handlers
        document.addEventListener('keydown', (event) => {
            this.handleKeyboard(event);
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
     */
    navigateLeft() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                if (nav.currentColumn > 0) {
                    nav.currentColumn--;
                    // Always focus on the last card in the new column (the selectable one)
                    const leftColumn = this.gameState.tableau[nav.currentColumn];
                    nav.currentRow = Math.max(0, leftColumn.length - 1);
                }
                break;
            case 'foundation':
                nav.currentColumn = Math.max(0, nav.currentColumn - 1);
                break;
            case 'stock':
                nav.currentArea = 'waste';
                break;
            case 'waste':
                nav.currentArea = 'stock';
                break;
        }
    }

    /**
     * Navigate right in current area
     */
    navigateRight() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                if (nav.currentColumn < 6) {
                    nav.currentColumn++;
                    // Always focus on the last card in the new column (the selectable one)
                    const rightColumn = this.gameState.tableau[nav.currentColumn];
                    nav.currentRow = Math.max(0, rightColumn.length - 1);
                }
                break;
            case 'foundation':
                nav.currentColumn = Math.min(3, nav.currentColumn + 1);
                break;
            case 'stock':
                nav.currentArea = 'waste';
                break;
            case 'waste':
                nav.currentArea = 'stock';
                break;
        }
    }

    /**
     * Navigate up in current area
     */
    navigateUp() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'tableau':
                // From tableau, go directly to stock/waste area
                nav.currentArea = 'stock';
                nav.currentColumn = 0;
                nav.currentRow = 0;
                break;
            case 'foundation':
                // Stay in foundation, can't go higher
                break;
            case 'stock':
                // From stock, go to foundation
                nav.currentArea = 'foundation';
                nav.currentColumn = 0;
                break;
            case 'waste':
                // From waste, go to foundation
                nav.currentArea = 'foundation';
                nav.currentColumn = 1;
                break;
        }
    }

    /**
     * Navigate down in current area
     */
    navigateDown() {
        const nav = this.keyboardNavigation;
        
        switch (nav.currentArea) {
            case 'foundation':
                // From foundation, go to tableau
                nav.currentArea = 'tableau';
                nav.currentColumn = Math.min(nav.currentColumn, 6);
                const column = this.gameState.tableau[nav.currentColumn];
                nav.currentRow = Math.max(0, column.length - 1);
                break;
            case 'tableau':
                // In tableau, stay in tableau (no vertical movement within columns)
                break;
            case 'stock':
            case 'waste':
                // From stock/waste, go to tableau
                nav.currentArea = 'tableau';
                nav.currentColumn = 0;
                const firstColumn = this.gameState.tableau[0];
                nav.currentRow = Math.max(0, firstColumn.length - 1);
                break;
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
        if (this.currentScreen === 'game-screen') {
            this.showScreen('main-menu');
        }
    }

    /**
     * Handle long select for context actions
     */
    handleLongSelect(element) {
        if (element.classList.contains('card')) {
            // Show card info or context menu
            this.showCardInfo(element);
        }
    }

    /**
     * Show a specific screen
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

            // Update TV remote focus
            this.tvRemote.refresh();

            // Screen-specific initialization
            switch (screenId) {
                case 'game-screen':
                    this.startGameTimer();
                    this.renderGameBoard();
                    this.initializeKeyboardNavigation();
                    break;
                case 'stats-screen':
                    this.updateStatsDisplay();
                    break;
                case 'main-menu':
                    this.stopGameTimer();
                    break;
            }
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
        } else {
            stockElement.classList.remove('has-cards');
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
        // Foundation piles are only drop targets, not selectable
        if (this.selectedCards.length === 1) {
            this.attemptMove('foundation', foundationIndex);
        }
        // Don't allow selecting cards from foundation piles
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
     * Handle area click (empty areas)
     */
    handleAreaClick(element) {
        if (element.classList.contains('tableau-column')) {
            const column = parseInt(element.dataset.column);
            if (this.gameState.tableau[column].length === 0) {
                this.attemptMove('tableau', column);
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
        }
        
        this.clearSelection();
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
        document.getElementById('game-over-modal').classList.add('active');
        
        // Focus first button in modal
        setTimeout(() => {
            this.tvRemote.refresh();
        }, 100);
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

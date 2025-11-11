/**
 * GameState class for managing the current state of the solitaire game
 * Tracks all game data including card positions, score, timing, and move history
 */
class GameState {
    /**
     * Initialize a new game state with default values
     */
    constructor() {
        this.reset(); // Set all properties to their initial state
    }

    /**
     * Reset the game state to initial values for a new game
     * Clears all card positions, resets counters, and initializes empty arrays
     */
    reset() {
        // Card layout areas
        this.tableau = [[], [], [], [], [], [], []]; // 7 columns for main playing area
        this.foundation = [[], [], [], []]; // 4 foundation piles (hearts, diamonds, clubs, spades)
        this.stock = []; // Remaining cards to draw from (face down)
        this.waste = []; // Cards drawn from stock (face up)
        
        // Selection state for moving cards
        this.selectedCards = []; // Currently selected cards for moving
        this.selectedSource = null; // Where the selected cards came from
        
        // Game configuration
        this.difficulty = 'medium'; // Current difficulty level
        this.drawCount = 1; // Number of cards to draw from stock (1 for easy/medium, 3 for hard)
        
        // Game progress tracking
        this.moves = 0; // Total number of moves made
        this.score = 0; // Current game score
        this.startTime = null; // When the game started (timestamp)
        this.endTime = null; // When the game ended (timestamp)
        
        // Game state flags
        this.gameWon = false; // Whether the player has won
        this.gameLost = false; // Whether the game is in an unwinnable state
        
        // Statistics tracking
        this.stockCycles = 0; // How many times the stock has been recycled
        this.emptyColumnsCreated = 0; // Number of empty tableau columns created
        
        // Undo functionality
        this.moveHistory = []; // History of moves for undo feature
        
        // Auto-complete availability
        this.autoCompleteAvailable = false; // Whether auto-complete can be triggered
    }

    /**
     * Initialize a new game with the given difficulty
     */
    newGame(difficulty = 'medium') {
        this.reset();
        this.difficulty = difficulty;
        this.drawCount = difficulty === 'hard' ? 3 : 1;
        this.startTime = Date.now();

        const deck = new Deck();
        let deal;

        switch (difficulty) {
            case 'easy':
                deal = deck.createWinnableDeal();
                break;
            case 'hard':
                deal = deck.createHardDeal();
                break;
            default: // medium
                deal = deck.deal();
                break;
        }

        this.tableau = deal.tableau;
        this.foundation = deal.foundation;
        this.stock = deal.stock;
        this.waste = deal.waste;

        this.checkAutoComplete();
        
        // Create initial snapshot for undo functionality
        // This allows undoing the very first move
        this.recordMove({
            type: 'initial-state',
            description: 'Game started'
        });
    }

    /**
     * Draw cards from stock to waste pile
     */
    drawFromStock() {
        if (this.stock.length === 0) {
            // Recycle waste pile back to stock
            if (this.waste.length === 0) {
                return false; // No cards to draw
            }
            
            this.stock = [...this.waste].reverse();
            this.waste = [];
            this.stockCycles++;
            
            // Reset face-up state for recycled cards
            this.stock.forEach(card => card.faceUp = false);
            
            this.recordMove({
                type: 'recycle-stock',
                stockCycles: this.stockCycles
            });
        }

        // Draw the specified number of cards
        const cardsToDraw = Math.min(this.drawCount, this.stock.length);
        for (let i = 0; i < cardsToDraw; i++) {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }

        this.recordMove({
            type: 'draw-stock',
            count: cardsToDraw
        });

        return true;
    }

    /**
     * Move cards from one location to another
     */
    moveCards(fromArea, fromIndex, toArea, toIndex, cardCount = 1) {
        const move = {
            type: 'move-cards',
            from: { area: fromArea, index: fromIndex },
            to: { area: toArea, index: toIndex },
            cards: [],
            flippedCard: null
        };

        let sourceCards = this.getCardArray(fromArea, fromIndex);
        let targetCards = this.getCardArray(toArea, toIndex);

        if (!sourceCards || sourceCards.length === 0) {
            return false;
        }

        // Get the cards to move
        const cardsToMove = sourceCards.slice(-cardCount);
        move.cards = cardsToMove.map(card => card.toJSON());

        // Validate the move
        if (!this.isValidMove(cardsToMove, fromArea, toArea, targetCards, toIndex)) {
            return false;
        }

        // Execute the move
        sourceCards.splice(-cardCount, cardCount);
        targetCards.push(...cardsToMove);

        // Check if we need to flip a card in the source tableau column
        if (fromArea === 'tableau' && sourceCards.length > 0) {
            const topCard = sourceCards[sourceCards.length - 1];
            if (!topCard.faceUp) {
                topCard.faceUp = true;
                move.flippedCard = topCard.toJSON();
            }
        }

        // Update score
        this.updateScore(fromArea, toArea, cardCount);

        // Track empty columns created
        if (toArea === 'tableau' && targetCards.length === cardCount) {
            this.emptyColumnsCreated++;
        }

        this.moves++;
        this.recordMove(move);
        this.checkWinCondition();
        this.checkAutoComplete();

        return true;
    }

    /**
     * Check if a move is valid
     */
    isValidMove(cards, fromArea, toArea, targetCards, toIndex = null) {
        if (cards.length === 0) return false;

        const movingCard = cards[0]; // The bottom card being moved

        if (toArea === 'foundation') {
            // Foundation rules: same suit, ascending rank, only one card at a time
            if (cards.length > 1) return false;
            
            // Check if the card can be placed on this specific foundation pile
            if (!movingCard.canPlaceOnFoundation(targetCards)) {
                return false;
            }
            
            // Additional check: ensure the card goes to the correct suit's foundation pile
            if (toIndex !== null) {
                const expectedSuits = ['hearts', 'diamonds', 'clubs', 'spades'];
                const expectedSuit = expectedSuits[toIndex];
                if (movingCard.suit !== expectedSuit) {
                    return false; // Card doesn't match this foundation pile's suit
                }
            }
            
            return true;
        } else if (toArea === 'tableau') {
            // Tableau rules vary by game type
            const targetCard = targetCards.length > 0 ? targetCards[targetCards.length - 1] : null;
            
            if (this.gameType === 'spider') {
                // Spider: any suit allowed for single cards, same suit for sequences
                if (cards.length === 1) {
                    return movingCard.canPlaceOnTableau(targetCard, 'spider');
                } else {
                    // For sequences, all cards must be same suit and in descending order
                    return this.isValidSpiderSequence(cards) && 
                           movingCard.canPlaceOnTableau(targetCard, 'spider');
                }
            } else {
                // Klondike rules: check both placement and sequence validity
                if (cards.length === 1) {
                    // Single card move
                    return movingCard.canPlaceOnTableau(targetCard, 'klondike');
                } else {
                    // Multiple card move: must form valid Klondike sequence
                    return this.isValidKlondikeSequence(cards) && 
                           movingCard.canPlaceOnTableau(targetCard, 'klondike');
                }
            }
        }

        return false;
    }

    /**
     * Check if cards form a valid Spider sequence (same suit, descending order)
     */
    isValidSpiderSequence(cards) {
        if (cards.length <= 1) return true;

        const firstCard = cards[0];
        for (let i = 1; i < cards.length; i++) {
            const currentCard = cards[i];
            const previousCard = cards[i - 1];
            
            // Must be same suit and descending rank
            if (currentCard.suit !== firstCard.suit || 
                currentCard.rank !== previousCard.rank - 1) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if cards form a valid Klondike sequence (alternating colors, descending order)
     */
    isValidKlondikeSequence(cards) {
        if (cards.length <= 1) return true;

        for (let i = 1; i < cards.length; i++) {
            const currentCard = cards[i];
            const previousCard = cards[i - 1];
            
            // Must be alternating colors and descending rank
            if (currentCard.isRed() === previousCard.isRed() || 
                currentCard.rank !== previousCard.rank - 1) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get the card array for a specific area and index
     */
    getCardArray(area, index) {
        switch (area) {
            case 'tableau':
                return this.tableau[index];
            case 'foundation':
                return this.foundation[index];
            case 'waste':
                return this.waste;
            case 'stock':
                return this.stock;
            default:
                return null;
        }
    }

    /**
     * Update score based on move type
     */
    updateScore(fromArea, toArea, cardCount) {
        if (toArea === 'foundation') {
            this.score += 10 * cardCount; // Points for moving to foundation
        } else if (fromArea === 'waste' && toArea === 'tableau') {
            this.score += 5 * cardCount; // Points for moving from waste to tableau
        } else if (fromArea === 'foundation' && toArea === 'tableau') {
            this.score -= 15 * cardCount; // Penalty for moving from foundation
        }

        // Bonus for completing a suit
        if (toArea === 'foundation') {
            const foundationPile = this.foundation[this.getFoundationIndex(fromArea)];
            if (foundationPile && foundationPile.length === 13) {
                this.score += 100; // Bonus for completing a suit
            }
        }
    }

    /**
     * Get foundation index for a suit
     */
    getFoundationIndex(suit) {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        return suits.indexOf(suit);
    }

    /**
     * Check if the game is won
     */
    checkWinCondition() {
        if (this.gameType === 'spider') {
            // Spider solitaire: game is won when all sequences are completed
            const expectedSequences = this.spiderSuits === 1 ? 4 : 8; // 4 sequences for 1-suit, 8 for 2/4-suit
            if (this.completedSequences.length >= expectedSequences) {
                this.gameWon = true;
                this.endTime = Date.now();
                this.score += this.calculateTimeBonus();
            }
        } else {
            // Klondike solitaire: game is won when all foundation piles have 13 cards
            const totalFoundationCards = this.foundation.reduce((sum, pile) => sum + pile.length, 0);
            
            if (totalFoundationCards === 52) {
                this.gameWon = true;
                this.endTime = Date.now();
                this.score += this.calculateTimeBonus();
            }
        }
    }

    /**
     * Calculate time bonus for winning
     */
    calculateTimeBonus() {
        if (!this.startTime || !this.endTime) return 0;
        
        const gameTimeMinutes = (this.endTime - this.startTime) / (1000 * 60);
        const maxBonus = 1000;
        const minTime = 2; // 2 minutes for max bonus
        
        if (gameTimeMinutes <= minTime) {
            return maxBonus;
        } else {
            return Math.max(0, maxBonus - Math.floor((gameTimeMinutes - minTime) * 10));
        }
    }

    /**
     * Check if auto-complete is available
     */
    checkAutoComplete() {
        if (this.gameType === 'spider') {
            // Spider solitaire: auto-complete not implemented yet
            this.autoCompleteAvailable = false;
            return;
        }

        // Klondike auto-complete logic
        let allFaceUp = true;
        
        for (const column of this.tableau) {
            for (const card of column) {
                if (!card.faceUp) {
                    allFaceUp = false;
                    break;
                }
            }
            if (!allFaceUp) break;
        }

        // Also check if waste pile is empty or only has cards that can go to foundation
        const wasteCanComplete = this.waste.length === 0 || 
            this.waste.every(card => this.canMoveToAnyFoundation(card));

        this.autoCompleteAvailable = allFaceUp && wasteCanComplete && this.stock.length === 0;
    }

    /**
     * Check if a card can move to any foundation
     */
    canMoveToAnyFoundation(card) {
        for (let i = 0; i < 4; i++) {
            if (card.canPlaceOnFoundation(this.foundation[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Execute auto-complete
     */
    autoComplete() {
        if (!this.autoCompleteAvailable) return false;

        const moves = [];
        let madeMove = true;

        while (madeMove) {
            madeMove = false;

            // Try to move cards from tableau to foundation
            for (let col = 0; col < this.tableau.length; col++) {
                const column = this.tableau[col];
                if (column.length > 0) {
                    const topCard = column[column.length - 1];
                    for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                        if (topCard.canPlaceOnFoundation(this.foundation[foundIndex])) {
                            this.moveCards('tableau', col, 'foundation', foundIndex, 1);
                            moves.push({ from: `tableau-${col}`, to: `foundation-${foundIndex}`, card: topCard.toString() });
                            madeMove = true;
                            break;
                        }
                    }
                }
            }

            // Try to move cards from waste to foundation
            if (this.waste.length > 0) {
                const topCard = this.waste[this.waste.length - 1];
                for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                    if (topCard.canPlaceOnFoundation(this.foundation[foundIndex])) {
                        this.moveCards('waste', 0, 'foundation', foundIndex, 1);
                        moves.push({ from: 'waste', to: `foundation-${foundIndex}`, card: topCard.toString() });
                        madeMove = true;
                        break;
                    }
                }
            }
        }

        return moves;
    }

    /**
     * Record a move in the history for undo functionality
     */
    recordMove(move) {
        this.moveHistory.push({
            ...move,
            timestamp: Date.now(),
            gameState: this.createSnapshot()
        });

        // Limit history size to prevent memory issues
        if (this.moveHistory.length > 100) {
            this.moveHistory.shift();
        }
    }

    /**
     * Undo the last move
     */
    undoLastMove() {
        if (this.moveHistory.length === 0) return false;

        const lastMove = this.moveHistory.pop();
        this.restoreSnapshot(lastMove.gameState);
        this.moves++; // Undo counts as a move
        
        return true;
    }

    /**
     * Create a snapshot of the current game state
     */
    createSnapshot() {
        const snapshot = {
            tableau: this.tableau.map(column => column.map(card => card.toJSON())),
            stock: this.stock.map(card => card.toJSON()),
            score: this.score,
            stockCycles: this.stockCycles,
            emptyColumnsCreated: this.emptyColumnsCreated,
            gameType: this.gameType
        };

        // Add game-type specific properties
        if (this.gameType === 'spider') {
            snapshot.completedSequences = this.completedSequences.map(seq => seq.map(card => card.toJSON()));
            snapshot.spiderSuits = this.spiderSuits;
        } else {
            // Klondike specific properties
            snapshot.foundation = this.foundation.map(pile => pile.map(card => card.toJSON()));
            snapshot.waste = this.waste.map(card => card.toJSON());
        }

        return snapshot;
    }

    /**
     * Restore game state from a snapshot
     */
    restoreSnapshot(snapshot) {
        this.tableau = snapshot.tableau.map(column => column.map(cardData => Card.fromJSON(cardData)));
        this.stock = snapshot.stock.map(cardData => Card.fromJSON(cardData));
        this.score = snapshot.score;
        this.stockCycles = snapshot.stockCycles;
        this.emptyColumnsCreated = snapshot.emptyColumnsCreated;
        this.gameType = snapshot.gameType || this.gameType;

        // Restore game-type specific properties
        if (this.gameType === 'spider') {
            this.completedSequences = snapshot.completedSequences ? 
                snapshot.completedSequences.map(seq => seq.map(cardData => Card.fromJSON(cardData))) : [];
            this.spiderSuits = snapshot.spiderSuits || 1;
        } else {
            // Klondike specific properties
            this.foundation = snapshot.foundation ? 
                snapshot.foundation.map(pile => pile.map(cardData => Card.fromJSON(cardData))) : [[], [], [], []];
            this.waste = snapshot.waste ? 
                snapshot.waste.map(cardData => Card.fromJSON(cardData)) : [];
        }

        this.checkAutoComplete();
    }

    /**
     * Get game statistics
     */
    getGameStats() {
        const currentTime = this.endTime || Date.now();
        const gameTime = this.startTime ? currentTime - this.startTime : 0;

        return {
            moves: this.moves,
            score: this.score,
            gameTime: gameTime,
            stockCycles: this.stockCycles,
            emptyColumnsCreated: this.emptyColumnsCreated,
            difficulty: this.difficulty,
            gameWon: this.gameWon,
            gameLost: this.gameLost
        };
    }

    /**
     * Format game time as MM:SS
     */
    getFormattedTime() {
        const stats = this.getGameStats();
        const totalSeconds = Math.floor(stats.gameTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Serialize game state to JSON for saving
     */
    toJSON() {
        const json = {
            tableau: this.tableau.map(column => column.map(card => card.toJSON())),
            stock: this.stock.map(card => card.toJSON()),
            difficulty: this.difficulty,
            drawCount: this.drawCount,
            moves: this.moves,
            score: this.score,
            startTime: this.startTime,
            endTime: this.endTime,
            gameWon: this.gameWon,
            gameLost: this.gameLost,
            stockCycles: this.stockCycles,
            emptyColumnsCreated: this.emptyColumnsCreated,
            autoCompleteAvailable: this.autoCompleteAvailable,
            gameType: this.gameType
        };

        // Add game-type specific properties
        if (this.gameType === 'spider') {
            json.completedSequences = this.completedSequences.map(seq => seq.map(card => card.toJSON()));
            json.spiderSuits = this.spiderSuits;
        } else {
            // Klondike specific properties
            json.foundation = this.foundation.map(pile => pile.map(card => card.toJSON()));
            json.waste = this.waste.map(card => card.toJSON());
        }

        return json;
    }

    /**
     * Load game state from JSON
     */
    static fromJSON(data) {
        const gameState = new GameState();
        
        gameState.tableau = data.tableau.map(column => column.map(cardData => Card.fromJSON(cardData)));
        gameState.foundation = data.foundation.map(pile => pile.map(cardData => Card.fromJSON(cardData)));
        gameState.stock = data.stock.map(cardData => Card.fromJSON(cardData));
        gameState.waste = data.waste.map(cardData => Card.fromJSON(cardData));
        gameState.difficulty = data.difficulty;
        gameState.drawCount = data.drawCount;
        gameState.moves = data.moves;
        gameState.score = data.score;
        gameState.startTime = data.startTime;
        gameState.endTime = data.endTime;
        gameState.gameWon = data.gameWon;
        gameState.gameLost = data.gameLost;
        gameState.stockCycles = data.stockCycles;
        gameState.emptyColumnsCreated = data.emptyColumnsCreated;
        gameState.autoCompleteAvailable = data.autoCompleteAvailable;
        
        return gameState;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}

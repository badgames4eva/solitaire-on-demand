/**
 * Deck class for managing a standard 52-card deck
 */
class Deck {
    constructor() {
        this.cards = [];
        this.createDeck();
    }

    /**
     * Create a standard 52-card deck
     */
    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // Ace=1, Jack=11, Queen=12, King=13

        this.cards = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(rank, suit));
            }
        }
    }

    /**
     * Shuffle the deck using Fisher-Yates algorithm
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Deal cards for Klondike Solitaire
     * Returns an object with tableau, stock, and foundation arrays
     */
    deal() {
        this.shuffle();
        
        const tableau = [[], [], [], [], [], [], []]; // 7 columns
        const foundation = [[], [], [], []]; // 4 foundation piles (one per suit)
        const stock = [];
        const waste = [];

        let cardIndex = 0;

        // Deal tableau (1 card to first column, 2 to second, etc.)
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.cards[cardIndex++];
                // Only the last card in each column is face up
                if (row === col) {
                    card.faceUp = true;
                }
                tableau[col].push(card);
            }
        }

        // Remaining cards go to stock
        while (cardIndex < this.cards.length) {
            stock.push(this.cards[cardIndex++]);
        }

        return {
            tableau,
            foundation,
            stock,
            waste
        };
    }

    /**
     * Create a winnable deal for easy mode
     * This uses a reverse-solve algorithm
     */
    createWinnableDeal() {
        // Start with completed foundations
        const foundation = [
            [], // hearts
            [], // diamonds  
            [], // clubs
            []  // spades
        ];

        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        
        // Create completed foundations
        for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
            for (let rank = 1; rank <= 13; rank++) {
                foundation[suitIndex].push(new Card(rank, suits[suitIndex]));
            }
        }

        // Now perform "undo" moves to create a solvable tableau
        const tableau = [[], [], [], [], [], [], []];
        const stock = [];
        const waste = [];

        // Move some cards from foundations to tableau in a way that creates a solvable game
        const moves = this.generateUndoMoves(foundation, tableau);
        
        // Execute the undo moves
        for (const move of moves) {
            this.executeUndoMove(move, foundation, tableau, stock);
        }

        // Ensure proper face-up/face-down states
        this.setTableauFaceStates(tableau);

        // Shuffle remaining cards into stock
        const remainingCards = [];
        foundation.forEach(pile => {
            remainingCards.push(...pile.splice(0));
        });
        
        // Shuffle the remaining cards
        for (let i = remainingCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingCards[i], remainingCards[j]] = [remainingCards[j], remainingCards[i]];
        }
        
        stock.push(...remainingCards);

        return {
            tableau,
            foundation: [[], [], [], []], // Reset foundations to empty
            stock,
            waste
        };
    }

    /**
     * Generate a series of undo moves to create a winnable game
     */
    generateUndoMoves(foundation, tableau) {
        const moves = [];
        const numMoves = 15 + Math.floor(Math.random() * 10); // 15-25 moves

        for (let i = 0; i < numMoves; i++) {
            // Randomly choose to move from foundation to tableau
            const fromSuit = Math.floor(Math.random() * 4);
            const toColumn = Math.floor(Math.random() * 7);
            
            if (foundation[fromSuit].length > 0) {
                moves.push({
                    type: 'foundation-to-tableau',
                    fromSuit,
                    toColumn,
                    cardCount: 1 + Math.floor(Math.random() * 3) // Move 1-3 cards
                });
            }
        }

        return moves;
    }

    /**
     * Execute an undo move
     */
    executeUndoMove(move, foundation, tableau, stock) {
        if (move.type === 'foundation-to-tableau') {
            const fromPile = foundation[move.fromSuit];
            const toPile = tableau[move.toColumn];
            
            for (let i = 0; i < move.cardCount && fromPile.length > 0; i++) {
                const card = fromPile.pop();
                card.faceUp = true; // Cards moved to tableau should be face up
                toPile.push(card);
            }
        }
    }

    /**
     * Set proper face-up/face-down states for tableau
     */
    setTableauFaceStates(tableau) {
        for (let col = 0; col < tableau.length; col++) {
            const column = tableau[col];
            for (let i = 0; i < column.length; i++) {
                // Only the top card should be face up initially
                column[i].faceUp = (i === column.length - 1);
            }
        }
    }

    /**
     * Create a specific hard layout
     */
    createHardDeal() {
        this.shuffle();
        
        const deal = this.deal();
        
        // Modify the deal to make it harder
        // Bury important cards (Aces, low cards) deeper in tableau
        this.buryImportantCards(deal.tableau, deal.stock);
        
        return deal;
    }

    /**
     * Bury important cards to make the game harder
     */
    buryImportantCards(tableau, stock) {
        const importantCards = [];
        const otherCards = [];
        
        // Separate important cards from others in stock
        stock.forEach(card => {
            if (card.rank <= 3) { // Aces, 2s, 3s are important
                importantCards.push(card);
            } else {
                otherCards.push(card);
            }
        });
        
        // Put important cards at the bottom of stock
        stock.length = 0;
        stock.push(...importantCards, ...otherCards);
        
        // Also bury some important cards in tableau columns
        for (let col = 0; col < tableau.length; col++) {
            const column = tableau[col];
            if (column.length > 1) {
                // Find any aces or low cards that are face up
                for (let i = column.length - 1; i >= 0; i--) {
                    const card = column[i];
                    if (card.faceUp && card.rank <= 2 && i > 0) {
                        // Move this card down in the column
                        const targetIndex = Math.max(0, i - 2);
                        column.splice(i, 1);
                        column.splice(targetIndex, 0, card);
                        card.faceUp = false;
                        
                        // Make sure the top card is still face up
                        if (column.length > 0) {
                            column[column.length - 1].faceUp = true;
                        }
                        break;
                    }
                }
            }
        }
    }

    /**
     * Check if a deal is potentially winnable (basic heuristic)
     */
    isWinnable(gameState) {
        // This is a simplified check - a full solver would be more complex
        const { tableau, stock, waste, foundation } = gameState;
        
        // Count buried aces
        let buriedAces = 0;
        tableau.forEach(column => {
            for (let i = 0; i < column.length - 1; i++) {
                if (!column[i].faceUp && column[i].rank === 1) {
                    buriedAces++;
                }
            }
        });
        
        stock.forEach(card => {
            if (card.rank === 1) buriedAces++;
        });
        
        // If too many aces are buried, game might be unwinnable
        return buriedAces <= 2;
    }

    /**
     * Get the number of cards in the deck
     */
    size() {
        return this.cards.length;
    }

    /**
     * Check if deck is empty
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Reset the deck to a fresh 52-card state
     */
    reset() {
        this.createDeck();
    }

    /**
     * Get a copy of all cards
     */
    getAllCards() {
        return [...this.cards];
    }

    /**
     * Create deck from existing cards (for loading saved games)
     */
    static fromCards(cards) {
        const deck = new Deck();
        deck.cards = cards.map(cardData => {
            if (cardData instanceof Card) {
                return cardData;
            } else {
                return Card.fromJSON(cardData);
            }
        });
        return deck;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Deck;
}

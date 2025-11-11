/**
 * Difficulty management system for Solitaire On Demand
 * Handles different game modes and their specific rules, features, and restrictions
 */
class DifficultyManager {
    /**
     * Initialize the difficulty manager with predefined difficulty levels
     * Each difficulty has different rules, features, and scoring multipliers
     */
    constructor() {
        // Define all available difficulty levels with their specific settings
        this.difficulties = {
            easy: {
                name: 'Easy',
                description: 'Winnable deals with helpful features',
                drawCount: 1, // Draw 1 card at a time from stock
                features: {
                    winnableDeals: true,    // Guarantees solvable games
                    showHints: true,        // Hint system available
                    autoComplete: true,     // Auto-complete when possible
                    undoLimit: -1,          // Unlimited undo moves
                    scoreMultiplier: 0.8    // Reduced scoring due to easier gameplay
                }
            },
            medium: {
                name: 'Medium',
                description: 'Classic Klondike Solitaire',
                drawCount: 1, // Draw 1 card at a time from stock
                features: {
                    winnableDeals: false,   // Random deals (may not be solvable)
                    showHints: true,        // Hint system available
                    autoComplete: true,     // Auto-complete when possible
                    undoLimit: 10,          // Limited to 10 undo moves
                    scoreMultiplier: 1.0    // Standard scoring
                }
            },
            hard: {
                name: 'Hard',
                description: 'Draw 3 cards with challenging layouts',
                drawCount: 3, // Draw 3 cards at a time from stock (Vegas rules)
                features: {
                    winnableDeals: false,   // Random deals with buried important cards
                    showHints: false,       // No hint system
                    autoComplete: false,    // No auto-complete
                    undoLimit: 3,           // Very limited undo moves
                    scoreMultiplier: 1.5    // Bonus scoring for increased difficulty
                }
            }
        };

        this.currentDifficulty = 'medium'; // Default difficulty level
        this.hintSystem = new HintSystem(); // Initialize the hint analysis system
    }

    /**
     * Set the current difficulty level
     */
    setDifficulty(difficulty) {
        if (this.difficulties[difficulty]) {
            this.currentDifficulty = difficulty;
            return true;
        }
        return false;
    }

    /**
     * Get current difficulty settings
     */
    getCurrentDifficulty() {
        return this.difficulties[this.currentDifficulty];
    }

    /**
     * Get all available difficulties
     */
    getAllDifficulties() {
        return this.difficulties;
    }

    /**
     * Check if a feature is enabled for current difficulty
     */
    isFeatureEnabled(feature) {
        const current = this.getCurrentDifficulty();
        return current.features[feature] || false;
    }

    /**
     * Get the draw count for current difficulty
     */
    getDrawCount() {
        return this.getCurrentDifficulty().drawCount;
    }

    /**
     * Get the score multiplier for current difficulty
     */
    getScoreMultiplier() {
        return this.getCurrentDifficulty().features.scoreMultiplier;
    }

    /**
     * Get the undo limit for current difficulty
     */
    getUndoLimit() {
        return this.getCurrentDifficulty().features.undoLimit;
    }

    /**
     * Create a game deal based on current difficulty
     */
    createGameDeal() {
        const deck = new Deck();
        const current = this.getCurrentDifficulty();

        if (current.features.winnableDeals) {
            return deck.createWinnableDeal();
        } else if (this.currentDifficulty === 'hard') {
            return deck.createHardDeal();
        } else {
            return deck.deal();
        }
    }

    /**
     * Apply difficulty-specific scoring
     */
    calculateScore(baseScore) {
        return Math.floor(baseScore * this.getScoreMultiplier());
    }

    /**
     * Check if hints are available
     */
    canShowHints() {
        return this.isFeatureEnabled('showHints');
    }

    /**
     * Check if auto-complete is available
     */
    canAutoComplete() {
        return this.isFeatureEnabled('autoComplete');
    }

    /**
     * Check if undo is available
     */
    canUndo(currentUndoCount) {
        const limit = this.getUndoLimit();
        return limit === -1 || currentUndoCount < limit;
    }
}

/**
 * Hint system for providing gameplay assistance
 */
class HintSystem {
    constructor() {
        this.lastHintTime = 0;
        this.hintCooldown = 2000; // 2 seconds between hints
    }

    /**
     * Find available moves in the current game state
     */
    findAvailableMoves(gameState) {
        const moves = [];

        // Check moves from tableau to foundation
        for (let col = 0; col < gameState.tableau.length; col++) {
            const column = gameState.tableau[col];
            if (column.length > 0) {
                const topCard = column[column.length - 1];
                if (topCard.faceUp) {
                    for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                        if (topCard.canPlaceOnFoundation(gameState.foundation[foundIndex])) {
                            moves.push({
                                type: 'tableau-to-foundation',
                                from: { area: 'tableau', index: col },
                                to: { area: 'foundation', index: foundIndex },
                                card: topCard,
                                priority: 10 // High priority for foundation moves
                            });
                        }
                    }
                }
            }
        }

        // Check moves from waste to foundation
        if (gameState.waste.length > 0) {
            const topCard = gameState.waste[gameState.waste.length - 1];
            for (let foundIndex = 0; foundIndex < 4; foundIndex++) {
                if (topCard.canPlaceOnFoundation(gameState.foundation[foundIndex])) {
                    moves.push({
                        type: 'waste-to-foundation',
                        from: { area: 'waste', index: 0 },
                        to: { area: 'foundation', index: foundIndex },
                        card: topCard,
                        priority: 9 // High priority for foundation moves
                    });
                }
            }
        }

        // Check moves from waste to tableau
        if (gameState.waste.length > 0) {
            const topCard = gameState.waste[gameState.waste.length - 1];
            for (let col = 0; col < gameState.tableau.length; col++) {
                const column = gameState.tableau[col];
                const targetCard = column.length > 0 ? column[column.length - 1] : null;
                
                if (topCard.canPlaceOnTableau(targetCard)) {
                    moves.push({
                        type: 'waste-to-tableau',
                        from: { area: 'waste', index: 0 },
                        to: { area: 'tableau', index: col },
                        card: topCard,
                        priority: column.length === 0 ? 7 : 5 // Higher priority for empty columns
                    });
                }
            }
        }

        // Check moves between tableau columns
        for (let fromCol = 0; fromCol < gameState.tableau.length; fromCol++) {
            const fromColumn = gameState.tableau[fromCol];
            
            // Find sequences of face-up cards that can be moved
            for (let startIndex = 0; startIndex < fromColumn.length; startIndex++) {
                if (!fromColumn[startIndex].faceUp) continue;
                
                // Check if this starts a valid sequence
                let sequenceLength = 1;
                for (let i = startIndex + 1; i < fromColumn.length; i++) {
                    const currentCard = fromColumn[i - 1];
                    const nextCard = fromColumn[i];
                    
                    if (nextCard.canPlaceOnTableau(currentCard)) {
                        sequenceLength++;
                    } else {
                        break;
                    }
                }

                // Try to move this sequence to other columns
                const movingCard = fromColumn[startIndex];
                for (let toCol = 0; toCol < gameState.tableau.length; toCol++) {
                    if (toCol === fromCol) continue;
                    
                    const toColumn = gameState.tableau[toCol];
                    const targetCard = toColumn.length > 0 ? toColumn[toColumn.length - 1] : null;
                    
                    if (movingCard.canPlaceOnTableau(targetCard)) {
                        let priority = 3; // Base priority for tableau moves
                        
                        // Higher priority if it reveals a face-down card
                        if (startIndex > 0 && !fromColumn[startIndex - 1].faceUp) {
                            priority += 3;
                        }
                        
                        // Higher priority if moving to empty column with King
                        if (toColumn.length === 0 && movingCard.rank === 13) {
                            priority += 2;
                        }

                        moves.push({
                            type: 'tableau-to-tableau',
                            from: { area: 'tableau', index: fromCol },
                            to: { area: 'tableau', index: toCol },
                            card: movingCard,
                            cardCount: fromColumn.length - startIndex,
                            priority: priority
                        });
                    }
                }
            }
        }

        // Check if stock can be drawn
        if (gameState.stock.length > 0 || gameState.waste.length > 0) {
            moves.push({
                type: 'draw-stock',
                from: { area: 'stock', index: 0 },
                to: { area: 'waste', index: 0 },
                priority: 1 // Low priority, only suggest if no other moves
            });
        }

        // Sort moves by priority (highest first)
        moves.sort((a, b) => b.priority - a.priority);

        return moves;
    }

    /**
     * Get the best move suggestion
     */
    getBestMove(gameState) {
        const now = Date.now();
        if (now - this.lastHintTime < this.hintCooldown) {
            return null; // Still in cooldown
        }

        const moves = this.findAvailableMoves(gameState);
        this.lastHintTime = now;

        return moves.length > 0 ? moves[0] : null;
    }

    /**
     * Get all available moves (for advanced hint display)
     */
    getAllMoves(gameState) {
        return this.findAvailableMoves(gameState);
    }

    /**
     * Check if the game is in a stuck state
     */
    isGameStuck(gameState) {
        const moves = this.findAvailableMoves(gameState);
        
        // Filter out stock drawing moves
        const meaningfulMoves = moves.filter(move => move.type !== 'draw-stock');
        
        return meaningfulMoves.length === 0 && gameState.stock.length === 0;
    }

    /**
     * Analyze game state and provide strategic advice
     */
    analyzeGameState(gameState) {
        const analysis = {
            availableMoves: this.findAvailableMoves(gameState).length,
            buriedAces: 0,
            emptyColumns: 0,
            exposedKings: 0,
            foundationProgress: 0,
            suggestions: []
        };

        // Count buried aces
        gameState.tableau.forEach(column => {
            for (let i = 0; i < column.length - 1; i++) {
                if (!column[i].faceUp && column[i].rank === 1) {
                    analysis.buriedAces++;
                }
            }
        });

        // Count empty columns
        analysis.emptyColumns = gameState.tableau.filter(col => col.length === 0).length;

        // Count exposed kings
        gameState.tableau.forEach(column => {
            if (column.length > 0) {
                const topCard = column[column.length - 1];
                if (topCard.faceUp && topCard.rank === 13) {
                    analysis.exposedKings++;
                }
            }
        });

        // Calculate foundation progress
        const totalFoundationCards = gameState.foundation.reduce((sum, pile) => sum + pile.length, 0);
        analysis.foundationProgress = (totalFoundationCards / 52) * 100;

        // Generate suggestions
        if (analysis.emptyColumns > 0 && analysis.exposedKings === 0) {
            analysis.suggestions.push("Try to expose a King to fill empty columns");
        }

        if (analysis.buriedAces > 2) {
            analysis.suggestions.push("Focus on revealing buried Aces");
        }

        if (analysis.foundationProgress < 20 && analysis.availableMoves > 5) {
            analysis.suggestions.push("Build foundations when possible for easier endgame");
        }

        return analysis;
    }

    /**
     * Reset hint cooldown
     */
    resetCooldown() {
        this.lastHintTime = 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DifficultyManager, HintSystem };
}

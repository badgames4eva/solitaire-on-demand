/**
 * Card class representing a playing card in the solitaire game
 * Each card has a rank (1-13), suit, face state, and unique identifier
 */
class Card {
    /**
     * Create a new playing card
     * @param {number} rank - Card rank from 1-13 (Ace=1, Jack=11, Queen=12, King=13)
     * @param {string} suit - Card suit: 'hearts', 'diamonds', 'clubs', or 'spades'
     */
    constructor(rank, suit) {
        this.rank = rank; // Numeric value: Ace=1, 2-10=face value, Jack=11, Queen=12, King=13
        this.suit = suit; // String identifier for the suit
        this.faceUp = false; // Whether the card is currently face up (visible to player)
        this.id = `${suit}-${rank}`; // Unique identifier for this specific card
    }

    /**
     * Get the display name for the rank
     */
    getRankName() {
        switch (this.rank) {
            case 1: return 'A';
            case 11: return 'J';
            case 12: return 'Q';
            case 13: return 'K';
            default: return this.rank.toString();
        }
    }

    /**
     * Get the Unicode symbol for the suit
     */
    getSuitSymbol() {
        switch (this.suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '';
        }
    }

    /**
     * Check if the card is red (hearts or diamonds)
     */
    isRed() {
        return this.suit === 'hearts' || this.suit === 'diamonds';
    }

    /**
     * Check if the card is black (clubs or spades)
     */
    isBlack() {
        return this.suit === 'clubs' || this.suit === 'spades';
    }

    /**
     * Check if this card can be placed on another card in the tableau
     * (alternating colors, descending rank)
     */
    canPlaceOnTableau(otherCard) {
        if (!otherCard) {
            // Can only place King on empty tableau column
            return this.rank === 13;
        }

        // Must be alternating colors and one rank lower
        return (this.isRed() !== otherCard.isRed()) && 
               (this.rank === otherCard.rank - 1);
    }

    /**
     * Check if this card can be placed on a foundation pile
     * (same suit, ascending rank starting with Ace)
     */
    canPlaceOnFoundation(foundationCards) {
        if (foundationCards.length === 0) {
            // Only Ace can start a foundation
            return this.rank === 1;
        }

        const topCard = foundationCards[foundationCards.length - 1];
        // Must be same suit and one rank higher
        return this.suit === topCard.suit && 
               this.rank === topCard.rank + 1;
    }

    /**
     * Create a DOM element for this card
     */
    createElement() {
        const cardElement = document.createElement('div');
        let cardClasses = `card ${this.faceUp ? 'face-up' : 'face-down'} ${this.isRed() ? 'red' : 'black'}`;
        
        // Add custom card back pattern if set and card is face down
        if (!this.faceUp && Card.cardBackPattern) {
            cardClasses += ` ${Card.cardBackPattern}`;
        }
        
        cardElement.className = cardClasses;
        cardElement.dataset.cardId = this.id;
        cardElement.dataset.rank = this.rank;
        cardElement.dataset.suit = this.suit;

        if (this.faceUp) {
            cardElement.innerHTML = `
                <div class="card-rank">${this.getRankName()}</div>
                <div class="card-center">${this.getSuitSymbol()}</div>
                <div class="card-suit">${this.getSuitSymbol()}</div>
            `;
        }

        return cardElement;
    }

    /**
     * Update an existing DOM element to reflect card state
     */
    updateElement(element) {
        element.className = `card ${this.faceUp ? 'face-up' : 'face-down'} ${this.isRed() ? 'red' : 'black'}`;
        
        if (this.faceUp) {
            element.innerHTML = `
                <div class="card-rank">${this.getRankName()}</div>
                <div class="card-center">${this.getSuitSymbol()}</div>
                <div class="card-suit">${this.getSuitSymbol()}</div>
            `;
        } else {
            element.innerHTML = '';
        }
    }

    /**
     * Flip the card face up or down
     */
    flip() {
        this.faceUp = !this.faceUp;
    }

    /**
     * Clone the card
     */
    clone() {
        const cloned = new Card(this.rank, this.suit);
        cloned.faceUp = this.faceUp;
        return cloned;
    }

    /**
     * Get card value for scoring (Ace=1, Face cards=10)
     */
    getValue() {
        if (this.rank === 1) return 1; // Ace
        if (this.rank > 10) return 10; // Face cards
        return this.rank;
    }

    /**
     * Convert card to string for debugging
     */
    toString() {
        return `${this.getRankName()}${this.getSuitSymbol()}${this.faceUp ? '' : ' (face down)'}`;
    }

    /**
     * Serialize card to JSON
     */
    toJSON() {
        return {
            rank: this.rank,
            suit: this.suit,
            faceUp: this.faceUp,
            id: this.id
        };
    }

    /**
     * Create card from JSON data
     */
    static fromJSON(data) {
        const card = new Card(data.rank, data.suit);
        card.faceUp = data.faceUp;
        return card;
    }

    /**
     * Set the global card back pattern for all cards
     * @param {string} pattern - CSS class name for the card back pattern
     *   Available patterns: 'royal-pattern', 'celtic-pattern', 'vintage-pattern', 'custom-image'
     *   Or pass null to use default card back
     */
    static setCardBackPattern(pattern) {
        Card.cardBackPattern = pattern;
        // Re-render all existing face-down cards with new pattern
        Card.updateExistingCardBacks();
    }

    /**
     * Set a custom card back image URL
     * @param {string} imageUrl - URL to the custom card back image
     */
    static setCustomCardBackImage(imageUrl) {
        // Create CSS custom property for the image
        document.documentElement.style.setProperty('--card-back-image', `url(${imageUrl})`);
        Card.setCardBackPattern('custom-image');
    }

    /**
     * Get the current card back pattern
     */
    static getCardBackPattern() {
        return Card.cardBackPattern || null;
    }

    /**
     * Reset to default card back (no custom pattern)
     */
    static resetCardBack() {
        Card.cardBackPattern = null;
        document.documentElement.style.removeProperty('--card-back-image');
        Card.updateExistingCardBacks();
    }

    /**
     * Update all existing face-down cards to use the current pattern
     * This is called automatically when the pattern changes
     */
    static updateExistingCardBacks() {
        const faceDownCards = document.querySelectorAll('.card.face-down');
        faceDownCards.forEach(cardElement => {
            // Remove existing pattern classes
            cardElement.classList.remove('royal-pattern', 'celtic-pattern', 'vintage-pattern', 'custom-image');
            
            // Add new pattern if set
            if (Card.cardBackPattern) {
                cardElement.classList.add(Card.cardBackPattern);
            }
        });
    }

    /**
     * Get available predefined card back patterns
     */
    static getAvailablePatterns() {
        return [
            { name: 'Default', value: null, description: 'Classic blue gradient with card symbol' },
            { name: 'Royal', value: 'royal-pattern', description: 'Elegant royal blue with gold accents' },
            { name: 'Celtic', value: 'celtic-pattern', description: 'Green Celtic knot pattern' },
            { name: 'Vintage', value: 'vintage-pattern', description: 'Classic maroon and gold design' }
        ];
    }
}

// Initialize the static card back pattern property
Card.cardBackPattern = null;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Card;
}

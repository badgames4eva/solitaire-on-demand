/**
 * TV Remote Handler for Fire TV navigation
 * Handles D-pad navigation and remote control events
 * 
 * USAGE ANALYSIS:
 * ✅ USED: calculateDistance, focusElement, refresh, destroy, isFireTV
 * ❌ MOSTLY UNUSED: Built-in navigation (overridden), Fire TV handler, most internal methods
 * ⚠️  PARTIALLY USED: Custom events (tvback, tvmenu, tvlongselect used; tvplay, tvskipbackward not listened to)
 */
class TVRemoteHandler {
    constructor() {
        this.focusedElement = null;
        this.focusableElements = [];
        this.isEnabled = true;
        this.currentKeyDown = null;
        this.currentKeyCodeDown = null;
        this.keyDownStartTime = null;
        
        this.init();
    }

    /**
     * Initialize the TV remote handler
     */
    init() {
        // Check if we're running on Fire TV
        this.isFireTV = true;//hardcoded for now this.detectFireTV();
        
        if (this.isFireTV) {
            this.initFireTVHandler();
        } else {
            // Fallback to keyboard events for testing
            this.initKeyboardHandler();
        }

        // Add TV remote mode class to body for visual indicators
        // This enables the display of Fire TV remote button icons (⏯️, ⏪, ☰)
        document.body.classList.add('tv-remote-mode');

        // Initialize focus management
        this.updateFocusableElements();
        this.setInitialFocus();
    }

    /**
     * Detect if running on Fire TV
     */
    detectFireTV() {
        // Check for Fire TV specific APIs or user agent
        return typeof window.TVEventHandler !== 'undefined' || 
               navigator.userAgent.includes('AFTT') ||
               navigator.userAgent.includes('AFTM') ||
               navigator.userAgent.includes('AFTB');
    }

    /**
     * Initialize Fire TV event handler
     */
    initFireTVHandler() {
        try {
            // Create TV event handler instance
            this.tvEventHandler = new window.TVEventHandler();
            
            // Listen for TV remote events
            this.tvEventHandler.addEventListener('keydown', (event) => {
                this.handleTVEvent(event.eventType, 0); // PRESSED
            });
            
            this.tvEventHandler.addEventListener('keyup', (event) => {
                this.handleTVEvent(event.eventType, 1); // RELEASED
            });
            
            console.log('Fire TV remote handler initialized');
        } catch (error) {
            console.warn('Failed to initialize Fire TV handler, falling back to keyboard:', error);
            this.initKeyboardHandler();
        }
    }

    /**
     * Initialize keyboard handler for testing/fallback
     */
    initKeyboardHandler() {
        document.addEventListener('keydown', (event) => {
            const mappedKey = this.mapKeyboardToTV(event.key);
            if (mappedKey) {
                event.preventDefault();
                this.handleTVEvent(mappedKey, 0);
            }
        });

        document.addEventListener('keyup', (event) => {
            const mappedKey = this.mapKeyboardToTV(event.key);
            if (mappedKey) {
                event.preventDefault();
                this.handleTVEvent(mappedKey, 1);
            }
        });

        console.log('Keyboard fallback handler initialized');
    }

    /**
     * Map keyboard keys to TV remote events
     */
    mapKeyboardToTV(key) {
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'Enter': 'select',
            'Escape': 'GoBack',
            'Space': 'select',        
            'Backspace': 'GoBack',
            'Tab': 'menu',
            // Additional mappings for game functions
            'KeyH': 'MediaFastForward',       // H key for Hint (maps to MediaFastForward button)
            'KeyU': 'MediaRewind',            // U key for Undo (maps to MediaRewind button)  
            'KeyM': 'menu',                   // M key for Menu (maps to Menu button)
            'KeyP': 'MediaPlayPause'          // P key for Play/Pause (stock pile)
        };
        return keyMap[key];
    }

    /**
     * Handle TV remote events
     */
    handleTVEvent(eventType, eventKeyAction) {
        if (!this.isEnabled) return;

        console.log(`TV Event: ${eventType}, Action: ${eventKeyAction}`);

        if (eventKeyAction === 0) { // PRESSED
            this.handleKeyPress(eventType);
        } else if (eventKeyAction === 1) { // RELEASED
            this.handleKeyRelease(eventType);
        }
    }

    /**
     * Handle key press events
     */
    handleKeyPress(eventType,keyCode) {
        // New key press
        this.currentKeyDown = eventType;
        this.currentKeyCodeDown = keyCode;
        this.keyDownStartTime = Date.now();

        // Handle immediate actions for navigation
        switch (eventType) {
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
            case 'select':
                this.handleSelect();
                break;
            case 'back':
            case 'GoBack':
                // Let ui.js handle back button - dispatch custom event
                document.dispatchEvent(new CustomEvent('tvback'));
                break;
            case 'MediaPlayPause':
            case 'playpause':
                this.handlePlay();
                break;
            case 'skip_backward':
            case 'MediaRewind':
                this.handleSkipBackward();
                break;
        }
        // Handle immediate actions for navigation
        switch (keyCode) {            
            case '27':
                // Let ui.js handle back button - dispatch custom event
                document.dispatchEvent(new CustomEvent('tvback'));
                break;
        }
    }

    /**
     * Handle key release events
     */
    handleKeyRelease(eventType) {
        if (this.currentKeyDown === eventType) {            
            this.currentKeyDown = null;
            this.currentKeyCodeDown = null;
            this.keyDownStartTime = null;
        }
    }

    
    /**
     * Update the list of focusable elements
     */
    updateFocusableElements() {
        this.focusableElements = Array.from(document.querySelectorAll('.focusable:not([disabled])'))
            .filter(el => {
                const style = window.getComputedStyle(el);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                
                // Only include elements that are in the currently active screen
                const activeScreen = document.querySelector('.screen.active');
                const isInActiveScreen = activeScreen && activeScreen.contains(el);
                
                return isVisible && isInActiveScreen;
            });
    }

    /**
     * Set initial focus to the first focusable element
     */
    setInitialFocus() {
        this.updateFocusableElements();
        if (this.focusableElements.length > 0) {
            this.setFocus(this.focusableElements[0]);
        }
    }

    /**
     * Set focus to a specific element
     */
    setFocus(element) {
        if (this.focusedElement) {
            this.focusedElement.classList.remove('focused');
        }

        this.focusedElement = element;
        if (element) {
            element.classList.add('focused');
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Navigate up
     */
    navigateUp() {
        if (!this.focusedElement) {
            this.setInitialFocus();
            return;
        }

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const element of this.focusableElements) {
            if (element === this.focusedElement) continue;

            const rect = element.getBoundingClientRect();
            
            // Element must be above the current element
            if (rect.bottom <= currentRect.top) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }

    /**
     * Navigate down
     */
    navigateDown() {
        if (!this.focusedElement) {
            this.setInitialFocus();
            return;
        }

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const element of this.focusableElements) {
            if (element === this.focusedElement) continue;

            const rect = element.getBoundingClientRect();
            
            // Element must be below the current element
            if (rect.top >= currentRect.bottom) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }

    /**
     * Navigate left
     */
    navigateLeft() {
        if (!this.focusedElement) {
            this.setInitialFocus();
            return;
        }

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const element of this.focusableElements) {
            if (element === this.focusedElement) continue;

            const rect = element.getBoundingClientRect();
            
            // Element must be to the left of the current element
            if (rect.right <= currentRect.left) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }

    /**
     * Navigate right
     */
    navigateRight() {
        if (!this.focusedElement) {
            this.setInitialFocus();
            return;
        }

        const currentRect = this.focusedElement.getBoundingClientRect();
        let bestCandidate = null;
        let bestDistance = Infinity;

        for (const element of this.focusableElements) {
            if (element === this.focusedElement) continue;

            const rect = element.getBoundingClientRect();
            
            // Element must be to the right of the current element
            if (rect.left >= currentRect.right) {
                const distance = this.calculateDistance(currentRect, rect);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }

    /**
     * Calculate distance between two rectangles (edge-to-edge distance)
     * This provides more intuitive navigation by measuring the actual gap between elements
     * rather than center-to-center distance
     */
    calculateDistance(rect1, rect2) {
        // Calculate horizontal distance (gap between rectangles)
        let horizontalDistance = 0;
        if (rect1.right < rect2.left) {
            // rect2 is to the right of rect1
            horizontalDistance = rect2.left - rect1.right;
        } else if (rect2.right < rect1.left) {
            // rect1 is to the right of rect2
            horizontalDistance = rect1.left - rect2.right;
        }
        // If rectangles overlap horizontally, horizontal distance is 0

        // Calculate vertical distance (gap between rectangles)
        let verticalDistance = 0;
        if (rect1.bottom < rect2.top) {
            // rect2 is below rect1
            verticalDistance = rect2.top - rect1.bottom;
        } else if (rect2.bottom < rect1.top) {
            // rect1 is below rect2
            verticalDistance = rect1.top - rect2.bottom;
        }
        // If rectangles overlap vertically, vertical distance is 0

        // Return the Euclidean distance between the closest edges
        return Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
    }

    /**
     * Handle select button press
     */
    handleSelect() {
        if (this.focusedElement) {
            // Trigger click event on focused element
            this.focusedElement.click();
        }
    }
    
    /**
     * Enable/disable the remote handler
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled && this.focusedElement) {
            this.focusedElement.classList.remove('focused');
            this.focusedElement = null;
        }
    }

    /**
     * Refresh focusable elements and reset focus
     */
    refresh() {
        this.updateFocusableElements();
        
        // If current focused element is no longer focusable, find a new one
        if (this.focusedElement && !this.focusableElements.includes(this.focusedElement)) {
            this.setInitialFocus();
        }
    }

    /**
     * Focus a specific element by selector or element reference
     */
    focusElement(elementOrSelector) {
        let element;
        
        if (typeof elementOrSelector === 'string') {
            element = document.querySelector(elementOrSelector);
        } else {
            element = elementOrSelector;
        }

        if (element && this.focusableElements.includes(element)) {
            this.setFocus(element);
            return true;
        }
        
        return false;
    }

    /**
     * Get the currently focused element
     */
    getFocusedElement() {
        return this.focusedElement;
    }

    /**
     * Add custom key handler
     */
    addKeyHandler(eventType, handler) {
        document.addEventListener(`tv${eventType}`, handler);
    }

    /**
     * Remove custom key handler
     */
    removeKeyHandler(eventType, handler) {
        document.removeEventListener(`tv${eventType}`, handler);
    }

    /**
     * Test the calculateDistance function with sample rectangles
     * This function can be called from the browser console to verify distance calculations
     */
    testCalculateDistance() {
        console.log('=== Testing calculateDistance function ===');
        
        // Test case 1: Two rectangles side by side (should have horizontal distance)
        const rect1 = { left: 0, top: 0, right: 100, bottom: 50 };
        const rect2 = { left: 150, top: 0, right: 250, bottom: 50 };
        const distance1 = this.calculateDistance(rect1, rect2);
        console.log(`Test 1 - Side by side rectangles: ${distance1} (expected: 50)`);
        
        // Test case 2: Two rectangles vertically separated (should have vertical distance)
        const rect3 = { left: 0, top: 0, right: 100, bottom: 50 };
        const rect4 = { left: 0, top: 100, right: 100, bottom: 150 };
        const distance2 = this.calculateDistance(rect3, rect4);
        console.log(`Test 2 - Vertically separated rectangles: ${distance2} (expected: 50)`);
        
        // Test case 3: Overlapping rectangles (should have distance 0)
        const rect5 = { left: 0, top: 0, right: 100, bottom: 100 };
        const rect6 = { left: 50, top: 50, right: 150, bottom: 150 };
        const distance3 = this.calculateDistance(rect5, rect6);
        console.log(`Test 3 - Overlapping rectangles: ${distance3} (expected: 0)`);
        
        // Test case 4: Diagonally separated rectangles (should use Euclidean distance)
        const rect7 = { left: 0, top: 0, right: 50, bottom: 50 };
        const rect8 = { left: 100, top: 100, right: 150, bottom: 150 };
        const distance4 = this.calculateDistance(rect7, rect8);
        const expectedDistance4 = Math.sqrt(50 * 50 + 50 * 50); // sqrt(2500 + 2500) ≈ 70.71
        console.log(`Test 4 - Diagonally separated rectangles: ${distance4} (expected: ~${expectedDistance4.toFixed(2)})`);
        
        // Test case 5: Adjacent rectangles (should have distance 0)
        const rect9 = { left: 0, top: 0, right: 100, bottom: 50 };
        const rect10 = { left: 100, top: 0, right: 200, bottom: 50 };
        const distance5 = this.calculateDistance(rect9, rect10);
        console.log(`Test 5 - Adjacent rectangles: ${distance5} (expected: 0)`);
        
        console.log('=== Distance calculation tests completed! ===');
        
        return {
            test1: { result: distance1, expected: 50, passed: distance1 === 50 },
            test2: { result: distance2, expected: 50, passed: distance2 === 50 },
            test3: { result: distance3, expected: 0, passed: distance3 === 0 },
            test4: { result: distance4, expected: expectedDistance4, passed: Math.abs(distance4 - expectedDistance4) < 0.01 },
            test5: { result: distance5, expected: 0, passed: distance5 === 0 }
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {

        if (this.tvEventHandler) {
            // Clean up TV event handler if available
            try {
                this.tvEventHandler.removeAllListeners();
            } catch (error) {
                console.warn('Error cleaning up TV event handler:', error);
            }
        }

        if (this.focusedElement) {
            this.focusedElement.classList.remove('focused');
        }

        this.focusedElement = null;
        this.focusableElements = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TVRemoteHandler;
}

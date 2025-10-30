/**
 * TV Remote Handler for Fire TV navigation
 * Handles D-pad navigation and remote control events
 */
class TVRemoteHandler {
    constructor() {
        this.focusedElement = null;
        this.focusableElements = [];
        this.isEnabled = true;
        this.longPressThreshold = 500; // ms
        this.longPressTimer = null;
        this.currentKeyDown = null;
        this.keyDownStartTime = null;
        
        this.init();
    }

    /**
     * Initialize the TV remote handler
     */
    init() {
        // Check if we're running on Fire TV
        this.isFireTV = this.detectFireTV();
        
        if (this.isFireTV) {
            this.initFireTVHandler();
        } else {
            // Fallback to keyboard events for testing
            this.initKeyboardHandler();
        }

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
            'Escape': 'back',
            'Space': 'select',
            'Backspace': 'back',
            'Tab': 'menu'
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
    handleKeyPress(eventType) {
        // Handle long press detection
        if (this.currentKeyDown === eventType) {
            // Continuing to hold the same key
            return;
        }

        // New key press
        this.currentKeyDown = eventType;
        this.keyDownStartTime = Date.now();

        // Set up long press timer
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(eventType);
        }, this.longPressThreshold);

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
                this.handleBack();
                break;
            case 'menu':
                this.handleMenu();
                break;
        }
    }

    /**
     * Handle key release events
     */
    handleKeyRelease(eventType) {
        if (this.currentKeyDown === eventType) {
            // Clear long press timer
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            // Check if it was a short press
            const pressDuration = Date.now() - this.keyDownStartTime;
            if (pressDuration < this.longPressThreshold) {
                // Handle short press actions if needed
            }

            this.currentKeyDown = null;
            this.keyDownStartTime = null;
        }
    }

    /**
     * Handle long press events
     */
    handleLongPress(eventType) {
        console.log(`Long press detected: ${eventType}`);
        
        switch (eventType) {
            case 'select':
                // Long press select could show context menu or additional options
                this.handleLongSelect();
                break;
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                // Long press navigation could enable rapid movement
                this.handleRapidNavigation(eventType);
                break;
        }
    }

    /**
     * Update the list of focusable elements
     */
    updateFocusableElements() {
        this.focusableElements = Array.from(document.querySelectorAll('.focusable:not([disabled])'))
            .filter(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
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
     * Calculate distance between two rectangles
     */
    calculateDistance(rect1, rect2) {
        const centerX1 = rect1.left + rect1.width / 2;
        const centerY1 = rect1.top + rect1.height / 2;
        const centerX2 = rect2.left + rect2.width / 2;
        const centerY2 = rect2.top + rect2.height / 2;

        return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
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
     * Handle back button press
     */
    handleBack() {
        // Emit custom back event that the app can listen to
        const backEvent = new CustomEvent('tvback', {
            detail: { source: 'remote' }
        });
        document.dispatchEvent(backEvent);
    }

    /**
     * Handle menu button press
     */
    handleMenu() {
        // Emit custom menu event
        const menuEvent = new CustomEvent('tvmenu', {
            detail: { source: 'remote' }
        });
        document.dispatchEvent(menuEvent);
    }

    /**
     * Handle long select press
     */
    handleLongSelect() {
        if (this.focusedElement) {
            // Emit custom long select event
            const longSelectEvent = new CustomEvent('tvlongselect', {
                detail: { 
                    element: this.focusedElement,
                    source: 'remote' 
                }
            });
            this.focusedElement.dispatchEvent(longSelectEvent);
        }
    }

    /**
     * Handle rapid navigation during long press
     */
    handleRapidNavigation(direction) {
        // Implement rapid navigation if needed
        console.log(`Rapid navigation: ${direction}`);
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
     * Cleanup resources
     */
    destroy() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }

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

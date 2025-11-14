/**
 * Sound Manager for Solitaire On Demand
 * Handles all audio feedback and background music for the game
 * Provides Web Audio API generated sounds for card actions and UI feedback
 */
class SoundManager {
    constructor() {
        // Audio context for Web Audio API
        this.audioContext = null;
        this.masterGain = null;
        
        // Sound settings
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.3;
        
        // Background music
        this.backgroundMusic = null;
        this.musicGain = null;
        
        // Pre-generated sound buffers for performance
        this.sounds = new Map();
        
        // Fire TV detection and audio troubleshooting
        this.isFireTV = this.detectFireTV();
        this.audioInitialized = false;
        this.audioTroubleshooting = {
            contextCreated: false,
            soundsGenerated: false,
            userInteraction: false,
            testTonePlayed: false
        };
        
        this.init();
    }

    /**
     * Initialize the sound system
     */
    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Generate sound effects
            await this.generateSounds();
            
            // Load settings
            this.loadSettings();
            
            console.log('Sound Manager initialized successfully');
        } catch (error) {
            console.warn('Sound Manager initialization failed:', error);
            this.soundEnabled = false;
        }
    }

    /**
     * Generate sound effects using Web Audio API
     */
    async generateSounds() {
        const sampleRate = this.audioContext.sampleRate;
        
        // Card flip sound - short click with pitch variation
        this.sounds.set('cardFlip', this.generateCardFlip(sampleRate));
        
        // Card place sound - softer thud
        this.sounds.set('cardPlace', this.generateCardPlace(sampleRate));
        
        // Card move success - pleasant chime
        this.sounds.set('moveSuccess', this.generateMoveSuccess(sampleRate));
        
        // Invalid move - subtle error sound
        this.sounds.set('moveInvalid', this.generateMoveInvalid(sampleRate));
        
        // Stock draw - shuffle sound
        this.sounds.set('stockDraw', this.generateStockDraw(sampleRate));
        
        // Game win - victory fanfare
        this.sounds.set('gameWin', this.generateGameWin(sampleRate));
        
        // Menu navigation - subtle click
        this.sounds.set('menuClick', this.generateMenuClick(sampleRate));
        
        // Button hover - soft beep
        this.sounds.set('buttonHover', this.generateButtonHover(sampleRate));
        
        // Auto complete - magical sweep
        this.sounds.set('autoComplete', this.generateAutoComplete(sampleRate));
    }

    /**
     * Generate card flip sound
     */
    generateCardFlip(sampleRate) {
        const duration = 0.1;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 30);
            const noise = (Math.random() - 0.5) * 0.3;
            const click = Math.sin(t * 2000 * Math.PI) * 0.1;
            data[i] = (noise + click) * envelope;
        }
        
        return buffer;
    }

    /**
     * Generate card place sound
     */
    generateCardPlace(sampleRate) {
        const duration = 0.15;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 15);
            const thud = Math.sin(t * 150 * Math.PI) * envelope;
            const texture = (Math.random() - 0.5) * 0.1 * envelope;
            data[i] = (thud + texture) * 0.4;
        }
        
        return buffer;
    }

    /**
     * Generate move success sound
     */
    generateMoveSuccess(sampleRate) {
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8);
            const chime = Math.sin(t * 800 * Math.PI) * 0.3 + 
                         Math.sin(t * 1200 * Math.PI) * 0.2;
            data[i] = chime * envelope;
        }
        
        return buffer;
    }

    /**
     * Generate move invalid sound
     */
    generateMoveInvalid(sampleRate) {
        const duration = 0.2;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 12);
            const buzz = Math.sin(t * 200 * Math.PI) * 0.3;
            data[i] = buzz * envelope;
        }
        
        return buffer;
    }

    /**
     * Generate stock draw sound
     */
    generateStockDraw(sampleRate) {
        const duration = 0.2;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = 1 - t / duration;
            const shuffle = (Math.random() - 0.5) * envelope * 0.5;
            const sweep = Math.sin(t * (500 + t * 1000) * Math.PI) * envelope * 0.2;
            data[i] = shuffle + sweep;
        }
        
        return buffer;
    }

    /**
     * Generate game win sound
     */
    generateGameWin(sampleRate) {
        const duration = 1.5;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        const notes = [523, 659, 784, 1047]; // C, E, G, C (major chord)
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 2) * (1 - t / duration);
            
            let harmony = 0;
            notes.forEach((freq, index) => {
                const delay = index * 0.1;
                if (t > delay) {
                    harmony += Math.sin((t - delay) * freq * Math.PI * 2) * (1 / notes.length);
                }
            });
            
            data[i] = harmony * envelope * 0.5;
        }
        
        return buffer;
    }

    /**
     * Generate menu click sound
     */
    generateMenuClick(sampleRate) {
        const duration = 0.05;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 50);
            const click = Math.sin(t * 1000 * Math.PI);
            data[i] = click * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Generate button hover sound
     */
    generateButtonHover(sampleRate) {
        const duration = 0.03;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 80);
            const beep = Math.sin(t * 1500 * Math.PI);
            data[i] = beep * envelope * 0.1;
        }
        
        return buffer;
    }

    /**
     * Generate auto complete sound
     */
    generateAutoComplete(sampleRate) {
        const duration = 0.8;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.sin(t * Math.PI / duration); // Bell curve
            const sweep = Math.sin(t * (400 + t * 800) * Math.PI);
            const sparkle = Math.sin(t * 2000 * Math.PI) * 0.2 * Math.random();
            data[i] = (sweep + sparkle) * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Play a sound effect
     */
    playSound(soundName, pitch = 1.0, volume = 1.0) {
        if (!this.soundEnabled || !this.audioContext || this.audioContext.state === 'suspended') {
            return;
        }

        const buffer = this.sounds.get(soundName);
        if (!buffer) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }

        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            source.playbackRate.value = pitch;
            
            gainNode.gain.value = volume * this.sfxVolume;
            
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            source.start();
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    }

    /**
     * Resume audio context (required after user interaction)
     * Enhanced for Fire TV compatibility
     */
    async resumeAudio() {
        if (!this.audioContext) {
            console.warn('No audio context available');
            return false;
        }

        try {
            // Force audio context resume for Fire TV devices
            if (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted') {
                console.log('Attempting to resume audio context. Current state:', this.audioContext.state);
                await this.audioContext.resume();
                
                // Wait a bit and check if it actually resumed
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (this.audioContext.state === 'running') {
                    console.log('Audio context successfully resumed');
                    // Play a silent test tone to ensure audio output is working
                    this.playTestTone();
                    return true;
                } else {
                    console.warn('Audio context failed to resume. State:', this.audioContext.state);
                    return false;
                }
            } else if (this.audioContext.state === 'running') {
                console.log('Audio context already running');
                return true;
            } else {
                console.warn('Unknown audio context state:', this.audioContext.state);
                return false;
            }
        } catch (error) {
            console.error('Failed to resume audio context:', error);
            return false;
        }
    }

    /**
     * Play a silent test tone to initialize audio on TV
     * Fire TV devices sometimes need an actual sound to activate audio output
     */
    playTestTone() {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            return;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Create a very short, very quiet tone
            oscillator.frequency.value = 440; // A4 note
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Make it practically inaudible but present
            gainNode.gain.value = 0.01;
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.01);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.01);
            
            console.log('Test tone played to initialize Fire TV audio');
        } catch (error) {
            console.warn('Failed to play test tone:', error);
        }
    }

    /**
     * Game-specific sound methods
     */
    cardFlip(pitch = 1.0) {
        this.playSound('cardFlip', 0.8 + Math.random() * 0.4, 0.6); // Random pitch variation
    }

    cardPlace() {
        this.playSound('cardPlace', 0.9 + Math.random() * 0.2, 0.8);
    }

    moveSuccess() {
        this.playSound('moveSuccess', 1.0, 0.7);
    }

    moveInvalid() {
        this.playSound('moveInvalid', 1.0, 0.6);
    }

    stockDraw() {
        this.playSound('stockDraw', 1.0, 0.7);
    }

    gameWin() {
        this.playSound('gameWin', 1.0, 0.9);
    }

    menuClick() {
        this.playSound('menuClick', 1.0, 0.5);
    }

    buttonHover() {
        this.playSound('buttonHover', 1.0, 0.3);
    }

    autoComplete() {
        this.playSound('autoComplete', 1.0, 0.8);
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    /**
     * Set sound effects volume
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable/disable sound effects
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    /**
     * Load sound settings from localStorage
     */
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('solitaire-settings') || '{}');
            this.soundEnabled = settings.soundEffects !== false; // Default to true
            this.setSfxVolume(settings.sfxVolume || 0.8);
            this.setMasterVolume(settings.masterVolume || 0.7);
        } catch (error) {
            console.warn('Failed to load sound settings:', error);
        }
    }

    /**
     * Save sound settings to localStorage
     */
    saveSettings() {
        try {
            const currentSettings = JSON.parse(localStorage.getItem('solitaire-settings') || '{}');
            const newSettings = {
                ...currentSettings,
                soundEffects: this.soundEnabled,
                sfxVolume: this.sfxVolume,
                masterVolume: this.masterVolume
            };
            localStorage.setItem('solitaire-settings', JSON.stringify(newSettings));
        } catch (error) {
            console.warn('Failed to save sound settings:', error);
        }
    }

    /**
     * Get current sound settings
     */
    getSettings() {
        return {
            soundEnabled: this.soundEnabled,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume
        };
    }

    /**
     * Detect Fire TV device
     */
    detectFireTV() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check for Fire TV specific identifiers
        const firetvIdentifiers = [
            'aftt',      // Fire TV Stick
            'aftm',      // Fire TV (set-top box)
            'aftb',      // Fire TV (older models)
            'afts',      // Fire TV Stick 4K
            'aftn',      // Fire TV Edition (smart TVs)
            'fire tv',   // General Fire TV
            'AFTCA002',
            'silk'       // Fire TV browser
        ];
        
        const isFireTV = firetvIdentifiers.some(id => userAgent.includes(id));
        
        if (isFireTV) {
            console.log('Fire TV device detected:', userAgent);
        } else {
            console.log('Non-Fire TV device detected');
        }
        
        return isFireTV;
    }

    /**
     * Get comprehensive audio diagnostics for troubleshooting TV audio issues
     */
    getAudioDiagnostics() {
        const diagnostics = {
            device: {
                isFireTV: this.isFireTV,
                userAgent: navigator.userAgent,
                platform: navigator.platform
            },
            audioContext: {
                available: !!this.audioContext,
                state: this.audioContext?.state || 'not available',
                sampleRate: this.audioContext?.sampleRate || 'not available',
                baseLatency: this.audioContext?.baseLatency || 'not available',
                outputLatency: this.audioContext?.outputLatency || 'not available'
            },
            webAudioSupport: {
                AudioContext: typeof AudioContext !== 'undefined',
                webkitAudioContext: typeof webkitAudioContext !== 'undefined',
                createOscillator: this.audioContext ? typeof this.audioContext.createOscillator === 'function' : false,
                createGain: this.audioContext ? typeof this.audioContext.createGain === 'function' : false
            },
            soundManager: {
                soundEnabled: this.soundEnabled,
                masterVolume: this.masterVolume,
                sfxVolume: this.sfxVolume,
                soundsGenerated: this.sounds.size > 0,
                audioInitialized: this.audioInitialized
            },
            troubleshooting: this.audioTroubleshooting,
            recommendations: this.getAudioRecommendations()
        };

        console.log('Audio Diagnostics:', diagnostics);
        return diagnostics;
    }

    /**
     * Get audio troubleshooting recommendations based on current state
     */
    getAudioRecommendations() {
        const recommendations = [];

        if (!this.audioContext) {
            recommendations.push("Audio context not created - Web Audio API may not be supported");
        } else if (this.audioContext.state === 'suspended') {
            recommendations.push("Audio context is suspended - try interacting with the game to resume audio");
        }

        if (this.isFireTV && this.audioContext?.state === 'running' && !this.audioTroubleshooting.testTonePlayed) {
            recommendations.push("Fire TV detected but test tone not played - audio output may need initialization");
        }

        if (!this.soundEnabled) {
            recommendations.push("Sound effects are disabled in settings - enable them in the Settings menu");
        }

        if (this.masterVolume === 0 || this.sfxVolume === 0) {
            recommendations.push("Audio volume is set to 0 - check volume settings");
        }

        if (this.sounds.size === 0) {
            recommendations.push("Sound effects not generated - there may be an initialization error");
        }

        if (recommendations.length === 0) {
            recommendations.push("Audio system appears to be working correctly");
        }

        return recommendations;
    }

    /**
     * Force audio initialization for Fire TV
     * Call this method if audio is not working to attempt multiple recovery strategies
     */
    async forceAudioInitialization() {
        console.log('Attempting to force audio initialization for Fire TV...');
        
        try {
            // Strategy 1: Create new audio context if needed
            if (!this.audioContext) {
                console.log('Creating new audio context...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioTroubleshooting.contextCreated = true;
            }

            // Strategy 2: Force resume audio context
            if (this.audioContext.state !== 'running') {
                console.log('Forcing audio context resume...');
                await this.audioContext.resume();
                await new Promise(resolve => setTimeout(resolve, 200)); // Give it time
            }

            // Strategy 3: Recreate master gain if needed
            if (!this.masterGain) {
                console.log('Recreating master gain node...');
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this.masterVolume;
                this.masterGain.connect(this.audioContext.destination);
            }

            // Strategy 4: Play multiple test tones with different approaches
            if (this.audioContext.state === 'running') {
                console.log('Playing enhanced test sequence for Fire TV...');
                await this.playEnhancedTestSequence();
            }

            // Strategy 5: Regenerate sounds if they're missing
            if (this.sounds.size === 0) {
                console.log('Regenerating sound effects...');
                await this.generateSounds();
                this.audioTroubleshooting.soundsGenerated = true;
            }

            this.audioInitialized = true;
            console.log('Fire TV audio initialization completed');
            
            return {
                success: true,
                audioContextState: this.audioContext.state,
                soundsGenerated: this.sounds.size,
                recommendations: this.getAudioRecommendations()
            };

        } catch (error) {
            console.error('Fire TV audio initialization failed:', error);
            return {
                success: false,
                error: error.message,
                recommendations: ['Audio initialization failed - check TV audio settings and try restarting the app']
            };
        }
    }

    /**
     * Play enhanced test sequence for Fire TV audio troubleshooting
     */
    async playEnhancedTestSequence() {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            return;
        }

        const testSequence = [
            { freq: 440, duration: 0.05, volume: 0.02 },  // Very quiet A4
            { freq: 220, duration: 0.05, volume: 0.03 },  // Quiet A3
            { freq: 880, duration: 0.05, volume: 0.02 },  // Very quiet A5
        ];

        for (let i = 0; i < testSequence.length; i++) {
            const test = testSequence[i];
            
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.frequency.value = test.freq;
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                gainNode.gain.value = test.volume;
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + test.duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + test.duration);
                
                // Wait between tones
                await new Promise(resolve => setTimeout(resolve, test.duration * 1000 + 50));
                
            } catch (error) {
                console.warn(`Test tone ${i + 1} failed:`, error);
            }
        }

        this.audioTroubleshooting.testTonePlayed = true;
        console.log('Enhanced Fire TV test sequence completed');
    }

    /**
     * Test audio output with audible sound for user verification
     * This plays a clearly audible test sound to verify audio is working
     */
    playAudibleTest() {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            console.warn('Cannot play audible test - audio context not running');
            return false;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Play a clearly audible test beep
            oscillator.frequency.value = 800; // Higher pitch for TV speakers
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Audible but not too loud
            gainNode.gain.value = 0.3;
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
            console.log('Audible test beep played');
            return true;

        } catch (error) {
            console.error('Failed to play audible test:', error);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.sounds.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}

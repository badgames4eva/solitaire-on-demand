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
     */
    async resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            } catch (error) {
                console.warn('Failed to resume audio context:', error);
            }
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

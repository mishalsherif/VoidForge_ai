// Audio System for Iron Man Gesture Builder
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.sounds = {};
        this.masterVolume = 0.3;
        this.spatialEnabled = true;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.createSounds();
            this.isInitialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    async createSounds() {
        // Build sound - ascending tone
        this.sounds.build = await this.createToneSequence([220, 330, 440], 0.1, 'sine');

        // Erase sound - descending tone
        this.sounds.erase = await this.createToneSequence([440, 330, 220], 0.1, 'sawtooth');

        // Grab sound - low frequency pulse
        this.sounds.grab = await this.createPulse(80, 0.3, 3);

        // Release sound - quick ascending chirp
        this.sounds.release = await this.createToneSequence([330, 440], 0.05, 'square');

        // Rotate sound - continuous modulation
        this.sounds.rotate = await this.createModulatedTone(200, 0.8);

        // Reset sound - dramatic descending sequence
        this.sounds.reset = await this.createToneSequence([880, 660, 440, 220], 0.15, 'sawtooth');

        // Gravity sound - whoosh effect
        this.sounds.gravity = await this.createWhoosh(100, 50, 0.5);

        // Color change sound - pleasant chime
        this.sounds.colorChange = await this.createChime([523, 659, 784], 0.2);

        // Disco mode sound - upbeat sequence
        this.sounds.disco = await this.createDiscoBeat();
    }

    async createToneSequence(frequencies, duration, waveType) {
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration * frequencies.length, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frequencies.length; i++) {
            const startSample = i * this.audioContext.sampleRate * duration;
            const endSample = (i + 1) * this.audioContext.sampleRate * duration;

            for (let j = startSample; j < endSample; j++) {
                const t = (j - startSample) / (endSample - startSample);
                const envelope = Math.sin(t * Math.PI); // Fade in/out
                data[j] = envelope * Math.sin(2 * Math.PI * frequencies[i] * (j / this.audioContext.sampleRate));
            }
        }

        return buffer;
    }

    async createPulse(frequency, duration, pulses) {
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / this.audioContext.sampleRate;
            const pulsePhase = (t / duration) * pulses * Math.PI * 2;
            const envelope = Math.sin(pulsePhase) * 0.5 + 0.5;
            data[i] = envelope * Math.sin(2 * Math.PI * frequency * t);
        }

        return buffer;
    }

    async createModulatedTone(baseFreq, duration) {
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / this.audioContext.sampleRate;
            const modulation = Math.sin(2 * Math.PI * 5 * t) * 0.3 + 0.7; // 5Hz modulation
            const envelope = Math.min(t * 4, 1) * Math.min((duration - t) * 4, 1); // Smooth fade
            data[i] = envelope * Math.sin(2 * Math.PI * baseFreq * modulation * t);
        }

        return buffer;
    }

    async createWhoosh(startFreq, endFreq, duration) {
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / this.audioContext.sampleRate;
            const progress = t / duration;
            const frequency = startFreq + (endFreq - startFreq) * progress;
            const envelope = Math.sin(progress * Math.PI); // Bell curve
            const noise = (Math.random() - 0.5) * 0.1; // Add some noise
            data[i] = envelope * (Math.sin(2 * Math.PI * frequency * t) + noise);
        }

        return buffer;
    }

    async createChime(frequencies, duration) {
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frequencies.length; i++) {
            const startTime = (i / frequencies.length) * duration;
            const startSample = startTime * this.audioContext.sampleRate;
            const samplesPerNote = (duration / frequencies.length) * this.audioContext.sampleRate;

            for (let j = 0; j < samplesPerNote; j++) {
                const sampleIndex = startSample + j;
                if (sampleIndex >= data.length) break;

                const t = j / this.audioContext.sampleRate;
                const envelope = Math.exp(-t * 3); // Exponential decay
                data[sampleIndex] += envelope * Math.sin(2 * Math.PI * frequencies[i] * t);
            }
        }

        return buffer;
    }

    async createDiscoBeat() {
        const duration = 0.8;
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Create a funky disco beat pattern
        const notes = [
            { freq: 440, time: 0, duration: 0.1 },
            { freq: 554, time: 0.1, duration: 0.1 },
            { freq: 659, time: 0.2, duration: 0.1 },
            { freq: 880, time: 0.3, duration: 0.1 },
            { freq: 440, time: 0.4, duration: 0.1 },
            { freq: 554, time: 0.5, duration: 0.1 },
            { freq: 659, time: 0.6, duration: 0.1 },
            { freq: 988, time: 0.7, duration: 0.1 }
        ];

        notes.forEach(note => {
            const startSample = note.time * this.audioContext.sampleRate;
            const endSample = (note.time + note.duration) * this.audioContext.sampleRate;

            for (let i = startSample; i < endSample && i < data.length; i++) {
                const t = (i - startSample) / this.audioContext.sampleRate;
                const envelope = Math.sin(t * Math.PI / note.duration);
                data[i] += envelope * Math.sin(2 * Math.PI * note.freq * t) * 0.3;
            }
        });

        return buffer;
    }

    playSound(soundName, position = null, volume = 1.0) {
        if (!this.isInitialized || !this.sounds[soundName]) return;

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[soundName];

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.masterVolume * volume;

            if (this.spatialEnabled && position && this.audioContext.listener) {
                // Create spatial audio
                const panner = this.audioContext.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 100;
                panner.rolloffFactor = 1;

                // Convert 3D position to audio coordinates
                panner.positionX.value = position.x || 0;
                panner.positionY.value = position.y || 0;
                panner.positionZ.value = position.z || 0;

                source.connect(panner);
                panner.connect(gainNode);
            } else {
                source.connect(gainNode);
            }

            gainNode.connect(this.audioContext.destination);
            source.start();
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    toggleSpatialAudio() {
        this.spatialEnabled = !this.spatialEnabled;
    }

    // Resume audio context (required by some browsers)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

// Global audio manager instance
const audioManager = new AudioManager();

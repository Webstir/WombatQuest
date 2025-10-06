/**
 * WebAudio adapter implementation
 */

import type { AudioPort, SoundEffect } from '../ports';

interface LoadedSound {
  buffer: AudioBuffer;
  source?: AudioBufferSourceNode;
}

export class WebAudio implements AudioPort {
  private audioContext: AudioContext;
  private sounds: Map<string, LoadedSound> = new Map();
  private masterVolume: number = 0.7;
  private muted: boolean = true;
  private masterGainNode: GainNode;

  constructor() {
    // Create audio context (will be resumed on first user interaction)
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create master gain node for volume control
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = this.masterVolume;
    
    // Resume audio context on first user interaction
    const resumeAudio = () => {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
    };
    
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
  }

  async loadSound(id: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(id, { buffer: audioBuffer });
    } catch (error) {
      console.warn(`Failed to load sound ${id}:`, error);
      // Create a silent buffer as fallback
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      this.sounds.set(id, { buffer: silentBuffer });
    }
  }

  playSound(id: string, volume: number = 1.0): void {
    if (this.muted) return;
    
    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound ${id} not found`);
      return;
    }

    try {
      // Create new source node for each playback
      const source = this.audioContext.createBufferSource();
      source.buffer = sound.buffer;

      // Create gain node for this specific sound
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume * this.masterVolume;

      // Connect: source -> gain -> master gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Play the sound
      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound ${id}:`, error);
    }
  }

  stopSound(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.source) {
      try {
        sound.source.stop();
        sound.source.disconnect();
        sound.source = undefined;
      } catch (error) {
        // Sound might have already finished playing
      }
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.value = this.muted ? 0 : this.masterVolume;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.masterGainNode.gain.value = muted ? 0 : this.masterVolume;
  }

  isMuted(): boolean {
    return this.muted;
  }

  async preloadGameSounds(): Promise<void> {
    const soundUrls: Record<SoundEffect, string> = {
      coinPickup: this.generateCoinPickupSound(),
      playerMove: this.generatePlayerMoveSound(),
      playerRest: this.generatePlayerRestSound(),
      buttonClick: this.generateButtonClickSound(),
      gameStart: this.generateGameStartSound(),
      gameOver: this.generateGameOverSound(),
    };

    const loadPromises = Object.entries(soundUrls).map(([id, url]) => 
      this.loadSound(id, url)
    );

    await Promise.all(loadPromises);
  }

  /**
   * Generate procedural sound effects using Web Audio API
   */
  private generateCoinPickupSound(): string {
    // Create a short, bright "ding" sound
    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8); // Quick decay
      const frequency = 800 + 400 * Math.sin(t * 20); // Rising pitch
      data[i] = envelope * 0.3 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generatePlayerMoveSound(): string {
    // Create a subtle "step" sound
    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15); // Very quick decay
      const frequency = 200 + 100 * Math.random(); // Slight randomness
      data[i] = envelope * 0.1 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generatePlayerRestSound(): string {
    // Create a gentle "sigh" sound
    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2); // Slow decay
      const frequency = 150 - 50 * t; // Descending pitch
      data[i] = envelope * 0.2 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generateButtonClickSound(): string {
    // Create a short "click" sound
    const duration = 0.05;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30); // Very quick decay
      const frequency = 1000;
      data[i] = envelope * 0.2 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generateGameStartSound(): string {
    // Create an uplifting "start" sound
    const duration = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 1.5); // Slow decay
      const frequency = 400 + 200 * t; // Rising pitch
      data[i] = envelope * 0.3 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generateGameOverSound(): string {
    // Create a descending "game over" sound
    const duration = 1.0;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 1); // Slow decay
      const frequency = 600 - 400 * t; // Descending pitch
      data[i] = envelope * 0.25 * Math.sin(2 * Math.PI * frequency * t);
    }

    return this.bufferToDataUrl(buffer);
  }

  private bufferToDataUrl(buffer: AudioBuffer): string {
    // Convert AudioBuffer to WAV data URL
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
}

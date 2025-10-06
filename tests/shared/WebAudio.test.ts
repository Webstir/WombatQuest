/**
 * Unit tests for WebAudio adapter
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebAudio } from '../../shared/adapters';

// Mock Web Audio API
const mockAudioContext = {
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  decodeAudioData: vi.fn(),
  destination: {},
  sampleRate: 44100,
};

const mockGainNode = {
  connect: vi.fn(),
  gain: { value: 0.7 },
};

const mockSourceNode = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioBuffer = {
  length: 1000,
  sampleRate: 44100,
  getChannelData: vi.fn(() => new Float32Array(1000)),
};

// Mock global Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

// Mock fetch for sound loading
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'mock-data-url');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

describe('WebAudio', () => {
  let webAudio: WebAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockAudioContext.createBuffer.mockReturnValue(mockAudioBuffer);
    mockAudioContext.createBufferSource.mockReturnValue(mockSourceNode);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
    });

    webAudio = new WebAudio();
  });

  describe('constructor', () => {
    it('should create audio context and gain node', () => {
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockGainNode.gain.value).toBe(0.7);
    });
  });

  describe('loadSound', () => {
    it('should load and decode audio data', async () => {
      await webAudio.loadSound('testSound', 'test.wav');

      expect(mockFetch).toHaveBeenCalledWith('test.wav');
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('should handle loading errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await webAudio.loadSound('testSound', 'test.wav');

      // Should not throw, but create a silent buffer as fallback
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    });
  });

  describe('playSound', () => {
    beforeEach(async () => {
      await webAudio.loadSound('testSound', 'test.wav');
    });

    it('should play a loaded sound', () => {
      webAudio.playSound('testSound', 0.5);

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSourceNode.buffer).toBe(mockAudioBuffer);
      expect(mockSourceNode.connect).toHaveBeenCalled();
      expect(mockSourceNode.start).toHaveBeenCalledWith(0);
    });

    it('should not play sound when muted', () => {
      webAudio.setMuted(true);
      webAudio.playSound('testSound', 0.5);

      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });

    it('should handle unknown sound gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      webAudio.playSound('unknownSound', 0.5);

      expect(consoleSpy).toHaveBeenCalledWith('Sound unknownSound not found');
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('volume control', () => {
    it('should set master volume', () => {
      webAudio.setMasterVolume(0.5);
      expect(mockGainNode.gain.value).toBe(0.5);
    });

    it('should clamp volume to valid range', () => {
      webAudio.setMasterVolume(1.5);
      expect(mockGainNode.gain.value).toBe(1.0);

      webAudio.setMasterVolume(-0.5);
      expect(mockGainNode.gain.value).toBe(0.0);
    });

    it('should get master volume', () => {
      webAudio.setMasterVolume(0.8);
      expect(webAudio.getMasterVolume()).toBe(0.8);
    });
  });

  describe('mute control', () => {
    it('should mute audio', () => {
      webAudio.setMuted(true);
      expect(mockGainNode.gain.value).toBe(0);
      expect(webAudio.isMuted()).toBe(true);
    });

    it('should unmute audio', () => {
      webAudio.setMuted(true);
      webAudio.setMuted(false);
      expect(mockGainNode.gain.value).toBe(0.7);
      expect(webAudio.isMuted()).toBe(false);
    });
  });

  describe('preloadGameSounds', () => {
    it('should preload all game sounds', async () => {
      await webAudio.preloadGameSounds();

      // Should have loaded all sound types
      const expectedSounds = ['coinPickup', 'playerMove', 'playerRest', 'buttonClick', 'gameStart', 'gameOver'];
      expectedSounds.forEach(() => {
        expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      });
    });
  });

  describe('stopSound', () => {
    it('should stop a playing sound', () => {
      const sound = { buffer: mockAudioBuffer, source: mockSourceNode };
      (webAudio as any).sounds.set('testSound', sound);

      webAudio.stopSound('testSound');

      expect(mockSourceNode.stop).toHaveBeenCalled();
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
    });

    it('should handle stopping non-existent sound gracefully', () => {
      expect(() => webAudio.stopSound('unknownSound')).not.toThrow();
    });
  });
});

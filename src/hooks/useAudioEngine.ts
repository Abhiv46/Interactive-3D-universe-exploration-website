import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface AudioSource {
  id: string;
  buffer: AudioBuffer;
  position: THREE.Vector3;
  gain: GainNode;
  panner: PannerNode;
  source: AudioBufferSourceNode | null;
  playing: boolean;
  loop: boolean;
  rolloffFactor: number;
  refDistance: number;
  maxDistance: number;
}

interface AudioState {
  enabled: boolean;
  masterGain: number;
  context: AudioContext | null;
  listenerPosition: THREE.Vector3;
  listenerOrientation: { forward: THREE.Vector3; up: THREE.Vector3 };
  sources: Map<string, AudioSource>;
}

export function useAudioEngine() {
  const [state, setState] = useState<AudioState>({
    enabled: true,
    masterGain: 0.5,
    context: null,
    listenerPosition: new THREE.Vector3(0, 0, 0),
    listenerOrientation: {
      forward: new THREE.Vector3(0, 0, -1),
      up: new THREE.Vector3(0, 1, 0),
    },
    sources: new Map(),
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceRefs = useRef<Map<string, AudioSource>>(new Map());

  // Initialize AudioContext
  useEffect(() => {
    const initAudio = async () => {
      if (typeof window === 'undefined') return;

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();

        // Resume if suspended (browser autoplay policy)
        if (context.state === 'suspended') {
          await context.resume();
        }

        const masterGain = context.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(context.destination);

        audioContextRef.current = context;
        masterGainRef.current = masterGain;

        setState(prev => ({
          ...prev,
          context,
        }));
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup all sources
      sourceRefs.current.forEach(source => {
        if (source.source) {
          try {
            source.source.stop();
            source.source.disconnect();
          } catch {}
        }
        source.gain.disconnect();
        source.panner.disconnect();
      });
      sourceRefs.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (masterGainRef.current) {
        masterGainRef.current.disconnect();
        masterGainRef.current = null;
      }
    };
  }, []);

  // Update listener position
  const updateListener = useCallback((
    position: THREE.Vector3,
    forward: THREE.Vector3,
    up: THREE.Vector3
  ) => {
    const context = audioContextRef.current;
    if (!context || !context.listener) return;

    context.listener.setPosition(position.x, position.y, position.z);
    context.listener.setOrientation(
      forward.x, forward.y, forward.z,
      up.x, up.y, up.z
    );

    setState(prev => ({
      ...prev,
      listenerPosition: position.clone(),
      listenerOrientation: { forward: forward.clone(), up: up.clone() },
    }));
  }, []);

  // Load audio buffer from URL
  const loadBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    const context = audioContextRef.current;
    if (!context) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer);
      return buffer;
    } catch (error) {
      console.warn(`Failed to load audio: ${url}`, error);
      return null;
    }
  }, []);

  // Create spatial audio source
  const createSource = useCallback((
    id: string,
    buffer: AudioBuffer,
    options: {
      position?: THREE.Vector3;
      loop?: boolean;
      gain?: number;
      rolloffFactor?: number;
      refDistance?: number;
      maxDistance?: number;
    } = {}
  ) => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (!context || !masterGain) return null;

    const gain = context.createGain();
    gain.gain.value = options.gain ?? 1;

    const panner = context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.rolloffFactor = options.rolloffFactor ?? 1;
    panner.refDistance = options.refDistance ?? 1;
    panner.maxDistance = options.maxDistance ?? 10000;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0;

    if (options.position) {
      panner.positionX.setValueAtTime(options.position.x, context.currentTime);
      panner.positionY.setValueAtTime(options.position.y, context.currentTime);
      panner.positionZ.setValueAtTime(options.position.z, context.currentTime);
    }

    gain.connect(panner);
    panner.connect(masterGain);

    const source: AudioSource = {
      id,
      buffer,
      position: options.position ?? new THREE.Vector3(0, 0, 0),
      gain,
      panner,
      source: null,
      playing: false,
      loop: options.loop ?? false,
      rolloffFactor: options.rolloffFactor ?? 1,
      refDistance: options.refDistance ?? 1,
      maxDistance: options.maxDistance ?? 10000,
    };

    sourceRefs.current.set(id, source);
    setState(prev => {
      const newSources = new Map(prev.sources);
      newSources.set(id, source);
      return { ...prev, sources: newSources };
    });

    return source;
  }, []);

  // Play source
  const playSource = useCallback((id: string, when?: number) => {
    const context = audioContextRef.current;
    const sourceData = sourceRefs.current.get(id);
    if (!context || !sourceData || sourceData.playing) return;

    const source = context.createBufferSource();
    source.buffer = sourceData.buffer;
    source.loop = sourceData.loop;
    source.connect(sourceData.gain);

    const startTime = when ?? context.currentTime;
    source.start(startTime);

    sourceData.source = source;
    sourceData.playing = true;

    source.onended = () => {
      sourceData.playing = false;
      sourceData.source = null;
      setState(prev => {
        const newSources = new Map(prev.sources);
        const updated = { ...sourceData, playing: false, source: null };
        newSources.set(id, updated);
        return { ...prev, sources: newSources };
      });
    };

    setState(prev => {
      const newSources = new Map(prev.sources);
      newSources.set(id, { ...sourceData, playing: true, source });
      return { ...prev, sources: newSources };
    });
  }, []);

  // Stop source
  const stopSource = useCallback((id: string) => {
    const sourceData = sourceRefs.current.get(id);
    if (!sourceData || !sourceData.source || !sourceData.playing) return;

    try {
      sourceData.source.stop();
      sourceData.source.disconnect();
    } catch {}

    sourceData.source = null;
    sourceData.playing = false;

    setState(prev => {
      const newSources = new Map(prev.sources);
      newSources.set(id, { ...sourceData, playing: false, source: null });
      return { ...prev, sources: newSources };
    });
  }, []);

  // Update source position
  const updateSourcePosition = useCallback((id: string, position: THREE.Vector3) => {
    const sourceData = sourceRefs.current.get(id);
    if (!sourceData) return;

    const context = audioContextRef.current;
    if (!context) return;

    sourceData.position.copy(position);
    sourceData.panner.positionX.setValueAtTime(position.x, context.currentTime);
    sourceData.panner.positionY.setValueAtTime(position.y, context.currentTime);
    sourceData.panner.positionZ.setValueAtTime(position.z, context.currentTime);

    setState(prev => {
      const newSources = new Map(prev.sources);
      newSources.set(id, { ...sourceData, position: position.clone() });
      return { ...prev, sources: newSources };
    });
  }, []);

  // Set source gain
  const setSourceGain = useCallback((id: string, gain: number) => {
    const sourceData = sourceRefs.current.get(id);
    if (!sourceData) return;

    sourceData.gain.gain.setValueAtTime(gain, audioContextRef.current?.currentTime ?? 0);

    setState(prev => {
      const newSources = new Map(prev.sources);
      newSources.set(id, { ...sourceData, gain: sourceData.gain });
      return { ...prev, sources: newSources };
    });
  }, []);

  // Set master volume
  const setMasterGain = useCallback((gain: number) => {
    const masterGain = masterGainRef.current;
    if (!masterGain) return;

    const context = audioContextRef.current;
    if (context) {
      masterGain.gain.setValueAtTime(gain, context.currentTime);
    }

    setState(prev => ({ ...prev, masterGain: gain }));
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const context = audioContextRef.current;
    if (!context) return;

    if (context.state === 'running') {
      context.suspend();
      setState(prev => ({ ...prev, enabled: false }));
    } else {
      context.resume();
      setState(prev => ({ ...prev, enabled: true }));
    }
  }, []);

  // Generate procedural noise for solar wind
  const generateSolarWindNoise = useCallback((duration: number = 30): AudioBuffer | null => {
    const context = audioContextRef.current;
    if (!context) return null;

    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate filtered noise (pink noise approximation)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // Normalize
    }

    return buffer;
  }, []);

  // Generate CMB drone (2.7K blackbody mapped to audio)
  const generateCMBDrone = useCallback((duration: number = 60): AudioBuffer | null => {
    const context = audioContextRef.current;
    if (!context) return null;

    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // CMB peak frequency ~160 GHz, map to audible ~160 Hz
    // Add harmonics for texture
    const baseFreq = 160; // Hz
    const phase = new Float32Array(8).fill(0);
    const freqs = [baseFreq, baseFreq * 2, baseFreq * 3, baseFreq * 4, baseFreq * 5, baseFreq * 6, baseFreq * 7, baseFreq * 8];
    const amps = [1.0, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.125];

    for (let i = 0; i < length; i++) {
      let sample = 0;
      for (let h = 0; h < freqs.length; h++) {
        phase[h] += freqs[h] * 2 * Math.PI / sampleRate;
        if (phase[h] > 2 * Math.PI) phase[h] -= 2 * Math.PI;
        sample += Math.sin(phase[h]) * amps[h];
      }
      // Add very slow modulation
      const mod = Math.sin(i / sampleRate * 0.1) * 0.1;
      data[i] = (sample + mod) * 0.05;
    }

    return buffer;
  }, []);

  // Cassini-like plasma wave recording simulation
  const generateCassiniPlasma = useCallback((duration: number = 20): AudioBuffer | null => {
    const context = audioContextRef.current;
    if (!context) return null;

    const sampleRate = context.sampleRate;
    const length = sampleRate * duration;
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Whistler tones and chorus emissions
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Rising tone (whistler)
      const whistlerFreq = 100 + 2000 * Math.pow(t / duration, 2);
      sample += Math.sin(2 * Math.PI * whistlerFreq * t) * Math.exp(-t * 0.5) * 0.3;

      // Chorus (bursting tones)
      if (t % 2 < 0.5) {
        const chorusFreq = 500 + Math.sin(t * 5) * 200;
        sample += Math.sin(2 * Math.PI * chorusFreq * t) * 0.15;
      }

      // Background hiss
      sample += (Math.random() * 2 - 1) * 0.05;

      data[i] = sample;
    }

    return buffer;
  }, []);

  return {
    state,
    updateListener,
    loadBuffer,
    createSource,
    playSource,
    stopSource,
    updateSourcePosition,
    setSourceGain,
    setMasterGain,
    toggleAudio,
    generateSolarWindNoise,
    generateCMBDrone,
    generateCassiniPlasma,
  };
}
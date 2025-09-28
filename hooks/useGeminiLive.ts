
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { ConnectionState } from '../types';

// Audio Encoding & Decoding functions
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export const useGeminiLive = (
    systemInstruction: string, 
    voiceName: string, 
    onTurnComplete: (turn: { user: string; model: string }) => void
) => {
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
    const [userTranscription, setUserTranscription] = useState<string>('');
    const [modelTranscription, setModelTranscription] = useState<string>('');

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const userTranscriptionRef = useRef('');
    const modelTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const audioBufferSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const onTurnCompleteRef = useRef(onTurnComplete);
    onTurnCompleteRef.current = onTurnComplete;

    const connect = useCallback(async () => {
        setConnectionState(ConnectionState.CONNECTING);

        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set.");
            setConnectionState(ConnectionState.ERROR);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        setConnectionState(ConnectionState.CONNECTED);
                        
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        
                        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        setConnectionState(ConnectionState.LISTENING);
                        
                        const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        let currentInput = userTranscriptionRef.current;
                        let currentOutput = modelTranscriptionRef.current;

                        if (message.serverContent?.inputTranscription) {
                            currentInput += message.serverContent.inputTranscription.text;
                            setUserTranscription(currentInput);
                            userTranscriptionRef.current = currentInput;
                        } else if (message.serverContent?.outputTranscription) {
                            setConnectionState(ConnectionState.SPEAKING);
                            currentOutput += message.serverContent.outputTranscription.text;
                            setModelTranscription(currentOutput);
                            modelTranscriptionRef.current = currentOutput;
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            if (userTranscriptionRef.current.trim() || modelTranscriptionRef.current.trim()) {
                                onTurnCompleteRef.current({
                                    user: userTranscriptionRef.current,
                                    model: modelTranscriptionRef.current,
                                });
                            }
                            userTranscriptionRef.current = '';
                            modelTranscriptionRef.current = '';
                            setUserTranscription('');
                            setModelTranscription('');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            setConnectionState(ConnectionState.SPEAKING);
                            const audioData = decode(base64Audio);
                            const audioBuffer = await decodeAudioData(audioData, outputAudioContextRef.current, 24000, 1);
                            
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            const currentTime = outputAudioContextRef.current.currentTime;
                            const startTime = Math.max(currentTime, nextStartTimeRef.current);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + audioBuffer.duration;
                            
                            audioBufferSources.current.add(source);
                            source.onended = () => {
                                audioBufferSources.current.delete(source);
                                if (audioBufferSources.current.size === 0) {
                                    setConnectionState(ConnectionState.LISTENING);
                                }
                            };
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setConnectionState(ConnectionState.ERROR);
                    },
                    onclose: () => {
                        setConnectionState(ConnectionState.DISCONNECTED);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
                    },
                    systemInstruction: systemInstruction,
                },
            });
            sessionPromiseRef.current = sessionPromise;

        } catch (error) {
            console.error('Failed to connect to Gemini Live:', error);
            setConnectionState(ConnectionState.ERROR);
        }
    }, [systemInstruction, voiceName]);

    const disconnect = useCallback(() => {
        sessionPromiseRef.current?.then((session) => session.close());
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        mediaStreamRef.current = null;
        sessionPromiseRef.current = null;

        setConnectionState(ConnectionState.DISCONNECTED);
    }, []);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return { connectionState, userTranscription, modelTranscription };
};

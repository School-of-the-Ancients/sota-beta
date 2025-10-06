
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, SessionResumptionConfig } from '@google/genai';
import { ConnectionState, Quest } from '../types';
import {
    createAudioBufferFromPCM16,
    createGeminiRealtimeBlob,
    decodeBase64ToPCM16,
} from './audioUtils';
import {
    changeEnvironmentFunctionDeclaration,
    displayArtifactFunctionDeclaration,
} from './realtimeTools';

function parseDurationToMs(duration?: string | null): number | null {
    if (!duration) {
        return null;
    }

    const trimmed = duration.trim();
    if (!trimmed) {
        return null;
    }

    const secondsMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)s$/i);
    if (secondsMatch) {
        const seconds = Number.parseFloat(secondsMatch[1]);
        return Number.isNaN(seconds) ? null : Math.max(seconds * 1000, 0);
    }

    const isoMatch = trimmed.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
    if (isoMatch) {
        const hours = isoMatch[1] ? Number.parseFloat(isoMatch[1]) : 0;
        const minutes = isoMatch[2] ? Number.parseFloat(isoMatch[2]) : 0;
        const seconds = isoMatch[3] ? Number.parseFloat(isoMatch[3]) : 0;
        if ([hours, minutes, seconds].some(value => Number.isNaN(value))) {
            return null;
        }
        const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        return Math.max(totalMs, 0);
    }

    return null;
}

export const useGeminiLive = (
    systemInstruction: string,
    voiceName: string,
    voiceAccent?: string,
    onTurnComplete: (turn: { user: string; model: string }) => void,
    onEnvironmentChangeRequest: (description: string) => void,
    onArtifactDisplayRequest: (name: string, description: string) => void,
    activeQuest: Quest | null,
    enabled = true,
) => {
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
    const [userTranscription, setUserTranscription] = useState<string>('');
    const [modelTranscription, setModelTranscription] = useState<string>('');
    const [isMicActive, setIsMicActive] = useState(true);

    // FIX: Using `any` for the session promise type as `LiveSession` is not an exported type from the library.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const silentGainNodeRef = useRef<GainNode | null>(null);

    const userTranscriptionRef = useRef('');
    const modelTranscriptionRef = useRef('');
    const isMicActiveRef = useRef(isMicActive);
    const sessionHandleRef = useRef<string | null>(null);
    const pendingResumptionHandleRef = useRef<string | null>(null);
    const sessionRenewalTimeoutRef = useRef<number | null>(null);
    const isRenewingSessionRef = useRef(false);
    useEffect(() => {
        isMicActiveRef.current = isMicActive;
    }, [isMicActive]);
    
    const nextStartTimeRef = useRef(0);
    const audioBufferSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const onTurnCompleteRef = useRef(onTurnComplete);
    onTurnCompleteRef.current = onTurnComplete;
    const onEnvironmentChangeRequestRef = useRef(onEnvironmentChangeRequest);
    onEnvironmentChangeRequestRef.current = onEnvironmentChangeRequest;
    const onArtifactDisplayRequestRef = useRef(onArtifactDisplayRequest);
    onArtifactDisplayRequestRef.current = onArtifactDisplayRequest;

    const toggleMicrophone = useCallback(() => {
        setIsMicActive(prevIsActive => {
            const nextIsActive = !prevIsActive;
            const source = mediaStreamSourceRef.current;
            const workletNode = audioWorkletNodeRef.current;
            const scriptProcessorNode = scriptProcessorRef.current;
            const context = inputAudioContextRef.current;

            if (!source || (!workletNode && !scriptProcessorNode) || !context) {
                return nextIsActive;
            }

            try {
                if (nextIsActive) {
                    if (workletNode) {
                        source.connect(workletNode);
                        if (!silentGainNodeRef.current) {
                            const silentGain = context.createGain();
                            silentGain.gain.value = 0;
                            workletNode.connect(silentGain);
                            silentGain.connect(context.destination);
                            silentGainNodeRef.current = silentGain;
                        }
                    }

                    if (scriptProcessorNode) {
                        source.connect(scriptProcessorNode);
                        try {
                            scriptProcessorNode.connect(context.destination);
                        } catch (connectError) {
                            // Ignore if already connected.
                        }
                    }
                    setConnectionState(ConnectionState.LISTENING);
                } else {
                    if (workletNode) {
                        source.disconnect(workletNode);
                    }

                    if (scriptProcessorNode) {
                        try {
                            source.disconnect(scriptProcessorNode);
                            scriptProcessorNode.disconnect();
                        } catch (disconnectError) {
                            // Ignore when already disconnected.
                        }
                    }
                    setConnectionState(ConnectionState.CONNECTED);
                }
            } catch (e) {
                // Ignore errors, e.g., if already disconnected.
            }

            return nextIsActive;
        });
    }, []);

    const clearScheduledRenewal = useCallback(() => {
        if (sessionRenewalTimeoutRef.current !== null) {
            window.clearTimeout(sessionRenewalTimeoutRef.current);
            sessionRenewalTimeoutRef.current = null;
        }
    }, []);

    const disconnect = useCallback(() => {
        clearScheduledRenewal();
        isRenewingSessionRef.current = false;

        sessionPromiseRef.current?.then((session) => session.close()).catch(err => {
            console.warn('Error during session close:', err);
        });

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        if (audioWorkletNodeRef.current && mediaStreamSourceRef.current) {
            try {
                mediaStreamSourceRef.current.disconnect(audioWorkletNodeRef.current);
                if (silentGainNodeRef.current) {
                    audioWorkletNodeRef.current.disconnect(silentGainNodeRef.current);
                    silentGainNodeRef.current.disconnect();
                } else {
                    audioWorkletNodeRef.current.disconnect();
                }
            } catch (e) {
                // Ignore errors
            }
        }
        if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
            try {
                mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
                scriptProcessorRef.current.disconnect();
            } catch (e) {
                // Ignore errors
            }
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.port.onmessage = null;
        }
        audioWorkletNodeRef.current = null;
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        silentGainNodeRef.current = null;

        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        mediaStreamRef.current = null;
        sessionPromiseRef.current = null;

        setConnectionState(ConnectionState.DISCONNECTED);
    }, [clearScheduledRenewal]);

    const sendTextMessage = useCallback((text: string) => {
        if (!text.trim()) return;

        onTurnCompleteRef.current({ user: text, model: '' });
        userTranscriptionRef.current = ''; // Clear after adding to transcript

        setConnectionState(ConnectionState.THINKING);
        sessionPromiseRef.current?.then((session) => {
            try {
                session.sendRealtimeInput({ text });
            } catch (e) {
                console.error("Error sending text message (sync):", e);
                setConnectionState(ConnectionState.ERROR);
            }
        }).catch(e => {
            console.error("Error sending text message (async):", e);
            setConnectionState(ConnectionState.ERROR);
        });
    }, []);

    const connect = useCallback(async () => {
        setConnectionState(ConnectionState.CONNECTING);

        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set.");
            setConnectionState(ConnectionState.ERROR);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const sanitizedAccent = voiceAccent?.trim();
            let baseInstruction = systemInstruction.trim();
            if (sanitizedAccent) {
                const accentDirective = `Always speak using ${sanitizedAccent}, ensuring the accent, gender, and tone remain consistent. If your voice deviates from ${sanitizedAccent}, correct it immediately before continuing.`;
                const normalizedInstruction = baseInstruction.toLowerCase();
                if (!normalizedInstruction.includes(sanitizedAccent.toLowerCase())) {
                    baseInstruction = `${baseInstruction}\n\nVOICE ACCENT REQUIREMENT: ${accentDirective}`;
                }
            }

            let finalSystemInstruction = baseInstruction;
            if (activeQuest) {
                finalSystemInstruction = `YOUR CURRENT MISSION: As a mentor, your primary goal is to guide the student to understand the following: "${activeQuest.objective}". Tailor your questions and explanations to lead them towards this goal.\n\nQUEST COMPLETION PROTOCOL:\n1. Explicitly track the quest's focus points and confirm each one with the learner.\n2. The moment the learner demonstrates mastery of every focus area, clearly announce that the quest curriculum is complete. Congratulate them, encourage a brief self-reflection, and invite them to end the session so they can take the mastery quiz.\n3. After declaring completion, avoid introducing new topics unless the learner requests a targeted review.\n\n---\n\n${baseInstruction}`;
            }

            const sessionResumptionConfig: SessionResumptionConfig = {};
            if (pendingResumptionHandleRef.current) {
                sessionResumptionConfig.handle = pendingResumptionHandleRef.current;
            }

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        setConnectionState(ConnectionState.CONNECTED);

                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

                        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

                        const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        mediaStreamSourceRef.current = source;

                        let initialized = false;
                        const audioWorklet = inputAudioContextRef.current.audioWorklet;
                        if (audioWorklet && typeof audioWorklet.addModule === 'function') {
                            try {
                                const workletModuleUrl = new URL('../audio/microphoneWorkletProcessor.js', import.meta.url);
                                await audioWorklet.addModule(workletModuleUrl);

                                const audioWorkletNode = new AudioWorkletNode(inputAudioContextRef.current, 'microphone-processor', {
                                    numberOfInputs: 1,
                                    numberOfOutputs: 1,
                                    channelCount: 1,
                                });
                                audioWorkletNodeRef.current = audioWorkletNode;

                                audioWorkletNode.port.onmessage = (event) => {
                                    const inputData = event.data as Float32Array | undefined;
                                    if (!(inputData instanceof Float32Array)) {
                                        return;
                                    }

                                    if (!isMicActiveRef.current) {
                                        return;
                                    }

                                    const pcmBlob = createGeminiRealtimeBlob(inputData);
                                    sessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({ media: pcmBlob });
                                    }).catch(err => {
                                        console.warn('Error sending audio data; session may be closing.', err);
                                    });
                                };

                                if (isMicActiveRef.current) {
                                    source.connect(audioWorkletNode);
                                    if (!silentGainNodeRef.current) {
                                        const silentGain = inputAudioContextRef.current.createGain();
                                        silentGain.gain.value = 0;
                                        audioWorkletNode.connect(silentGain);
                                        silentGain.connect(inputAudioContextRef.current.destination);
                                        silentGainNodeRef.current = silentGain;
                                    }
                                    setConnectionState(ConnectionState.LISTENING);
                                }

                                initialized = true;
                            } catch (audioInitError) {
                                console.warn('AudioWorkletNode unavailable, falling back to ScriptProcessorNode:', audioInitError);
                            }
                        }

                        if (!initialized) {
                            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                if (!isMicActiveRef.current) {
                                    return;
                                }

                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createGeminiRealtimeBlob(inputData);
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }).catch(err => {
                                    console.warn('Error sending audio data; session may be closing.', err);
                                });
                            };

                            if (isMicActiveRef.current) {
                                source.connect(scriptProcessor);
                                scriptProcessor.connect(inputAudioContextRef.current.destination);
                                setConnectionState(ConnectionState.LISTENING);
                            }
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        try {
                            let currentInput = userTranscriptionRef.current;
                            let currentOutput = modelTranscriptionRef.current;

                            if (message.serverContent?.inputTranscription) {
                                currentInput += message.serverContent.inputTranscription.text;
                                setUserTranscription(currentInput);
                                userTranscriptionRef.current = currentInput;
                            } else if (message.serverContent?.outputTranscription) {
                                setConnectionState(ConnectionState.THINKING);
                                currentOutput += message.serverContent.outputTranscription.text;
                                setModelTranscription(currentOutput);
                                modelTranscriptionRef.current = currentOutput;
                            }

                            if (message.toolCall) {
                                for (const fc of message.toolCall.functionCalls) {
                                  if (fc.name === 'changeEnvironment' && fc.args && typeof fc.args.description === 'string') {
                                    onEnvironmentChangeRequestRef.current(fc.args.description);
                                  } else if (fc.name === 'displayArtifact' && fc.args && typeof fc.args.name === 'string' && typeof fc.args.description === 'string') {
                                    onArtifactDisplayRequestRef.current(fc.args.name, fc.args.description);
                                  }
                        
                                  sessionPromiseRef.current?.then((session) => {
                                    session.sendToolResponse({
                                      functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: "ok, action started" },
                                      }
                                    });
                                  });
                                }
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

                            if (message.sessionResumptionUpdate) {
                                const { newHandle, resumable } = message.sessionResumptionUpdate;
                                if (resumable && typeof newHandle === 'string' && newHandle.trim()) {
                                    sessionHandleRef.current = newHandle;
                                }
                            }

                            if (message.goAway?.timeLeft) {
                                const parsedMs = parseDurationToMs(message.goAway.timeLeft);
                                if (parsedMs !== null) {
                                    const normalizedMs = parsedMs || 0;
                                    if (!isRenewingSessionRef.current && sessionRenewalTimeoutRef.current === null) {
                                        if (sessionHandleRef.current) {
                                            const bufferMs = 5000;
                                            const delay = Math.max(normalizedMs - bufferMs, 0);
                                            sessionRenewalTimeoutRef.current = window.setTimeout(() => {
                                                sessionRenewalTimeoutRef.current = null;
                                                pendingResumptionHandleRef.current = sessionHandleRef.current;
                                                isRenewingSessionRef.current = true;
                                                try {
                                                    disconnect();
                                                } finally {
                                                    window.setTimeout(() => {
                                                        connect().catch(err => {
                                                            console.error('Failed to renew Gemini Live session:', err);
                                                            setConnectionState(ConnectionState.ERROR);
                                                        }).finally(() => {
                                                            isRenewingSessionRef.current = false;
                                                        });
                                                    }, 0);
                                                }
                                            }, delay);
                                        } else {
                                            console.warn('Received goAway notice but no resumable session handle is available.');
                                        }
                                    }
                                } else {
                                    console.warn('Unable to parse goAway timeLeft value:', message.goAway.timeLeft);
                                }
                            }

                            const interrupted = message.serverContent?.interrupted;
                            if (interrupted) {
                                for (const source of audioBufferSources.current.values()) {
                                    try {
                                        source.stop();
                                    } catch(e) {
                                        console.warn("Could not stop audio source, it may have already stopped:", e);
                                    }
                                    audioBufferSources.current.delete(source);
                                }
                                nextStartTimeRef.current = 0;
                            }

                            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (base64Audio && outputAudioContextRef.current) {
                                setConnectionState(ConnectionState.SPEAKING);
                            const audioInt16 = decodeBase64ToPCM16(base64Audio);
                            const audioBuffer = createAudioBufferFromPCM16(audioInt16, outputAudioContextRef.current, 24000, 1);

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
                                        setConnectionState(isMicActiveRef.current ? ConnectionState.LISTENING : ConnectionState.CONNECTED);
                                    }
                                };
                            }
                        } catch (error) {
                            console.error("Error in onmessage handler:", error);
                            setConnectionState(ConnectionState.ERROR);
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
                    systemInstruction: finalSystemInstruction,
                    tools: [{functionDeclarations: [changeEnvironmentFunctionDeclaration, displayArtifactFunctionDeclaration]}],
                    sessionResumption: sessionResumptionConfig,
                },
            });

            pendingResumptionHandleRef.current = null;

            sessionPromise.catch(err => {
                console.error('Failed to establish Gemini Live session:', err);
                setConnectionState(ConnectionState.ERROR);
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (error) {
            console.error('Failed to connect to Gemini Live:', error);
            setConnectionState(ConnectionState.ERROR);
        }
    }, [systemInstruction, voiceName, voiceAccent, activeQuest, disconnect]);

    useEffect(() => {
        if (!enabled) {
            disconnect();
            return;
        }

        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect, enabled]);

    return { connectionState, userTranscription, modelTranscription, isMicActive, toggleMicrophone, sendTextMessage };
};


import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Quest } from '../types';

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

const changeEnvironmentFunctionDeclaration: FunctionDeclaration = {
    name: 'changeEnvironment',
    parameters: {
      type: Type.OBJECT,
      description: "Changes the user's visual environment to a specified location or scene. Use this when the user says 'take me to', 'show me', 'go to', or similar phrases requesting a scene change, or when addressing the 'Operator' (e.g., 'Operator, take me to the Roman Forum').",
      properties: {
        description: {
          type: Type.STRING,
          description: 'A detailed description of the environment, e.g., "the Egyptian pyramids at sunset" or "Leonardo da Vinci\'s workshop".',
        },
      },
      required: ['description'],
    },
  };
  
  const displayArtifactFunctionDeclaration: FunctionDeclaration = {
    name: 'displayArtifact',
    parameters: {
      type: Type.OBJECT,
      description: "Generates and displays an image of a specific object, artifact, or concept being discussed. Use this when the character wants to 'show' something to the user, when the user asks to see something (e.g. 'show me the artifact'), or when addressing the 'Operator' (e.g., 'Operator, show me a diagram').",
      properties: {
        name: {
          type: Type.STRING,
          description: 'The name of the artifact, e.g., "flying machine" or "Mona Lisa".',
        },
        description: {
          type: Type.STRING,
          description: 'A detailed prompt for the image generation model to create a visual representation of the artifact.',
        },
      },
      required: ['name', 'description'],
    },
  };

export const useGeminiLive = (
    systemInstruction: string,
    voiceName: string,
    voiceAccent: string,
    onTurnComplete: (turn: { user: string; model: string }) => void,
    onEnvironmentChangeRequest: (description: string) => void,
    onArtifactDisplayRequest: (name: string, description: string) => void,
    activeQuest: Quest | null,
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
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const userTranscriptionRef = useRef('');
    const modelTranscriptionRef = useRef('');
    const isMicActiveRef = useRef(isMicActive);
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
            const processor = scriptProcessorRef.current;
            const context = inputAudioContextRef.current;

            if (!source || !processor || !context) {
                return nextIsActive;
            }

            try {
                if (nextIsActive) {
                    source.connect(processor);
                    processor.connect(context.destination);
                    setConnectionState(ConnectionState.LISTENING);
                } else {
                    source.disconnect(processor);
                    setConnectionState(ConnectionState.CONNECTED);
                }
            } catch (e) {
                // Ignore errors, e.g., if already disconnected.
            }

            return nextIsActive;
        });
    }, []);

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
            
            let baseSystemInstruction = systemInstruction;
            if (voiceAccent?.trim()) {
                baseSystemInstruction = `${baseSystemInstruction}\n\nVOICE ACCENT DIRECTIVE: Always speak with ${voiceAccent.trim()}.`;
            }
            let finalSystemInstruction = baseSystemInstruction;
            if (activeQuest) {
                finalSystemInstruction = `YOUR CURRENT MISSION: As a mentor, your primary goal is to guide the student to understand the following: "${activeQuest.objective}". Tailor your questions and explanations to lead them towards this goal.\n\n---\n\n${baseSystemInstruction}`;
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

                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
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
                },
            });

            sessionPromise.catch(err => {
                console.error('Failed to establish Gemini Live session:', err);
                setConnectionState(ConnectionState.ERROR);
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (error) {
            console.error('Failed to connect to Gemini Live:', error);
            setConnectionState(ConnectionState.ERROR);
        }
    }, [systemInstruction, voiceName, voiceAccent, activeQuest]);

    const disconnect = useCallback(() => {
        sessionPromiseRef.current?.then((session) => session.close()).catch(err => {
            console.warn('Error during session close:', err);
        });

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
            try {
                mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
                scriptProcessorRef.current.disconnect();
            } catch (e) {
                // Ignore errors
            }
        }
        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;


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

    return { connectionState, userTranscription, modelTranscription, isMicActive, toggleMicrophone, sendTextMessage };
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ConnectionState, Quest } from '../types';
import {
  createAudioBufferFromPCM16,
  float32ToPCM16,
} from './audioUtils';
import {
  changeEnvironmentToolDefinition,
  displayArtifactToolDefinition,
} from './realtimeTools';

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';
const OPENAI_SAMPLE_RATE = 24000;

const OPENAI_VOICE_MAP: Record<string, 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'> = {
  'charon': 'alloy',
  'fenrir': 'ash',
  'kore': 'sage',
  'puck': 'verse',
  'zephyr': 'shimmer',
};

function resolveOpenAiVoice(voiceName?: string, accent?: string) {
  if (voiceName) {
    const normalized = voiceName.trim().toLowerCase();
    if (OPENAI_VOICE_MAP[normalized]) {
      return OPENAI_VOICE_MAP[normalized];
    }
  }

  if (accent) {
    const normalizedAccent = accent.toLowerCase();
    if (normalizedAccent.includes('british') || normalizedAccent.includes('uk')) {
      return 'alloy';
    }
    if (normalizedAccent.includes('mediterranean') || normalizedAccent.includes('italian')) {
      return 'coral';
    }
  }

  return 'verse';
}

export const useOpenAiLive = (
  systemInstruction: string,
  voiceName: string,
  voiceAccent: string | undefined,
  onTurnComplete: (turn: { user: string; model: string }) => void,
  onEnvironmentChangeRequest: (description: string) => void,
  onArtifactDisplayRequest: (name: string, description: string) => void,
  activeQuest: Quest | null,
  enabled = true,
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [userTranscription, setUserTranscription] = useState('');
  const [modelTranscription, setModelTranscription] = useState('');
  const [isMicActive, setIsMicActive] = useState(true);

  const clientRef = useRef<RealtimeClient | null>(null);
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
  const nextStartTimeRef = useRef(0);
  const audioBufferSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const onTurnCompleteRef = useRef(onTurnComplete);
  onTurnCompleteRef.current = onTurnComplete;
  const onEnvironmentChangeRequestRef = useRef(onEnvironmentChangeRequest);
  onEnvironmentChangeRequestRef.current = onEnvironmentChangeRequest;
  const onArtifactDisplayRequestRef = useRef(onArtifactDisplayRequest);
  onArtifactDisplayRequestRef.current = onArtifactDisplayRequest;

  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  const stopAllScheduledAudio = useCallback(() => {
    for (const source of audioBufferSources.current.values()) {
      try {
        source.stop();
      } catch (error) {
        console.warn('Error stopping OpenAI audio source', error);
      }
      audioBufferSources.current.delete(source);
    }
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    stopAllScheduledAudio();

    clientRef.current?.disconnect();
    clientRef.current = null;

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
      } catch (error) {
        // Ignore errors on disconnect
      }
    }

    if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
        scriptProcessorRef.current.disconnect();
      } catch (error) {
        // Ignore errors on disconnect
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

    setConnectionState(ConnectionState.DISCONNECTED);
  }, [stopAllScheduledAudio]);

  const initializeMicrophone = useCallback(async (client: RealtimeClient) => {
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OPENAI_SAMPLE_RATE });

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
          if (!(inputData instanceof Float32Array) || !isMicActiveRef.current) {
            return;
          }

          const pcm16 = float32ToPCM16(inputData);
          try {
            client.appendInputAudio(pcm16);
          } catch (err) {
            console.warn('Failed to append audio to OpenAI realtime buffer:', err);
          }
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
      } catch (error) {
        console.warn('AudioWorkletNode unavailable for OpenAI realtime, falling back to ScriptProcessorNode:', error);
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
        const pcm16 = float32ToPCM16(inputData);
        try {
          client.appendInputAudio(pcm16);
        } catch (err) {
          console.warn('Failed to append audio to OpenAI realtime buffer:', err);
        }
      };

      if (isMicActiveRef.current) {
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContextRef.current.destination);
        setConnectionState(ConnectionState.LISTENING);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setConnectionState(ConnectionState.CONNECTING);

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable not set.');
      setConnectionState(ConnectionState.ERROR);
      return;
    }

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

    try {
      const client = new RealtimeClient({
        apiKey: process.env.OPENAI_API_KEY,
        dangerouslyAllowAPIKeyInBrowser: true,
      });
      clientRef.current = client;

      client.on('conversation.updated', ({ item, delta }: any) => {
        if (!item) {
          return;
        }

        if (item.role === 'user') {
          if (delta?.transcript) {
            userTranscriptionRef.current += delta.transcript;
            setUserTranscription(userTranscriptionRef.current);
          } else if (delta?.text) {
            userTranscriptionRef.current += delta.text;
            setUserTranscription(userTranscriptionRef.current);
          } else if (item.formatted?.transcript) {
            userTranscriptionRef.current = item.formatted.transcript.trim();
            setUserTranscription(userTranscriptionRef.current);
          }
        } else if (item.role === 'assistant') {
          if (delta?.text) {
            setConnectionState(ConnectionState.THINKING);
            modelTranscriptionRef.current += delta.text;
            setModelTranscription(modelTranscriptionRef.current);
          }

          if (delta?.transcript && !delta.text) {
            setConnectionState(ConnectionState.THINKING);
            modelTranscriptionRef.current += delta.transcript;
            setModelTranscription(modelTranscriptionRef.current);
          }

          if (delta?.audio && outputAudioContextRef.current) {
            setConnectionState(ConnectionState.SPEAKING);
            const audioBuffer = createAudioBufferFromPCM16(delta.audio, outputAudioContextRef.current, OPENAI_SAMPLE_RATE, 1);
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
        }
      });

      client.on('conversation.item.completed', ({ item }: any) => {
        if (!item) {
          return;
        }

        if (item.role === 'user') {
          const finalUser = (item.formatted?.transcript?.trim?.() || item.formatted?.text || '').trim();
          userTranscriptionRef.current = finalUser;
          setUserTranscription(finalUser);
        } else if (item.role === 'assistant') {
          const finalModel = (item.formatted?.transcript?.trim?.() || item.formatted?.text || '').trim();
          modelTranscriptionRef.current = finalModel;
          setModelTranscription(finalModel);

          if (userTranscriptionRef.current.trim() || finalModel.trim()) {
            onTurnCompleteRef.current({
              user: userTranscriptionRef.current,
              model: finalModel,
            });
          }

          userTranscriptionRef.current = '';
          modelTranscriptionRef.current = '';
          setUserTranscription('');
          setModelTranscription('');

          if (audioBufferSources.current.size === 0) {
            setConnectionState(isMicActiveRef.current ? ConnectionState.LISTENING : ConnectionState.CONNECTED);
          }
        }
      });

      client.on('conversation.interrupted', stopAllScheduledAudio);
      client.realtime.on('close', () => {
        setConnectionState(ConnectionState.DISCONNECTED);
      });

      client.addTool(changeEnvironmentToolDefinition, async ({ description }: any) => {
        if (typeof description === 'string') {
          onEnvironmentChangeRequestRef.current(description);
        }
        return { status: 'ok' };
      });

      client.addTool(displayArtifactToolDefinition, async ({ name, description }: any) => {
        if (typeof name === 'string' && typeof description === 'string') {
          onArtifactDisplayRequestRef.current(name, description);
        }
        return { status: 'ok' };
      });

      await client.realtime.connect({ model: OPENAI_REALTIME_MODEL });
      client.updateSession({
        instructions: finalSystemInstruction,
        voice: resolveOpenAiVoice(voiceName, voiceAccent),
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad' },
        modalities: ['text', 'audio'],
      });
      await client.waitForSessionCreated();

      await initializeMicrophone(client);
    } catch (error) {
      console.error('Failed to connect to OpenAI Realtime:', error);
      setConnectionState(ConnectionState.ERROR);
      disconnect();
    }
  }, [
    activeQuest,
    disconnect,
    enabled,
    initializeMicrophone,
    stopAllScheduledAudio,
    systemInstruction,
    voiceAccent,
    voiceName,
  ]);

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
              // Ignore if already connected
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
              // Ignore when already disconnected
            }
          }
          setConnectionState(ConnectionState.CONNECTED);
        }
      } catch (error) {
        // Ignore errors, e.g., if already disconnected
      }

      return nextIsActive;
    });
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    onTurnCompleteRef.current({ user: text, model: '' });
    userTranscriptionRef.current = '';

    setConnectionState(ConnectionState.THINKING);

    const client = clientRef.current;
    if (!client) {
      console.warn('OpenAI realtime client not connected.');
      return;
    }

    try {
      client.sendUserMessageContent([{ type: 'input_text', text }]);
    } catch (error) {
      console.error('Error sending text message to OpenAI Realtime:', error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, []);

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

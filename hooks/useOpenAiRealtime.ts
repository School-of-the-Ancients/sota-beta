import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionState, Quest } from '../types';
import { decodeBase64, decodePcm16ToAudioBuffer, float32ToPcm16Base64 } from './audioUtils';

type TurnUpdate = { user: string; model: string };

type ToolCallBuffer = {
  name: string;
  buffer: string;
};

const OPENAI_AUDIO_SAMPLE_RATE = 24000;
const AUDIO_COMMIT_INTERVAL_MS = 650;

export const useOpenAiRealtime = (
  systemInstruction: string,
  voiceName: string,
  voiceAccent: string | undefined,
  onTurnComplete: (turn: TurnUpdate) => void,
  onEnvironmentChangeRequest: (description: string) => void,
  onArtifactDisplayRequest: (name: string, description: string) => void,
  activeQuest: Quest | null,
) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [userTranscription, setUserTranscription] = useState('');
  const [modelTranscription, setModelTranscription] = useState('');
  const [isMicActive, setIsMicActive] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainNodeRef = useRef<GainNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioBufferSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const pendingAudioMsRef = useRef(0);
  const audioCommitTimeoutRef = useRef<number | null>(null);

  const userTranscriptionRef = useRef('');
  const modelTranscriptionRef = useRef('');
  const isMicActiveRef = useRef(isMicActive);

  const onTurnCompleteRef = useRef(onTurnComplete);
  const onEnvironmentChangeRequestRef = useRef(onEnvironmentChangeRequest);
  const onArtifactDisplayRequestRef = useRef(onArtifactDisplayRequest);

  const toolCallBuffersRef = useRef<Map<string, ToolCallBuffer>>(new Map());

  onTurnCompleteRef.current = onTurnComplete;
  onEnvironmentChangeRequestRef.current = onEnvironmentChangeRequest;
  onArtifactDisplayRequestRef.current = onArtifactDisplayRequest;

  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  const clearCommitTimer = useCallback(() => {
    if (audioCommitTimeoutRef.current !== null) {
      window.clearTimeout(audioCommitTimeoutRef.current);
      audioCommitTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearCommitTimer();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

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
      } catch {
        // ignore
      }
    }

    if (scriptProcessorRef.current && mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
        scriptProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
    }

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
    }

    audioWorkletNodeRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    silentGainNodeRef.current = null;

    inputAudioContextRef.current?.close().catch(() => undefined);
    outputAudioContextRef.current?.close().catch(() => undefined);

    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    mediaStreamRef.current = null;

    audioBufferSources.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    audioBufferSources.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
  }, [clearCommitTimer]);

  const flushPendingAudio = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        audio: { voice: voiceName },
      },
    }));
    pendingAudioMsRef.current = 0;
    clearCommitTimer();
  }, [clearCommitTimer, voiceName]);

  const scheduleCommit = useCallback(() => {
    clearCommitTimer();
    audioCommitTimeoutRef.current = window.setTimeout(() => {
      flushPendingAudio();
    }, AUDIO_COMMIT_INTERVAL_MS);
  }, [clearCommitTimer, flushPendingAudio]);

  const toggleMicrophone = useCallback(() => {
    setIsMicActive(prev => {
      const next = !prev;
      const source = mediaStreamSourceRef.current;
      const workletNode = audioWorkletNodeRef.current;
      const scriptProcessorNode = scriptProcessorRef.current;
      const context = inputAudioContextRef.current;

      if (!source || (!workletNode && !scriptProcessorNode) || !context) {
        return next;
      }

      try {
        if (next) {
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
            } catch {
              // ignore duplicate connections
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
            } catch {
              // ignore
            }
          }

          setConnectionState(ConnectionState.CONNECTED);
        }
      } catch {
        // ignore
      }

      return next;
    });
  }, []);

  const handleToolCallCompleted = useCallback((callId: string, tool: { name: string; arguments?: unknown }) => {
    if (!tool || tool.name !== 'changeEnvironment' && tool.name !== 'displayArtifact') {
      return;
    }

    if (tool.name === 'changeEnvironment' && tool.arguments && typeof (tool.arguments as any).description === 'string') {
      onEnvironmentChangeRequestRef.current((tool.arguments as any).description);
    }

    if (tool.name === 'displayArtifact' && tool.arguments) {
      const args = tool.arguments as any;
      if (typeof args.name === 'string' && typeof args.description === 'string') {
        onArtifactDisplayRequestRef.current(args.name, args.description);
      }
    }

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'tool_result',
          call_id: callId,
          content: [{ type: 'output_text', text: 'ok, action started' }],
        },
      }));
      ws.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  const connect = useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY environment variable not set.');
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    const realtimeBaseUrl = process.env.OPENAI_REALTIME_URL || 'wss://api.openai.com/v1/realtime';
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

    const url = `${realtimeBaseUrl}?model=${encodeURIComponent(model)}`;
    const protocols = ['realtime', `openai-insecure-api-key.${apiKey}`];
    if (process.env.OPENAI_ORG_ID) {
      protocols.push(`openai-insecure-org-id.${process.env.OPENAI_ORG_ID}`);
    }

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.addEventListener('open', async () => {
        try {
          setConnectionState(ConnectionState.CONNECTED);

          inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OPENAI_AUDIO_SAMPLE_RATE });

          mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
          mediaStreamSourceRef.current = source;

          const sanitizedAccent = voiceAccent?.trim();
          let baseInstruction = systemInstruction.trim();
          if (sanitizedAccent) {
            const accentDirective = `Always speak using ${sanitizedAccent}, ensuring the accent, gender, and tone remain consistent.`;
            if (!baseInstruction.toLowerCase().includes(sanitizedAccent.toLowerCase())) {
              baseInstruction = `${baseInstruction}\n\nVOICE ACCENT REQUIREMENT: ${accentDirective}`;
            }
          }

          let finalSystemInstruction = baseInstruction;
          if (activeQuest) {
            finalSystemInstruction = `YOUR CURRENT MISSION: As a mentor, your primary goal is to guide the student to understand the following: "${activeQuest.objective}". Tailor your questions and explanations to lead them towards this goal.\n\nQUEST COMPLETION PROTOCOL:\n1. Explicitly track the quest's focus points and confirm each one with the learner.\n2. The moment the learner demonstrates mastery of every focus area, clearly announce that the quest curriculum is complete. Congratulate them, encourage a brief self-reflection, and invite them to end the session so they can take the mastery quiz.\n3. After declaring completion, avoid introducing new topics unless the learner requests a targeted review.\n\n---\n\n${baseInstruction}`;
          }

          ws.send(JSON.stringify({
            type: 'session.update',
            session: {
              instructions: finalSystemInstruction,
              voice: voiceName,
              input_audio_format: { type: 'pcm16', sample_rate: 16000, channels: 1 },
              output_audio_format: { type: 'pcm16', sample_rate: OPENAI_AUDIO_SAMPLE_RATE, channels: 1 },
            },
          }));

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

                const wsInstance = wsRef.current;
                if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
                  return;
                }

                const base64 = float32ToPcm16Base64(inputData);
                wsInstance.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));

                const chunkDurationMs = (inputData.length / 16000) * 1000;
                pendingAudioMsRef.current += chunkDurationMs;
                if (pendingAudioMsRef.current >= AUDIO_COMMIT_INTERVAL_MS) {
                  flushPendingAudio();
                } else {
                  scheduleCommit();
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
              console.warn('AudioWorkletNode unavailable, falling back to ScriptProcessorNode:', error);
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
              const wsInstance = wsRef.current;
              if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
                return;
              }

              const base64 = float32ToPcm16Base64(inputData);
              wsInstance.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));

              const chunkDurationMs = (inputData.length / 16000) * 1000;
              pendingAudioMsRef.current += chunkDurationMs;
              if (pendingAudioMsRef.current >= AUDIO_COMMIT_INTERVAL_MS) {
                flushPendingAudio();
              } else {
                scheduleCommit();
              }
            };

            if (isMicActiveRef.current) {
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current.destination);
              setConnectionState(ConnectionState.LISTENING);
            }
          }
        } catch (error) {
          console.error('Failed to initialize OpenAI realtime session audio pipeline:', error);
          setConnectionState(ConnectionState.ERROR);
        }
      });

      ws.addEventListener('message', async (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'response.input_text.delta': {
              const nextInput = userTranscriptionRef.current + (data.delta ?? '');
              userTranscriptionRef.current = nextInput;
              setUserTranscription(nextInput);
              break;
            }
            case 'response.output_text.delta': {
              setConnectionState(ConnectionState.THINKING);
              const nextOutput = modelTranscriptionRef.current + (data.delta ?? '');
              modelTranscriptionRef.current = nextOutput;
              setModelTranscription(nextOutput);
              break;
            }
            case 'response.output_audio.delta': {
              if (!outputAudioContextRef.current || !data.delta) {
                break;
              }
              setConnectionState(ConnectionState.SPEAKING);
              const audioData = decodeBase64(data.delta);
              const audioBuffer = await decodePcm16ToAudioBuffer(audioData, outputAudioContextRef.current, OPENAI_AUDIO_SAMPLE_RATE, 1);
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
              break;
            }
            case 'response.output_tool_call.delta': {
              const callId = data.call_id as string;
              if (!callId) break;
              const buffer = toolCallBuffersRef.current.get(callId) ?? { name: data.name ?? '', buffer: '' };
              if (typeof data.name === 'string') {
                buffer.name = data.name;
              }
              if (data.delta?.partial_json) {
                buffer.buffer += data.delta.partial_json;
              }
              toolCallBuffersRef.current.set(callId, buffer);
              break;
            }
            case 'response.output_tool_call.completed': {
              const callId = data.call_id as string;
              if (!callId) break;
              const buffer = toolCallBuffersRef.current.get(callId);
              toolCallBuffersRef.current.delete(callId);
              if (!buffer) break;
              try {
                const parsedArgs = buffer.buffer ? JSON.parse(buffer.buffer) : {};
                handleToolCallCompleted(callId, { name: buffer.name, arguments: parsedArgs });
              } catch (error) {
                console.warn('Failed to parse tool call arguments', error);
              }
              break;
            }
            case 'response.completed': {
              clearCommitTimer();
              pendingAudioMsRef.current = 0;
              const userText = userTranscriptionRef.current.trim();
              const modelText = modelTranscriptionRef.current.trim();
              if (userText || modelText) {
                onTurnCompleteRef.current({ user: userText, model: modelText });
              }
              userTranscriptionRef.current = '';
              modelTranscriptionRef.current = '';
              setUserTranscription('');
              setModelTranscription('');
              setConnectionState(isMicActiveRef.current ? ConnectionState.LISTENING : ConnectionState.CONNECTED);
              break;
            }
            case 'error': {
              console.error('OpenAI realtime error event:', data);
              setConnectionState(ConnectionState.ERROR);
              break;
            }
            default:
              break;
          }
        } catch (error) {
          console.error('Failed to process OpenAI realtime event:', error);
        }
      });

      ws.addEventListener('close', () => {
        setConnectionState(ConnectionState.DISCONNECTED);
      });

      ws.addEventListener('error', (event) => {
        console.error('OpenAI realtime WebSocket error:', event);
        setConnectionState(ConnectionState.ERROR);
      });
    } catch (error) {
      console.error('Failed to connect to OpenAI realtime API:', error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [activeQuest, flushPendingAudio, handleToolCallCompleted, scheduleCommit, systemInstruction, voiceAccent, voiceName]);

  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Realtime connection is not ready for text messages.');
      return;
    }

    onTurnCompleteRef.current({ user: text, model: '' });
    userTranscriptionRef.current = '';

    setConnectionState(ConnectionState.THINKING);

    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }));
    ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        audio: { voice: voiceName },
      },
    }));
  }, [voiceName]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return useMemo(() => ({
    connectionState,
    userTranscription,
    modelTranscription,
    isMicActive,
    toggleMicrophone,
    sendTextMessage,
  }), [connectionState, isMicActive, modelTranscription, toggleMicrophone, sendTextMessage, userTranscription]);
};

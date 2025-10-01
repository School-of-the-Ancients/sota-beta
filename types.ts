export interface PersonaData {
  title: string;
  bio: string;
  greeting: string;
  timeframe: string;
  expertise: string;
  passion: string;
  systemInstruction: string;
  suggestedPrompts: string[];
  voiceName: string;
  voiceAccent: string;
  ambienceTag: string;
}

export interface Ambience {
  tag: string;
  description: string;
  audioSrc: string;
}

export interface Character extends PersonaData {
  id: string;
  name: string;
  portraitUrl: string;
}

export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export interface ConversationTurn {
  speaker: 'user' | 'model';
  speakerName: string;
  text: string;
  artifact?: {
    id: string;
    name: string;
    imageUrl: string;
    loading?: boolean;
  };
}

export interface Summary {
  overview: string;
  takeaways: string[];
}

export interface QuestAssessment {
  questId: string;
  questTitle: string;
  passed: boolean;
  summary: string;
  evidence: string[];
  improvements: string[];
}

export interface SavedConversation {
  id: string;
  characterId: string;
  characterName: string;
  portraitUrl: string;
  timestamp: number;
  transcript: ConversationTurn[];
  environmentImageUrl?: string;
  summary?: Summary;
  questId?: string;
  questTitle?: string;
  questAssessment?: QuestAssessment;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
  characterId: string;
  duration: string;
  focusPoints: string[];
}

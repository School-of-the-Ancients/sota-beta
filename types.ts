
export interface Ambience {
  tag: string;
  description: string;
  audioSrc: string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  portraitUrl: string;
  bio: string;
  greeting: string;
  systemInstruction: string;
  voiceName:string;
  timeframe: string;
  expertise: string;
  passion: string;
  suggestedPrompts: string[];
  ambienceTag: string;
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

export interface SavedConversation {
  id: string;
  characterId: string;
  characterName: string;
  portraitUrl: string;
  timestamp: number;
  transcript: ConversationTurn[];
  environmentImageUrl?: string;
  summary?: Summary;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
  characterId: string;
  milestones: string[];
}

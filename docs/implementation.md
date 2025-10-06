# Technical Implementation Plan: School of the Ancients Beta v2

This document outlines the engineering tasks required to implement the features detailed in the v2 Product Requirements Document.

## 1. File Structure Changes

### New Files
- `components/HowToGuide.tsx`: A new component to replace the existing `Instructions.tsx`.
- `components/QuestsView.tsx`: A new component to display and manage Learning Quests.
- `components/icons/InfoIcon.tsx`: Icon for the How-to Guide.
- `components/icons/QuestIcon.tsx`: Icon for the Quests section.
- `components/icons/MuteIcon.tsx`, `components/icons/UnmuteIcon.tsx`: Icons for ambient audio control.
- `hooks/useAmbientAudio.ts`: A custom hook to manage the playback of ambient soundscapes.
- `public/audio/`: A new directory to hold ambient audio files (e.g., `workshop.mp3`, `garden.mp3`, `forum.mp3`).

### Modified Files
- `App.tsx`: To manage new views (`quests`), state (`activeQuest`), and integrate the new `HowToGuide`.
- `ConversationView.tsx`: To integrate the `useAmbientAudio` hook, display the active quest, and trigger the conversation summary generation.
- `HistoryView.tsx`: To display the new conversation summaries.
- `hooks/useGeminiLive.ts` / `hooks/useOpenAiLive.ts`: To handle provider-specific realtime streaming while incorporating the active quest system instruction adjustments.
- `types.ts`: To add `summary` and `ambience` to `SavedConversation` and `Character` interfaces, and define the `Quest` interface.
- `constants.ts`: To define the list of available `QUESTS` and a new `AMBIENCE_LIBRARY`.
- `components/CharacterSelector.tsx`: To add buttons for accessing the `QuestsView`.
- `components/CharacterCreator.tsx`: To modify the persona generation prompt to have the AI select a suitable `ambience` tag from the library.

---

## 2. Feature Implementation Details

### 2.1. Ambient Soundscapes (AI-Selected)

1.  **Create Audio Library & Mapping:**
    -   Source 3-5 high-quality, royalty-free, looping MP3 audio files (e.g., `workshop.mp3`, `garden.mp3`, `forum.mp3`, `library.mp3`, `battle.mp3`).
    -   Place them in a new `/public/audio/` directory.
    -   In `constants.ts`, create a new exported constant `AMBIENCE_LIBRARY`. This will be an object mapping descriptive tags to file paths.
      ```typescript
      export const AMBIENCE_LIBRARY = {
        'workshop': '/audio/workshop.mp3',
        'garden': '/audio/garden.mp3',
        'forum': '/audio/forum.mp3',
        'library': '/audio/library.mp3',
        'battle': '/audio/battle.mp3',
        'default': '/audio/library.mp3',
      };
      ```
    -   In `types.ts`, add `ambienceTag: string;` to the `Character` interface.

2.  **Modify `CharacterCreator.tsx`:**
    -   Update the persona generation prompt sent to Gemini. Add a new field to the JSON schema: `ambienceTag`.
    -   The prompt instruction will be: `"ambienceTag: Based on the character's typical environment, select the most fitting keyword from this list: [Object.keys(AMBIENCE_LIBRARY).join(', ')]."`
    -   The generated `ambienceTag` will be saved as part of the new character's data.
    -   For existing, hardcoded characters in `constants.ts`, manually add an appropriate `ambienceTag` to each object.

3.  **Develop `useAmbientAudio` Hook:**
    -   Create `hooks/useAmbientAudio.ts`.
    -   The hook will manage an `HTMLAudioElement` instance.
    -   It will accept the current `character.ambienceTag` and the `environmentImageUrl` as arguments.
    -   On initial load, it plays the audio corresponding to `character.ambienceTag`.
    -   When `environmentImageUrl` changes, it will analyze the description (or a new argument passed from the `changeEnvironment` function) to select a new track from `AMBIENCE_LIBRARY`, fading between them.
    -   It will expose `toggleMute`, `isMuted` for UI control.

4.  **Integrate into `ConversationView.tsx`:**
    -   Instantiate the `useAmbientAudio` hook, passing it the necessary props.
    -   Add a new mute/unmute button to the UI controls section.

### 2.2. Conversation Summaries

1.  **Update `types.ts`:**
    -   Add an optional `summary?: string;` property to the `SavedConversation` interface.

2.  **Modify `ConversationView.tsx`:**
    -   Modify the `onEndConversation` prop to accept the final `transcript` and `environmentImageUrl`: `onEndConversation: (transcript: ConversationTurn[], environmentImageUrl: string | null) => void;`.
    -   When the "End" button is clicked, call `onEndConversation(transcript, environmentImageUrl)`.
    -   **Important:** This moves the summary generation and final save logic into `App.tsx`, creating a single source of truth and preventing race conditions.

3.  **Update `App.tsx`'s `handleEndConversation`:**
    -   Make the function `async` and accept `transcript` and `environmentImageUrl`.
    -   If `transcript.length === 0`, simply reset the state and return.
    -   If there is a transcript, make a `generateContent` API call.
        -   **Prompt:** `"Based on the following conversation transcript, provide a concise summary (2-3 sentences) followed by 3-4 key bullet points representing the main takeaways. Format the entire response as a single block of markdown text. Transcript: [insert stringified transcript]"`
    -   Get the summary text from the response.
    -   Find the current conversation in local storage. Update it with the final transcript, environment, and the new `summary`.
    -   Finally, reset the application view to the selector screen.

4.  **Update `HistoryView.tsx`:**
    -   In the detailed view, check if `selectedConversation.summary` exists.
    -   If so, render it in a styled component at the top of the view, using a markdown renderer if available or simply wrapping it in a `<pre>` tag to respect formatting.

### 2.3. Trackable Learning Goals (Quests)

1.  **Update Data Structures:**
    -   In `types.ts`, define a new interface: `export interface Quest { id: string; title: string; objective: string; description: string; characterId: string; }`. The `characterId` links a quest to a specific ancient.
    -   In `constants.ts`, create and export a new array `QUESTS: Quest[]` with 2-3 predefined quests.

2.  **State Management in `App.tsx`:**
    -   Add a new view: `'selector' | ... | 'quests'`.
    -   Add new state: `const [activeQuest, setActiveQuest] = useState<Quest | null>(null);`.
    -   Pass `activeQuest` as a prop to `ConversationView` and `CharacterSelector`.

3.  **Create `QuestsView.tsx`:**
    -   This component will display available quests.
    -   Each quest card will have a "Begin Quest" button. Clicking it will call an `onSelectQuest` function passed from `App.tsx`.
    -   `onSelectQuest` will set the `activeQuest` state, then find the associated character via `quest.characterId` and call `handleSelectCharacter` to start the conversation immediately.

4.  **Integrate Quest Logic:**
    -   In `CharacterSelector.tsx`, add a new button that switches the view to `'quests'`.
    -   Modify `hooks/useGeminiLive.ts`:
        -   The hook's signature will change to accept an optional `activeQuest: Quest | null`.
        -   Inside the `connect` function, prepend the quest objective to the `systemInstruction`:
          ```typescript
          let finalSystemInstruction = systemInstruction;
          if (activeQuest) {
            finalSystemInstruction = `YOUR CURRENT MISSION: As a mentor, your primary goal is to guide the student to understand the following: "${activeQuest.objective}". Tailor your questions and explanations to lead them towards this goal.\n\n---\n\n${systemInstruction}`;
          }
          // ... use finalSystemInstruction in the connect config
          ```
    -   In `ConversationView.tsx`, if `activeQuest` is not null, display its title in a small banner.

### 2.4. Enhanced Onboarding & How-To Guide

1.  **Create `HowToGuide.tsx`:**
    -   Build a new component to replace `Instructions.tsx`.
    -   Use a grid layout to create sections for: "1. Select an Ancient", "2. Speak Naturally", "3. Command the Environment", "4. Create Your Own".
    -   Use simple icons for each section. For commands, use a distinct style like `<kbd>Operator, take me to...</kbd>`.

2.  **Integrate into `App.tsx`:**
    -   In the `selector` view, replace `<Instructions />` with `<HowToGuide />`.
    -   The existing `Instructions` component can be removed or archived.

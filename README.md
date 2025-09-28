# School of the Ancients

**Engage in real-time, voice-driven conversations with AI-emulated historical figures and explore their worlds.**

This project is a dynamic web application that allows you to speak with legendary minds like Leonardo da Vinci, Socrates, and Cleopatra. Powered by the Google Gemini API, these AI mentors teach in their authentic style, using the Socratic method to guide you through complex topics. More than just a chatbot, this is an immersive learning environment where the AI can change the visual scenery and display artifacts on command, creating a "Matrix Operator" style experience.

![School of the Ancients Screenshot](https://raw.githubusercontent.com/School-of-the-Ancients/sota-beta/9b4eedaf1b6af2165d08bacdf8a4e506dac43e15/sota-beta.png)

---

## Core Features

*   **AI-Emulated Mentors**: Interact with a curated list of historical figures, each with a unique personality, voice, accent, and teaching style defined by sophisticated system instructions.
*   **Dynamic Voice Conversations**: Utilizes the Gemini Live API for low-latency, real-time, two-way audio conversations. The application handles audio input, transcription, and spoken audio output from the model.
*   **Socratic Dialogue**: Mentors are engineered to teach using the Socratic method. They avoid direct answers, instead asking probing questions to help you explore concepts and arrive at your own conclusions.
*   **Immersive Worlds (The "Matrix Operator")**: A key feature where the AI can dynamically change the application's background to a relevant scene. Simply ask, "**Operator, take me to the Roman Forum**," and the environment will transform.
*   **Visual Artifacts**: The AI can generate and display images of objects, diagrams, or concepts directly within the conversation. For example, asking Ada Lovelace to "**Show me a diagram of the Analytical Engine**" will produce a visual aid.
*   **Custom Character Creator**: A powerful multi-step tool that uses generative AI to allow you to create, define, and generate a portrait for any historical figure you can imagine, bringing them to life as a new mentor.
*   **Conversation History**: All conversations, including the generated transcript, artifacts, and environments, are automatically saved to your browser's local storage for later review.
*   **Fully Responsive UI**: The interface is designed to be beautiful and functional across all devices, from mobile phones to desktop monitors.

---

## How It Works

This application is built with a modern frontend stack and leverages multiple modalities of the Google Gemini API to create its interactive experience.

### Technology Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI & Generative Models**: Google Gemini API
    *   **Real-time Conversation**: `gemini-2.5-flash-native-audio-preview-09-2025` is used for the core voice-to-voice interaction, including real-time transcription and function calling.
    *   **Image Generation**: `imagen-4.0-generate-001` powers the creation of character portraits, immersive environments, and historical artifacts.
    *   **Text Generation**: `gemini-2.5-flash` is used for structured JSON generation in the Character Creator and for generating dynamic conversational prompts.

### Key Concepts

#### Function Calling

The "Matrix Operator" feature is powered by Gemini's **Function Calling** ability. The frontend code defines two functions, `changeEnvironment` and `displayArtifact`. The AI's system instructions make it aware of these tools. When a user's voice command matches the purpose of a tool, the model doesn't just respond with text; it issues a structured command to the frontend to execute the function, which then triggers an API call to generate the required image and update the UI.

#### Advanced Prompt Engineering

Each character's persona is meticulously crafted in their `systemInstruction`. This prompt guides the AI's behavior, instructing it to:
1.  Adopt a specific personality, accent, and teaching style.
2.  Adhere strictly to the Socratic method.
3.  Proactively use its `changeEnvironment` and `displayArtifact` abilities to make lessons more engaging.
4.  Periodically check the user's understanding of a topic before moving on.

---

## How to Use the Application

1.  **Select an Ancient**: Choose a character from the main screen to begin a conversation.
2.  **Grant Microphone Access**: The browser will ask for permission to use your microphone. This is required for the voice conversation.
3.  **Start Talking**: You can start the conversation by speaking, or by clicking one of the "Conversation Starter" prompts.
4.  **Explore Immersive Features**:
    *   To change the scene, try saying things like: "**Take me to your workshop**" or "**Show me the Library of Alexandria**."
    *   To see an artifact, try: "**Can you show me a sketch of your flying machine?**"
5.  **Create Your Own**: Click the "Create a New Ancient" card to launch the Character Creator and build your own AI mentor.
6.  **Review History**: Click "View Conversation History" to see all your past discussions.

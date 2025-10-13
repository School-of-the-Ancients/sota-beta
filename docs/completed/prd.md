# Product Requirements Document: School of the Ancients Beta v2

## 1. Overview

The "School of the Ancients" application has successfully proven its core concept: engaging users in voice-driven conversations with historical figures. This document outlines the next phase of development, focusing on features designed to deepen user immersion, enhance educational value, and introduce long-term engagement mechanics. We will transform the experience from a series of impressive one-off conversations into a persistent, guided, and multi-sensory learning journey.

## 2. Target Audience

*   **Students (High School & University):** Seeking an engaging and interactive supplement to traditional learning materials.
*   **Lifelong Learners:** Adults with a curiosity for history, philosophy, and science who prefer active learning over passive consumption.
*   **Educators:** Looking for innovative tools to inspire and engage their students.

## 3. Feature Set

### 3.1. Ambient Soundscapes

*   **Problem:** The current experience is visually and intellectually stimulating but audibly sterile outside of the direct conversation. This creates a disconnect between the immersive background visuals and the user's sensory experience.
*   **Goal:** To make the user feel truly "present" in the environment with the historical figure, increasing immersion and the believability of the simulation.
*   **Technical Approach:** To ensure an instantaneous, high-quality audio experience, we will use a **curated library of pre-defined, looping ambient audio tracks**. When a new character is created or an environment is changed, the Gemini API will be tasked with selecting the most appropriate audio track tag from our library based on the context. This approach provides the intelligence of AI for selection without the latency, cost, and quality-variance of on-demand audio generation.
*   **User Stories:**
    *   As a user, when I am transported to Leonardo's workshop, I want to hear the subtle sounds of crackling fire, bubbling alchemy, and sketching on parchment so I feel fully immersed in his world.
    *   As a user, when the environment changes from a bustling Roman Forum to a tranquil Chinese garden, I want the background audio to transition smoothly with it, maintaining the illusion.
*   **Requirements:**
    *   The application must play a subtle, looping ambient audio track that corresponds to the active visual environment.
    *   The audio shall transition (fade in/out) smoothly when the `changeEnvironment` function is triggered.
    *   The system must provide a user-facing control to mute/unmute the ambient audio independently of the character's voice.
    *   The default state for ambient audio will be "on."

### 3.2. Conversation Summaries & Key Takeaways

*   **Problem:** Users can have long, insightful conversations, but the key learning points can be lost in the full transcript. Reviewing the history is valuable but inefficient for study.
*   **Goal:** To reinforce learning by providing a concise, AI-generated summary of each conversation, making it easy for users to review and remember what they've learned.
*   **User Stories:**
    *   As a student, after a 20-minute discussion with Socrates about virtue, I want a bulleted list of the main arguments and conclusions so I can use it for my study notes.
    *   As a user browsing my conversation history, I want to see a "Key Takeaways" section at a glance without having to read the entire transcript.
*   **Requirements:**
    *   When a conversation is completed or saved, the system must trigger a Gemini API call to generate a summary of the transcript.
    *   The summary should be structured with a brief overview and a few key bullet points.
    *   The generated summary must be saved as part of the `SavedConversation` object in local storage.
    *   The `HistoryView` must be updated to display the summary prominently at the top of a selected conversation's transcript.

### 3.3. Trackable Learning Goals (Quests)

*   **Problem:** The user experience is currently session-based and lacks long-term direction. There is little incentive to return and continue exploring a topic in a structured way.
*   **Goal:** To introduce a sense of purpose, progression, and gamification that guides users through a curriculum, encouraging repeat engagement and deeper learning on specific subjects.
*   **User Stories:**
    *   As a user, I want to be able to select a "Quest," like "Unraveling Relativity," so the application can help guide my conversations with Einstein toward that specific goal.
    *   As a user, I want the AI character to be aware of my active quest and tailor their questions and explanations to help me achieve my objective.
    *   As a user, I want to see my active quest displayed during the conversation and feel a sense of accomplishment when I've explored the topic thoroughly.
*   **Requirements:**
    *   A new "Quests" or "Learning Paths" section will be available from the main screen.
    *   A predefined list of quests will be available (e.g., "The Foundations of Stoicism," "The Art of the Renaissance," "Mastering the Socratic Method").
    *   Users can select one active quest at a time.
    *   The active quest's objective will be dynamically injected into the character's system instructions to guide the AI's conversational strategy.
    *   The UI must display the active quest's title during a conversation.

### 3.4. Enhanced Onboarding & How-To Guide

*   **Problem:** The powerful and unique "Matrix Operator" features (changing environments and displaying artifacts) are a primary value proposition but may be missed by new users, as they are only explained in a static block of text.
*   **Goal:** To ensure every user discovers and understands the application's core interactive features through a more engaging and accessible guide.
*   **User Stories:**
    *   As a new user, I want a clear, visually appealing guide that quickly teaches me the most exciting features, like how to change the scenery.
    *   As any user, I want a quick-reference guide I can easily access if I forget the specific voice commands.
*   **Requirements:**
    *   The existing `Instructions` component will be replaced with a new, more visually engaging `HowToGuide` component.
    *   This guide will use icons and concise, step-by-step instructions for the key interactions (Speaking, Changing Scenery, Displaying Artifacts, Creating Ancients).
    *   *(Future Scope: Interactive Tutorial)* On a user's very first conversation, a "Headmaster" persona will provide a short, voice-guided tutorial, prompting the user to try their first special ability command.

## 4. Success Metrics

*   **Engagement:** Increase in the average number of conversation turns per session.
*   **Feature Adoption:** Increase in the percentage of user sessions that utilize the `changeEnvironment` or `displayArtifact` functions.
*   **Retention:** Increase in the rate of weekly returning users, measured by the adoption and completion of Learning Quests.

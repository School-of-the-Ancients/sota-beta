import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import AppShell from './components/layout/AppShell';
import CharacterCreatorRoute from './routes/CharacterCreator';
import ConversationRoute from './routes/Conversation';
import HistoryRoute from './routes/History';
import QuestCreatorRoute from './routes/QuestCreator';
import QuestDetail from './routes/QuestDetail';
import Quests from './routes/Quests';
import QuizRoute from './routes/Quiz';
import Selector from './routes/Selector';
import { AppStateProvider } from './state/AppStateContext';

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppShell>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Selector />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/quests/:questId" element={<QuestDetail />} />
          <Route path="/quest/new" element={<QuestCreatorRoute />} />
          <Route path="/quiz/:questId" element={<QuizRoute />} />
          <Route path="/conversation" element={<ConversationRoute />} />
          <Route path="/history" element={<HistoryRoute />} />
          <Route path="/character/new" element={<CharacterCreatorRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </AppStateProvider>
  );
};

export default App;

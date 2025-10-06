import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Selector from './routes/Selector';
import Quests from './routes/Quests';
import QuestDetail from './routes/QuestDetail';
import QuestCreator from './routes/QuestCreator';
import Quiz from './routes/Quiz';
import Conversation from './routes/Conversation';
import History from './routes/History';
import { AppStateProvider, useAppState } from './state/AppStateContext';

const AppRoutes: React.FC = () => {
  const { environmentImageUrl } = useAppState();

  return (
    <AppShell environmentImageUrl={environmentImageUrl}>
      <Routes>
        <Route path="/" element={<Selector />} />
        <Route path="/quests" element={<Quests />} />
        <Route path="/quests/:questId" element={<QuestDetail />} />
        <Route path="/quest/new" element={<QuestCreator />} />
        <Route path="/quiz/:questId" element={<Quiz />} />
        <Route path="/conversation" element={<Conversation />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  );
};

export default App;

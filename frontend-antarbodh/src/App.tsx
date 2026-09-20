import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ExplorePage } from './pages/ExplorePage';
import { PredictPage } from './pages/PredictPage';
import { ValidatePage } from './pages/ValidatePage';
import { MethodologyPage } from './pages/MethodologyPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/explore" replace />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="predict" element={<PredictPage />} />
          <Route path="validate" element={<ValidatePage />} />
          <Route path="methodology" element={<MethodologyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

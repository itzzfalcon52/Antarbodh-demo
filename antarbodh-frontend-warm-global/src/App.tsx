import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';

// The app pages pull in MapLibre; loading them on demand keeps it out
// of the landing page's initial download.
const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })),
);
const PredictPage = lazy(() =>
  import('./pages/PredictPage').then((m) => ({ default: m.PredictPage })),
);
const ValidatePage = lazy(() =>
  import('./pages/ValidatePage').then((m) => ({ default: m.ValidatePage })),
);
const MethodologyPage = lazy(() =>
  import('./pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage })),
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route index element={<LandingPage />} />
          <Route element={<AppShell />}>
            <Route path="explore" element={<ExplorePage />} />
            <Route path="predict" element={<PredictPage />} />
            <Route path="validate" element={<ValidatePage />} />
            <Route path="methodology" element={<MethodologyPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

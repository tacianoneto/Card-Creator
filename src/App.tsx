import { lazy, Suspense, useEffect, useState } from 'react';

import './App.css';
import type { EditorMode } from './types';
import { loadLibrary, migrateIfNeeded } from './lib/storage';

const HomeScreen = lazy(() => import('./components/HomeScreen').then((module) => ({ default: module.HomeScreen })));
const ProjectScreen = lazy(() => import('./components/ProjectScreen').then((module) => ({ default: module.ProjectScreen })));
const EditorScreen = lazy(() => import('./components/EditorScreen').then((module) => ({ default: module.EditorScreen })));

// ---------------------------------------------------------------------------
// Migration — runs synchronously before any render.
// Moves the old single-project localStorage key into the new multi-project
// system. Safe to call multiple times (no-op after first migration).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// App — thin routing shell
// ---------------------------------------------------------------------------

type Screen = 'home' | 'project' | 'editor';

interface EditorLaunchState {
  mode: EditorMode;
  initialDeckId: null | string;
  launchTemplateId: null | string;
}

export default function App() {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editorLaunch, setEditorLaunch] = useState<EditorLaunchState>({
    mode: 'manual',
    initialDeckId: null,
    launchTemplateId: null,
  });

  useEffect(() => {
    let mounted = true;
    void migrateIfNeeded().then(() => {
      if (!mounted) return;
      setActiveProjectId(loadLibrary().projects[0]?.id ?? null);
      setIsStorageReady(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!isStorageReady) {
    return <div className="app-loading" />;
  }

  const openProject = (id: string) => {
    setActiveProjectId(id);
    setScreen('project');
  };

  const goHome = () => {
    setScreen('home');
  };

  const openEditor = (options: Partial<EditorLaunchState> = {}) => {
    setEditorLaunch({
      mode: options.mode ?? 'manual',
      initialDeckId: options.initialDeckId ?? null,
      launchTemplateId: options.launchTemplateId ?? null,
    });
    setScreen('editor');
  };

  const backToProject = () => {
    setScreen('project');
  };

  if (screen === 'home') {
    return (
      <Suspense fallback={<div className="app-loading" />}>
        <HomeScreen onOpenProject={openProject} />
      </Suspense>
    );
  }

  if (!activeProjectId) {
    return (
      <Suspense fallback={<div className="app-loading" />}>
        <HomeScreen onOpenProject={openProject} />
      </Suspense>
    );
  }

  if (screen === 'project') {
    return (
      <Suspense fallback={<div className="app-loading" />}>
        <ProjectScreen
          projectId={activeProjectId}
          onGoHome={goHome}
          onOpenEditor={openEditor}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading" />}>
      <EditorScreen
        projectId={activeProjectId}
        mode={editorLaunch.mode}
        initialDeckId={editorLaunch.initialDeckId}
        launchTemplateId={editorLaunch.launchTemplateId}
        onGoHome={backToProject}
      />
    </Suspense>
  );
}

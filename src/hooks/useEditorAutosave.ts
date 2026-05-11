import { useEffect, useEffectEvent, useRef } from 'react';

import { autosaveDelayFor, queueIdleTask } from '../lib/editorTiming';
import { isStorageQuotaWarning, saveProject } from '../lib/storage';
import type { AssetFolder, CardTemplate, Deck, FontAsset, GraphicAsset } from '../types';

interface RefLike<T> {
  current: T;
}

interface UseEditorAutosaveOptions {
  assetFolders: AssetFolder[];
  decks: Deck[];
  decksRef: RefLike<Deck[]>;
  fonts: FontAsset[];
  graphics: GraphicAsset[];
  onError: (message: string) => void;
  projectDescriptionRef: RefLike<string>;
  projectId: string;
  projectNameRef: RefLike<string>;
  templates: CardTemplate[];
  templatesRef: RefLike<CardTemplate[]>;
  totalCards: number;
}

export function useEditorAutosave({
  assetFolders,
  decks,
  decksRef,
  fonts,
  graphics,
  onError,
  projectDescriptionRef,
  projectId,
  projectNameRef,
  templates,
  templatesRef,
  totalCards,
}: UseEditorAutosaveOptions) {
  const autosaveFailedRef = useRef(false);
  const notifyError = useEffectEvent(onError);

  useEffect(() => {
    let cancelIdle: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      cancelIdle = queueIdleTask(() => {
        try {
          saveProject({
            version: 1,
            id: projectId,
            name: projectNameRef.current,
            description: projectDescriptionRef.current,
            decks: decksRef.current,
            cards: [],
            graphics,
            assetFolders,
            fonts,
            templates: templatesRef.current,
          });
          autosaveFailedRef.current = false;
        } catch (error) {
          if (!autosaveFailedRef.current) {
            notifyError(
              isStorageQuotaWarning(error)
                ? error.message
                : 'Nao foi possivel salvar o projeto no navegador.',
            );
            autosaveFailedRef.current = true;
          }
        }
      });
    }, autosaveDelayFor(totalCards));

    return () => {
      window.clearTimeout(timeoutId);
      cancelIdle?.();
    };
  }, [
    decks,
    decksRef,
    graphics,
    assetFolders,
    fonts,
    templates,
    templatesRef,
    projectDescriptionRef,
    projectId,
    projectNameRef,
    totalCards,
  ]);
}

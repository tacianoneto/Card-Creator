import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

type ResizeDirection = 'left' | 'right';

export function useResizablePanel(
  initialWidth: number,
  minWidth: number,
  maxWidth: number,
  direction: ResizeDirection,
) {
  const [width, setWidth] = useState(initialWidth);

  const beginResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = direction === 'right' ? startWidth + delta : startWidth - delta;
      setWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    };

    const stopResize = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResize);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopResize);
  };

  return [width, beginResize] as const;
}

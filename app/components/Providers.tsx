'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GameProvider } from '../game/gameProvider'; // Check your relative path
import { type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <DndProvider backend={HTML5Backend}>
            <GameProvider>
                {children}
            </GameProvider>
        </DndProvider>
    );
}

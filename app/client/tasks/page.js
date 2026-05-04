'use client'

import { useState } from 'react';
import Link from 'next/link';
import WireTask from '@/app/components/tasks/WireTask';
import CardTask from '@/app/components/tasks/SwipeCard';
import AsteroidsTask from '@/app/components/tasks/AsteroidsTask';
import SequenceTask from '@/app/components/tasks/SequenceTask';
import NavigateTask from '@/app/components/tasks/NavigateTask';
import SteeringTask from '@/app/components/tasks/SteeringTask';
import ShieldsTask from '@/app/components/tasks/ShieldsTask';
import AlignEngineTask from '@/app/components/tasks/AlignEngineTask';

const taskList = [
  { value: 'Wire', label: 'Wire Task', component: <WireTask /> },
  { value: 'Card', label: 'Swipe Card', component: <CardTask /> },
  { value: 'Asteroids', label: 'Asteroids', component: <AsteroidsTask /> },
  { value: 'Reactor', label: 'Reactor Sequence', component: <SequenceTask /> },
  { value: 'Navigate', label: 'Navigation', component: <NavigateTask /> },
  { value: 'Stabilize', label: 'Stabilize Steering', component: <SteeringTask /> },
  { value: 'Shields', label: 'Prime Shields', component: <ShieldsTask /> },
  { value: 'AlignEngine', label: 'Align Engines', component: <AlignEngineTask /> },
];

export default function TaskPage() {
  const [selectedTask, setSelectedTask] = useState(taskList[0].value);
  const selected = taskList.find((task) => task.value === selectedTask);

  return (
    <div className="flex flex-col items-center h-full w-full gap-6 p-4">
      <div className="flex flex-col items-center gap-4">
        <p className="text-white text-xl font-semibold">Task Navigator</p>
        <div className="flex flex-wrap justify-center gap-3">
          {taskList.map((task) => (
            <button
              key={task.value}
              type="button"
              onClick={() => setSelectedTask(task.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${selectedTask === task.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-400 text-white hover:bg-blue-500'
                }`}
            >
              {task.label}
            </button>
          ))}
          <Link
            href="/client/qr"
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600"
          >
            Open QR Scanner
          </Link>
        </div>
      </div>

      <div className="max-w-[100vw] w-full aspect-square border-3 border-black bg-black">
        {selected?.component}
      </div>
    </div>
  );
}

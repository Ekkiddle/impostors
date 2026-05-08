'use client';

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
  { value: 'Wire', label: 'Wire Task', Component: WireTask },
  { value: 'Card', label: 'Swipe Card', Component: CardTask },
  { value: 'Asteroids', label: 'Asteroids', Component: AsteroidsTask },
  { value: 'Reactor', label: 'Reactor Sequence', Component: SequenceTask },
  { value: 'Navigate', label: 'Navigation', Component: NavigateTask },
  { value: 'Stabilize', label: 'Stabilize Steering', Component: SteeringTask },
  { value: 'Shields', label: 'Prime Shields', Component: ShieldsTask },
  { value: 'AlignEngine', label: 'Align Engines', Component: AlignEngineTask },
];

export default function TaskPage() {
  const [selectedTaskValue, setSelectedTaskValue] = useState(taskList[0]!.value);

  const taskData = taskList.find((t) => t.value === selectedTaskValue);

  // 2. Extract the component reference
  const ActiveTaskComponent = taskData?.Component;

  const handleTaskComplete = () => {
    console.log(`${selectedTaskValue} completed!`);
    // You could trigger a toast or navigate back here
  };

  return (
    <div className="flex flex-col items-center h-full w-full gap-6 p-4 font-orbitron">
      <div className="flex flex-col items-center gap-4">
        <p className="text-white text-xl font-semibold">Task Navigator</p>

        <div className="flex flex-wrap justify-center gap-3">
          {taskList.map((task) => (
            <button
              key={task.value}
              type="button"
              onClick={() => setSelectedTaskValue(task.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${selectedTaskValue === task.value
                ? 'bg-blue-600 text-white ring-2 ring-white'
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

      {/* 3. Render the dynamic component with a key to force reset on switch */}
      <div className="max-w-[100vw] w-full aspect-square border-4 border-slate-800 overflow-hidden rounded-xl shadow-2xl">
        {ActiveTaskComponent ? (
          <ActiveTaskComponent key={selectedTaskValue} onSuccess={handleTaskComplete} />
        ) : (
          <div className="text-white flex items-center justify-center h-full">Select a task</div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, type ChangeEvent } from 'react';
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
  const ActiveTaskComponent = taskData?.Component;

  const handleTaskComplete = () => {
    console.log(`${selectedTaskValue} completed!`);
  };

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedTaskValue(e.target.value);
  };

  return (
    <div className="flex flex-col items-center h-full w-full gap-6 p-4 font-orbitron">
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <p className="text-white text-xl font-semibold tracking-widest">TASK NAVIGATOR</p>

        <div className="flex w-full gap-3">
          {/* Custom Styled Dropdown */}
          <select
            value={selectedTaskValue}
            onChange={handleSelectChange}
            className="flex-1 rounded-lg bg-blue-900 border-2 border-blue-400 px-4 py-2 text-sm font-medium text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-300 appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
          >
            {taskList.map((task) => (
              <option key={task.value} value={task.value} className="bg-slate-900 text-white">
                {task.label}
              </option>
            ))}
          </select>

          <Link
            href="/client/qr"
            className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 border-2 border-green-400"
          >
            QR
          </Link>
        </div>
      </div>

      {/* Task Viewport */}
      <div className="max-w-[100vw] w-full aspect-square border-4 border-blue-500/30 overflow-hidden rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] ">
        {ActiveTaskComponent ? (
          <ActiveTaskComponent key={selectedTaskValue} onSuccess={handleTaskComplete} />
        ) : (
          <div className="text-white flex items-center justify-center h-full">Select a task</div>
        )}
      </div>
    </div>
  );
}

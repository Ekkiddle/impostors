import type React from "react";
import AlignEngineTask from "../components/tasks/AlignEngineTask";
import AsteroidsTask from "../components/tasks/AsteroidsTask";
import NavigateTask from "../components/tasks/NavigateTask";
import SequenceTask from "../components/tasks/SequenceTask";
import ShieldsTask from "../components/tasks/ShieldsTask";
import SteeringTask from "../components/tasks/SteeringTask";
import CardTask from "../components/tasks/SwipeCard";
import WireTask from "../components/tasks/WireTask";
import FuelEnginesTask from "../components/tasks/FuelEnginesTask";

export type TaskSize = 'common' | 'small' | 'medium' | 'large';

export interface TaskWorkflow {
    sequence: readonly string[];
}

export interface SubTaskDefinition {
    key: string;
    label?: string;
}

export interface TaskDefinition {
    task_component: React.ComponentType<any> | null;
    number_of_tasks: number;
    total_value: number;
    task_size: TaskSize;
    label?: string;
    subtasks?: readonly SubTaskDefinition[];
    workflow?: TaskWorkflow;
}

export const TASK_DEFINITIONS: { [key: string]: TaskDefinition } = {
    "ALIGN_ENGINE": {
        task_component: AlignEngineTask,
        number_of_tasks: 2,
        total_value: 2,
        task_size: 'medium',
        label: "Align Engine"
    },
    "ASTEROIDS": {
        task_component: AsteroidsTask,
        number_of_tasks: 1,
        total_value: 3,
        task_size: 'large',
        label: "Clear Asteroids"
    },
    "FUEL_ENGINES": {
        task_component: FuelEnginesTask,
        number_of_tasks: 4,
        total_value: 4,
        task_size: 'large',
        label: "Refuel Engines",
        subtasks: [{ "key": "COLLECT", "label": "Collect Fuel" }, { "key": "DEPOSIT", "label": "Deposit Fuel" }],
        workflow: {
            sequence: ["COLLECT", "DEPOSIT", "COLLECT", "DEPOSIT"]
        }
    },
    "NAVIGATION": {
        task_component: NavigateTask,
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'small',
        label: "Calibrate Navigation"
    },
    "REACTOR": {
        task_component: SequenceTask,
        number_of_tasks: 1,
        total_value: 3,
        task_size: 'large',
        label: "Start Reactor"
    },
    "SHIELDS": {
        task_component: ShieldsTask,
        number_of_tasks: 2,
        total_value: 2,
        task_size: 'medium',
        label: "Recharge Shields"
    },
    "STEERING": {
        task_component: SteeringTask,
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'small',
        label: "Stabilize Steering"
    },
    "SWIPE_CARD": {
        task_component: CardTask,
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'common',
        label: "Swipe Card"
    },
    "WIRES": {
        task_component: WireTask,
        number_of_tasks: 3,
        total_value: 3,
        task_size: 'common',
        label: "Fix Wiring"
    },
};

export const SABOTAGE_TASK_DEFINITIONS: { [key: string]: TaskDefinition } = {};

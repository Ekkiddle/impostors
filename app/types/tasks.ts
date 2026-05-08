export type TaskType = 'POOL' | 'SEQUENCE';
export type TaskSize = 'common' | 'small' | 'medium' | 'large';

export interface TaskDefinition {
    type: TaskType;
    number_of_tasks: number;
    total_value: number;
    task_size: TaskSize;
    label?: string;
    subtasks?: { label: string; value: TaskDefinition }[];
}

export const TASK_DEFINITIONS: { [key: string]: TaskDefinition } = {
    "ALIGN_ENGINE": {
        type: "POOL",
        number_of_tasks: 2,
        total_value: 2,
        task_size: 'medium',
        label: "Align Engine"
    },
    "ASTEROIDS": {
        type: "POOL",
        number_of_tasks: 1,
        total_value: 3,
        task_size: 'large',
        label: "Clear Asteroids"
    },
    "NAVIGATION": {
        type: "POOL",
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'small',
        label: "Calibrate Navigation"
    },
    "REACTOR": {
        type: "POOL",
        number_of_tasks: 1,
        total_value: 3,
        task_size: 'large',
        label: "Start Reactor"
    },
    "SHIELDS": {
        type: "POOL",
        number_of_tasks: 2,
        total_value: 2,
        task_size: 'medium',
        label: "Recharge Shields"
    },
    "STEERING": {
        type: "POOL",
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'small',
        label: "Stabilize Steering"
    },
    "SWIPE_CARD": {
        type: "POOL",
        number_of_tasks: 1,
        total_value: 1,
        task_size: 'common',
        label: "Swipe Card"
    },
    "WIRES": {
        type: "POOL",
        number_of_tasks: 3,
        total_value: 3,
        task_size: 'common',
        label: "Fix Wiring"
    },
}

export const SABOTAGE_TASK_DEFINITIONS: { [key: string]: TaskDefinition } = {
}
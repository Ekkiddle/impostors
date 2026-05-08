export type TaskType = 'POOL' | 'SEQUENCE';
export type TaskSize = 'common' | 'small' | 'large';

export interface TaskDefinition {
    type: TaskType;
    number_of_tasks: number;
    value_per_task: number;
    task_size: TaskSize;
    label?: string;
}

export const TASK_DEFINITIONS = {
    "WIRES": {
        type: "POOL",
        number_of_tasks: 3,
        value_per_task: 1,
        task_size: 'small',
        label: "Fix Wiring"
    }
}
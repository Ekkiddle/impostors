import type { MapTask, PlayerMapTask, PlayerTask } from '../types/databaseTypes';
import { TASK_DEFINITIONS } from '../types/tasks';

export interface PlayerTaskProgress {
  taskType: string;
  label: string;
  completed: number;
  total: number;
}

class GameTaskManager {
  buildPlayerMapTasks(
    playerTasks: PlayerTask[],
    mapTasks: Record<string, MapTask>
  ): PlayerMapTask[] {
    return playerTasks.flatMap((playerTask) => {
      const mapTask = mapTasks[playerTask.task_id];
      if (!mapTask) return [];

      return [{
        ...playerTask,
        map_location: mapTask.map_location,
        task_type: mapTask.task_type,
        sub_task_type: mapTask.sub_task_type,
      }];
    });
  }

  updateReadiness(tasks: PlayerMapTask[]): PlayerMapTask[] {
    const tasksByType = new Map<string, PlayerMapTask[]>();
    for (const task of tasks) {
      const group = tasksByType.get(task.task_type) ?? [];
      group.push(task);
      tasksByType.set(task.task_type, group);
    }

    return tasks.map((task) => {
      const definition = TASK_DEFINITIONS[task.task_type];
      const workflow = definition?.workflow?.sequence;
      if (!workflow) return { ...task, ready: !task.completed };

      const completedCount = tasksByType.get(task.task_type)?.filter(item => item.completed).length ?? 0;
      const currentSubTask = workflow[completedCount];
      return {
        ...task,
        ready: !task.completed && task.sub_task_type === currentSubTask,
      };
    });
  }

  getReadyTask(tasks: PlayerMapTask[], taskId: string): PlayerMapTask | null {
    return tasks.find(task => task.task_id === taskId && task.ready && !task.completed) ?? null;
  }

  getProgress(tasks: PlayerMapTask[]): PlayerTaskProgress[] {
    const groups = new Map<string, PlayerMapTask[]>();
    for (const task of tasks) {
      const group = groups.get(task.task_type) ?? [];
      group.push(task);
      groups.set(task.task_type, group);
    }

    return Array.from(groups, ([taskType, taskGroup]) => ({
      taskType,
      label: TASK_DEFINITIONS[taskType]?.label ?? taskType,
      completed: taskGroup.filter(task => task.completed).length,
      total: taskGroup.length,
    }));
  }
}

export default GameTaskManager;

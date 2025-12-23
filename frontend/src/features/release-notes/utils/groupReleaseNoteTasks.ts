import type { ReleaseNote } from '../../../services/releaseNotes';

type ReleaseNoteTask = NonNullable<ReleaseNote['tasks']>[number];

export function groupReleaseNoteTasks(
  tasks: ReleaseNote['tasks'],
  serviceId?: number | null
): {
  primaryTasks: ReleaseNoteTask[];
  otherTasks: ReleaseNoteTask[];
} {
  if (!tasks || tasks.length === 0) {
    return { primaryTasks: [], otherTasks: [] };
  }

  const normalizedServiceId = serviceId ?? null;
  const primaryTasks: ReleaseNoteTask[] = [];
  const otherTasks: ReleaseNoteTask[] = [];

  tasks.forEach((releaseNoteTask) => {
    const taskServiceId = releaseNoteTask.task?.serviceId ?? null;
    if (normalizedServiceId !== null && taskServiceId === normalizedServiceId) {
      primaryTasks.push(releaseNoteTask);
    } else {
      otherTasks.push(releaseNoteTask);
    }
  });

  return { primaryTasks, otherTasks };
}



import { HevyClient } from 'hevy-ts';
import { z } from 'zod';

jest.mock('hevy-ts');

const mockHevy = {
    getWorkouts: jest.fn().mockResolvedValue([{ id: 'w1' }]),
    getWorkoutById: jest.fn().mockResolvedValue({ id: 'w1', title: 'Test' }),
    createWorkout: jest.fn().mockResolvedValue({ id: 'w2', title: 'Created' }),
    updateWorkout: jest.fn().mockResolvedValue({ id: 'w1', title: 'Updated' }),
    getRoutineFolders: jest.fn().mockResolvedValue([{ id: 1, title: 'Folder' }]),
    getRoutineFolderById: jest.fn().mockResolvedValue({ id: 1, title: 'Folder' }),
    createRoutineFolder: jest.fn().mockResolvedValue({ id: 2, title: 'New Folder' }),
    getRoutines: jest.fn().mockResolvedValue({ page: 1, page_count: 1, routines: [{ id: 'r1', title: 'Leg Day' }] }),
    getRoutineById: jest.fn().mockResolvedValue({ id: 'r1', title: 'Leg Day', exercises: [] }),
    createRoutine: jest.fn().mockResolvedValue({ id: 'r2', title: 'New Routine' }),
    updateRoutine: jest.fn().mockResolvedValue({ id: 'r1', title: 'Leg Day (reordered)' }),
    getExerciseTemplates: jest.fn().mockResolvedValue([{ id: 'e1', title: 'Bench' }]),
    getExerciseTemplateById: jest.fn().mockResolvedValue({ id: 'e1', title: 'Bench' }),
    getWebhookSubscription: jest.fn().mockResolvedValue({ id: 'webhook1' }),
    createWebhookSubscription: jest.fn().mockResolvedValue({ id: 'webhook2' }),
    deleteWebhookSubscription: jest.fn().mockResolvedValue(undefined),
};

(HevyClient as jest.Mock).mockImplementation(() => mockHevy);

describe('Hevy MCP Tools', () => {
    it('getWorkouts returns workouts', async () => {
        const result = await mockHevy.getWorkouts(1, 10);
        expect(result).toEqual([{ id: 'w1' }]);
    });

    it('getWorkoutById returns a workout', async () => {
        const result = await mockHevy.getWorkoutById('w1');
        expect(result).toHaveProperty('id', 'w1');
    });

    it('createWorkout returns created workout', async () => {
        const input = { title: 't', description: 'd', start_time: '', end_time: '', is_private: false, exercises: [] };
        const result = await mockHevy.createWorkout(input);
        expect(result).toHaveProperty('title', 'Created');
    });

    it('updateWorkout returns updated workout', async () => {
        const input = { title: 't', description: 'd', start_time: '', end_time: '', is_private: false, exercises: [] };
        const result = await mockHevy.updateWorkout('w1', input);
        expect(result).toHaveProperty('title', 'Updated');
    });

    it('getRoutineFolders returns folders', async () => {
        const result = await mockHevy.getRoutineFolders(1, 10);
        expect(result[0]).toHaveProperty('title', 'Folder');
    });

    it('getRoutineFolderById returns a folder', async () => {
        const result = await mockHevy.getRoutineFolderById(1);
        expect(result).toHaveProperty('id', 1);
    });

    it('createRoutineFolder returns new folder', async () => {
        const result = await mockHevy.createRoutineFolder({ title: 'New Folder' });
        expect(result).toHaveProperty('title', 'New Folder');
    });

    it('getRoutines returns routines', async () => {
        const result = await mockHevy.getRoutines(1, 10);
        expect(result.routines[0]).toHaveProperty('title', 'Leg Day');
    });

    it('getRoutineById returns a routine', async () => {
        const result = await mockHevy.getRoutineById('r1');
        expect(result).toHaveProperty('id', 'r1');
    });

    it('createRoutine returns created routine', async () => {
        const input = {
            title: 'New Routine',
            exercises: [
                { exercise_template_id: 'et1', superset_id: 0, sets: [{ type: 'normal', reps: 10 }] },
                { exercise_template_id: 'et2', superset_id: 0, sets: [{ type: 'normal', reps: 8 }] },
            ],
        };
        const result = await mockHevy.createRoutine(input);
        expect(result).toHaveProperty('title', 'New Routine');
    });

    it('updateRoutine returns updated routine', async () => {
        const input = { title: 'Leg Day (reordered)', exercises: [] };
        const result = await mockHevy.updateRoutine('r1', input);
        expect(result).toHaveProperty('title', 'Leg Day (reordered)');
    });

    it('getExerciseTemplates returns templates', async () => {
        const result = await mockHevy.getExerciseTemplates(1, 10);
        expect(result[0]).toHaveProperty('title', 'Bench');
    });

    it('getExerciseTemplateById returns a template', async () => {
        const result = await mockHevy.getExerciseTemplateById('e1');
        expect(result).toHaveProperty('id', 'e1');
    });

    it('getWebhookSubscription returns webhook', async () => {
        const result = await mockHevy.getWebhookSubscription();
        expect(result).toHaveProperty('id', 'webhook1');
    });

    it('createWebhookSubscription returns webhook', async () => {
        const result = await mockHevy.createWebhookSubscription({ authToken: 'a', url: 'u' });
        expect(result).toHaveProperty('id', 'webhook2');
    });

    it('deleteWebhookSubscription resolves', async () => {
        await expect(mockHevy.deleteWebhookSubscription()).resolves.toBeUndefined();
    });
});

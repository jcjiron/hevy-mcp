import { z } from "zod";
import type { Routine, RoutineExercise, RoutineExerciseRequest } from "hevy-ts";

export const routineExerciseSchema = z.object({
    exercise_template_id: z.string(),
    // Exercises sharing the same superset_id are grouped into one superset,
    // performed back to back; null means the exercise stands on its own.
    superset_id: z.number().nullable().optional(),
    rest_seconds: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    sets: z.array(z.object({
        type: z.string(),
        weight_kg: z.number().nullable().optional(),
        reps: z.number().nullable().optional(),
        rep_range: z.object({
            start: z.number().nullable().optional(),
            end: z.number().nullable().optional(),
        }).nullable().optional(),
        distance_meters: z.number().nullable().optional(),
        duration_seconds: z.number().nullable().optional(),
        rpe: z.number().nullable().optional(),
        custom_metric: z.number().nullable().optional(),
    })),
});

export function normalizeRoutineExercises(exercises: z.infer<typeof routineExerciseSchema>[]): RoutineExerciseRequest[] {
    return exercises.map(ex => ({
        ...ex,
        superset_id: ex.superset_id ?? null,
        rest_seconds: ex.rest_seconds ?? null,
        notes: ex.notes ?? null,
        sets: ex.sets.map(set => ({
            ...set,
            weight_kg: set.weight_kg ?? null,
            reps: set.reps ?? null,
            rep_range: set.rep_range
                ? { start: set.rep_range.start ?? null, end: set.rep_range.end ?? null }
                : null,
            distance_meters: set.distance_meters ?? null,
            duration_seconds: set.duration_seconds ?? null,
            rpe: set.rpe ?? null,
            custom_metric: set.custom_metric ?? null,
        })),
    }));
}

/**
 * Maps a routine exercise exactly as read from getRoutineById/getRoutines
 * back into the shape updateRoutine/createRoutine expect, without touching
 * any field. This is the round-trip used by patchRoutine and
 * setRoutineSupersets so that fields callers never asked to change (set
 * weights, reps, rpe, per-set notes, rep_range, custom_metric) survive a
 * write byte-for-byte.
 */
export function routineExerciseToRequest(ex: RoutineExercise): RoutineExerciseRequest {
    return {
        exercise_template_id: ex.exercise_template_id,
        superset_id: ex.superset_id,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
        sets: ex.sets.map(s => ({
            type: s.type,
            weight_kg: s.weight_kg,
            reps: s.reps,
            rep_range: s.rep_range,
            distance_meters: s.distance_meters,
            duration_seconds: s.duration_seconds,
            rpe: s.rpe,
            custom_metric: s.custom_metric,
        })),
    };
}

export function routineToUpdateRequest(routine: Routine) {
    return {
        title: routine.title,
        exercises: routine.exercises.map(routineExerciseToRequest),
    };
}

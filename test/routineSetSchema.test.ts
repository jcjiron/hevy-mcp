import type { Routine } from "hevy-ts";
import { normalizeRoutineExercises, routineExerciseToRequest } from "../src/lib/routineSchema";

// BUG-4 regression: POST/PUT /v1/routines reject unrecognized keys with a
// 400 ("Unrecognized key(s) in object: 'rpe'"). createRoutine's builder
// used to spread the (zod-validated) input, which put rep_range/rpe on
// every set as explicit `null` - a key npm/JSON.stringify never drops,
// unlike `undefined`. That 400 fired once per set (27 times on a real
// 9-exercise routine) and aborted the whole write.
//
// These assert on the exact key set of the built request, not on values -
// a value-only assertion would have passed even with the bug (null is a
// value), which is exactly why the original tests didn't catch this.
const ALLOWED_SET_KEYS = ["type", "weight_kg", "reps", "distance_meters", "duration_seconds", "custom_metric"].sort();

describe("routine set request builders never include rep_range/rpe (BUG-4)", () => {
    it("normalizeRoutineExercises (createRoutine/updateRoutine's builder) only emits allowlisted set keys", () => {
        const [exercise] = normalizeRoutineExercises([
            {
                exercise_template_id: "79D0BB3A",
                superset_id: 0,
                rest_seconds: 0,
                sets: [
                    { type: "normal", weight_kg: 40.82336184920758, reps: 12 },
                    { type: "normal", weight_kg: 45.35929094356398, reps: 10 },
                ],
            },
        ]);
        for (const set of exercise.sets) {
            expect(Object.keys(set).sort()).toEqual(ALLOWED_SET_KEYS);
        }
    });

    it("routineExerciseToRequest (patchRoutine/setRoutineSupersets/importRoutines' round-trip builder) only emits allowlisted set keys", () => {
        const routine: Routine = {
            id: "r1",
            title: "Push Day",
            folder_id: null,
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
            exercises: [
                {
                    index: 0,
                    title: "Bench Press (Barbell)",
                    rest_seconds: 0,
                    notes: "",
                    exercise_template_id: "79D0BB3A",
                    superset_id: 0,
                    sets: [
                        { index: 0, type: "normal", weight_kg: 60.5, reps: 8, distance_meters: null, duration_seconds: null, custom_metric: null },
                    ],
                },
            ],
        };
        const request = routineExerciseToRequest(routine.exercises[0]);
        for (const set of request.sets) {
            expect(Object.keys(set).sort()).toEqual(ALLOWED_SET_KEYS);
        }
    });
});

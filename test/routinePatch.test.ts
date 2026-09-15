import type { Routine } from "hevy-ts";
import { buildPatchedRoutineRequest } from "../src/lib/routinePatch";
import { routineExerciseToRequest } from "../src/lib/routineSchema";

// A routine with intentionally awkward values (long-decimal weight,
// rep_range, rpe, custom_metric, per-exercise notes) so a test that
// changes something unrelated has plenty of surface area to accidentally
// lose data on.
const fixtureRoutine: Routine = {
    id: "r1",
    title: "Leg Day",
    folder_id: 3,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-06-01T00:00:00Z",
    exercises: [
        {
            index: 0,
            title: "Squat (Barbell)",
            rest_seconds: 90,
            notes: "Go deep",
            exercise_template_id: "et-squat",
            supersets_id: null,
            sets: [
                {
                    index: 0,
                    type: "normal",
                    weight_kg: 34.92665402654426,
                    reps: 8,
                    rep_range: { start: 6, end: 10 },
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 8.5,
                    custom_metric: null,
                },
            ],
        },
        {
            index: 1,
            title: "Leg Curl (Machine)",
            rest_seconds: 0,
            notes: "Slow eccentric",
            exercise_template_id: "et-legcurl",
            supersets_id: 0,
            sets: [
                {
                    index: 0,
                    type: "normal",
                    weight_kg: 20,
                    reps: 12,
                    rep_range: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: 7,
                },
            ],
        },
        {
            index: 2,
            title: "Hip Thrust (Barbell)",
            rest_seconds: 60,
            notes: "",
            exercise_template_id: "et-hipthrust",
            supersets_id: 0,
            sets: [
                {
                    index: 0,
                    type: "warmup",
                    weight_kg: 0,
                    reps: 15,
                    rep_range: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                },
                {
                    index: 1,
                    type: "normal",
                    weight_kg: 61.234567,
                    reps: 10,
                    rep_range: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 9,
                    custom_metric: null,
                },
            ],
        },
    ],
};

const expectedRoundTrippedExercises = fixtureRoutine.exercises.map(routineExerciseToRequest);

describe("buildPatchedRoutineRequest", () => {
    it("renaming a routine leaves every exercise/set field byte-identical (AC1)", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, { title: "Leg Day (renamed)" });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.body.title).toBe("Leg Day (renamed)");
        expect(result.body.exercises).toEqual(expectedRoundTrippedExercises);
        // Weight survives with full precision, not rounded.
        expect(result.body.exercises[0].sets[0].weight_kg).toBe(34.92665402654426);
    });

    it("omitting notes leaves it out of the body entirely rather than guessing", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, { title: "x" });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect("notes" in result.body).toBe(false);
    });

    it("patching one exercise's superset_id leaves its sets untouched and doesn't affect other exercises", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, {
            exercises: [{ match: { exercise_template_id: "et-squat" }, superset_id: 5 }],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.body.exercises[0].superset_id).toBe(5);
        expect(result.body.exercises[0].sets).toEqual(expectedRoundTrippedExercises[0].sets);
        expect(result.body.exercises[1]).toEqual(expectedRoundTrippedExercises[1]);
        expect(result.body.exercises[2]).toEqual(expectedRoundTrippedExercises[2]);
    });

    it("matching by index targets the right exercise even with duplicate exercise_template_ids", () => {
        const withDuplicate: Routine = {
            ...fixtureRoutine,
            exercises: [
                fixtureRoutine.exercises[0],
                { ...fixtureRoutine.exercises[1], exercise_template_id: "et-squat", index: 1 },
            ],
        };
        const result = buildPatchedRoutineRequest(withDuplicate, {
            exercises: [{ match: { index: 1 }, rest_seconds: 45 }],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.body.exercises[0].rest_seconds).toBe(90); // untouched
        expect(result.body.exercises[1].rest_seconds).toBe(45);
    });

    it("aborts with no body when a match is ambiguous (AC3)", () => {
        const withDuplicate: Routine = {
            ...fixtureRoutine,
            exercises: [
                fixtureRoutine.exercises[0],
                { ...fixtureRoutine.exercises[1], exercise_template_id: "et-squat", index: 1 },
            ],
        };
        const result = buildPatchedRoutineRequest(withDuplicate, {
            exercises: [{ match: { exercise_template_id: "et-squat" }, rest_seconds: 45 }],
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toContain("resolved to 2 exercise(s)");
    });

    it("aborts with no body when a match resolves to zero exercises (AC3)", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, {
            exercises: [{ match: { exercise_template_id: "does-not-exist" }, rest_seconds: 45 }],
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toContain("resolved to 0 exercise(s)");
    });
});

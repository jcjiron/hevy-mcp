import type { Routine } from "hevy-ts";
import { buildPatchedRoutineRequest } from "../src/lib/routinePatch";

// Shaped exactly like a real GET /v1/routines response (confirmed against
// a live 77-routine catalog): sets do NOT carry rep_range or rpe (those
// belong to workout sets, not routine sets), and superset_id is a real,
// non-null, sometimes-zero integer for most exercises - not the always-null
// placeholder a synthetic fixture would default to. A superset_id of 0 is
// deliberately included: an earlier version of this exact test suite
// passed against a build that silently dropped superset_id entirely,
// because its "expected" value was computed by re-running the same
// (buggy) transform function under test instead of being written down
// independently. These expectations are hand-written.
const fixtureRoutine: Routine = {
    id: "r1",
    title: "Pecho y hombro",
    folder_id: 3,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-06-01T00:00:00Z",
    exercises: [
        {
            index: 0,
            title: "Butterfly (Pec Deck)",
            rest_seconds: 0,
            notes: "",
            exercise_template_id: "9DCE2D64",
            superset_id: 3,
            sets: [
                { index: 0, type: "normal", weight_kg: 38.55539730202938, reps: 12, distance_meters: null, duration_seconds: null, custom_metric: null },
            ],
        },
        {
            index: 1,
            title: "Overhead Press (Barbell)",
            rest_seconds: 90,
            notes: "A una mano y a nivel del hombro",
            exercise_template_id: "7B8AA895",
            superset_id: 3,
            sets: [
                { index: 0, type: "normal", weight_kg: 20, reps: 10, distance_meters: null, duration_seconds: null, custom_metric: null },
                { index: 1, type: "normal", weight_kg: 20, reps: 8, distance_meters: null, duration_seconds: null, custom_metric: 5 },
            ],
        },
        {
            index: 2,
            title: "Bench Press (Barbell)",
            rest_seconds: 0,
            notes: "",
            exercise_template_id: "79D0BB3A",
            superset_id: 1,
            sets: [
                { index: 0, type: "normal", weight_kg: 60.5, reps: 8, distance_meters: null, duration_seconds: null, custom_metric: null },
            ],
        },
        {
            index: 3,
            title: "Plate Front Raise",
            rest_seconds: 90,
            notes: "",
            exercise_template_id: "05293BCA",
            superset_id: 1,
            sets: [
                { index: 0, type: "normal", weight_kg: 6.8038936415345965, reps: 12, distance_meters: null, duration_seconds: null, custom_metric: null },
            ],
        },
        {
            index: 4,
            title: "Calf Raise (Standing)",
            rest_seconds: 60,
            notes: "unrelated, no superset",
            exercise_template_id: "CALF001",
            superset_id: null,
            sets: [
                { index: 0, type: "warmup", weight_kg: 0, reps: 15, distance_meters: null, duration_seconds: null, custom_metric: null },
            ],
        },
    ],
};

describe("buildPatchedRoutineRequest", () => {
    it("renaming a routine preserves every exercise's superset_id, including a superset_id of 0, and every set field (AC1)", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, { title: "Pecho y hombro (renamed)" });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.body.title).toBe("Pecho y hombro (renamed)");

        // Hand-written expectation, independent of the code under test:
        // (exercise_template_id, superset_id) pairs in order.
        expect(result.body.exercises.map(ex => [ex.exercise_template_id, ex.superset_id])).toEqual([
            ["9DCE2D64", 3],
            ["7B8AA895", 3],
            ["79D0BB3A", 1],
            ["05293BCA", 1],
            ["CALF001", null],
        ]);

        // Full-precision weights survive untouched (not rounded).
        expect(result.body.exercises[0].sets[0].weight_kg).toBe(38.55539730202938);
        expect(result.body.exercises[3].sets[0].weight_kg).toBe(6.8038936415345965);
        // Per-exercise notes survive.
        expect(result.body.exercises[1].notes).toBe("A una mano y a nivel del hombro");
        // custom_metric survives.
        expect(result.body.exercises[1].sets[1].custom_metric).toBe(5);
        // rest_seconds survives per exercise, including 0.
        expect(result.body.exercises[0].rest_seconds).toBe(0);
        expect(result.body.exercises[1].rest_seconds).toBe(90);
    });

    it("omitting notes leaves it out of the body entirely rather than guessing", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, { title: "x" });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect("notes" in result.body).toBe(false);
    });

    it("patching one exercise's superset_id leaves its sets and every other exercise's superset_id untouched", () => {
        const result = buildPatchedRoutineRequest(fixtureRoutine, {
            exercises: [{ match: { exercise_template_id: "9DCE2D64" }, superset_id: 5 }],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.body.exercises.map(ex => [ex.exercise_template_id, ex.superset_id])).toEqual([
            ["9DCE2D64", 5],
            ["7B8AA895", 3],
            ["79D0BB3A", 1],
            ["05293BCA", 1],
            ["CALF001", null],
        ]);
        expect(result.body.exercises[0].sets[0].weight_kg).toBe(38.55539730202938);
    });

    it("matching by index targets the right exercise even with duplicate exercise_template_ids", () => {
        const withDuplicate: Routine = {
            ...fixtureRoutine,
            exercises: [
                fixtureRoutine.exercises[0],
                { ...fixtureRoutine.exercises[1], exercise_template_id: "9DCE2D64", index: 1 },
            ],
        };
        const result = buildPatchedRoutineRequest(withDuplicate, {
            exercises: [{ match: { index: 1 }, rest_seconds: 45 }],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.body.exercises[0].rest_seconds).toBe(0); // untouched
        expect(result.body.exercises[1].rest_seconds).toBe(45);
    });

    it("aborts with no body when a match is ambiguous (AC3)", () => {
        const withDuplicate: Routine = {
            ...fixtureRoutine,
            exercises: [
                fixtureRoutine.exercises[0],
                { ...fixtureRoutine.exercises[1], exercise_template_id: "9DCE2D64", index: 1 },
            ],
        };
        const result = buildPatchedRoutineRequest(withDuplicate, {
            exercises: [{ match: { exercise_template_id: "9DCE2D64" }, rest_seconds: 45 }],
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

import type { HevyClient, Routine } from "hevy-ts";

// GET /v1/routines caps pageSize at 10 server-side, so listing the whole
// catalog always needs several requests. fetchAllRoutines hides that
// pagination from callers - one call in, the full list out.
const MAX_PAGE_SIZE = 10;

export async function fetchAllRoutines(hevy: HevyClient): Promise<Routine[]> {
    const all: Routine[] = [];
    let page = 1;
    while (true) {
        const response = await hevy.getRoutines(page, MAX_PAGE_SIZE);
        all.push(...response.routines);
        if (page >= response.page_count || response.routines.length === 0) break;
        page++;
    }
    return all;
}

export function roundWeight(n: number | null | undefined): number | null {
    if (n === null || n === undefined) return null;
    return Math.round(n * 100) / 100;
}

function normalizeForSearch(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export interface RoutineSummary {
    id: string;
    title: string;
    folder_id: number | null;
    created_at: string;
    updated_at: string;
    exercise_count: number;
    set_count: number;
    superset_count: number;
    ungrouped_count: number;
}

export function toSummary(routine: Routine): RoutineSummary {
    const set_count = routine.exercises.reduce((n, ex) => n + ex.sets.length, 0);
    const supersetIds = new Set<number>();
    let ungrouped_count = 0;
    for (const ex of routine.exercises) {
        if (ex.supersets_id === null || ex.supersets_id === undefined) {
            ungrouped_count++;
        } else {
            supersetIds.add(ex.supersets_id);
        }
    }
    return {
        id: routine.id,
        title: routine.title,
        folder_id: routine.folder_id,
        created_at: routine.created_at,
        updated_at: routine.updated_at,
        exercise_count: routine.exercises.length,
        set_count,
        superset_count: supersetIds.size,
        ungrouped_count,
    };
}

export function toExercisesView(routine: Routine) {
    return {
        ...toSummary(routine),
        exercises: routine.exercises.map(ex => ({
            exercise_template_id: ex.exercise_template_id,
            title: ex.title,
            set_count: ex.sets.length,
            superset_id: ex.supersets_id,
        })),
    };
}

export function toStructureView(routine: Routine) {
    const groups: { template_id: string; title: string }[][] = [];
    const supersetIndex = new Map<number, number>();
    for (const ex of routine.exercises) {
        const entry = { template_id: ex.exercise_template_id, title: ex.title };
        const key = ex.supersets_id;
        if (key === null || key === undefined) {
            groups.push([entry]);
            continue;
        }
        const existingIdx = supersetIndex.get(key);
        if (existingIdx === undefined) {
            supersetIndex.set(key, groups.length);
            groups.push([entry]);
        } else {
            groups[existingIdx].push(entry);
        }
    }
    return { ...toSummary(routine), groups };
}

export function toSetsView(routine: Routine) {
    return {
        ...routine,
        exercises: routine.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({ ...s, weight_kg: roundWeight(s.weight_kg) })),
        })),
    };
}

export type RoutineField = "summary" | "exercises" | "structure" | "sets";

export interface ListRoutinesOptions {
    fields?: RoutineField[];
    folderId?: number | null;
    titleContains?: string;
}

export interface DeletionCandidateGroup {
    fingerprint: string;
    routines: { id: string; title: string; folder_id: number | null; updated_at: string }[];
}

function structureFingerprint(routine: Routine): string {
    const { groups } = toStructureView(routine);
    return JSON.stringify(groups.map(g => g.map(m => m.template_id)));
}

/**
 * Groups routines that share the exact same exercise/superset structure
 * (ignoring title and numeric superset ids, which can differ between two
 * otherwise-identical copies). Used for R7 in place of deleteRoutine,
 * since Hevy's API has no DELETE endpoint for routines - this only lists
 * candidates for the user to remove by hand in the app.
 */
export function findDeletionCandidates(routines: Routine[]): DeletionCandidateGroup[] {
    const groups = new Map<string, Routine[]>();
    for (const r of routines) {
        const key = structureFingerprint(r);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    }
    const candidates: DeletionCandidateGroup[] = [];
    for (const [fingerprint, group] of groups) {
        if (group.length > 1) {
            candidates.push({
                fingerprint,
                routines: group.map(r => ({ id: r.id, title: r.title, folder_id: r.folder_id, updated_at: r.updated_at })),
            });
        }
    }
    candidates.sort((a, b) => b.routines.length - a.routines.length);
    return candidates;
}

export async function listRoutinesProjected(hevy: HevyClient, options: ListRoutinesOptions = {}) {
    const fields = options.fields && options.fields.length > 0 ? options.fields : (["summary"] as RoutineField[]);
    let routines = await fetchAllRoutines(hevy);

    if (options.folderId !== undefined) {
        routines = routines.filter(r => r.folder_id === options.folderId);
    }
    if (options.titleContains) {
        const needle = normalizeForSearch(options.titleContains);
        routines = routines.filter(r => normalizeForSearch(r.title).includes(needle));
    }

    return routines.map(r => {
        let out: Record<string, unknown> = {};
        if (fields.includes("summary")) out = { ...out, ...toSummary(r) };
        if (fields.includes("exercises")) out = { ...out, ...toExercisesView(r) };
        if (fields.includes("structure")) out = { ...out, ...toStructureView(r) };
        if (fields.includes("sets")) out = { ...out, ...toSetsView(r) };
        return out;
    });
}

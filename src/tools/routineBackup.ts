import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as nodePath from "node:path";
import * as os from "node:os";
import type { HevyClient, Routine } from "hevy-ts";
import { fetchAllRoutines } from "../lib/routineCatalog";
import { routineToUpdateRequest } from "../lib/routineSchema";

interface ExportFile {
    exportedAt: string;
    routines: Routine[];
}

// Node's fs functions don't expand "~" - a caller passing "~/backups/x.json"
// would otherwise create a literal directory named "~". A bare relative
// path is resolved against a default backups directory instead of the MCP
// server process's cwd, which an agent driving this tool has no visibility
// into.
function resolveBackupPath(filePath: string): string {
    let resolved = filePath;
    if (resolved === "~" || resolved.startsWith("~/") || resolved.startsWith("~\\")) {
        resolved = nodePath.join(os.homedir(), resolved.slice(1));
    }
    if (!nodePath.isAbsolute(resolved)) {
        resolved = nodePath.join(os.homedir(), ".hevy-mcp", "backups", resolved);
    }
    return resolved;
}

export function registerRoutineBackupTools(server: McpServer, hevy: HevyClient) {
    server.registerTool(
        "exportRoutines",
        {
            title: "Export Routines",
            description:
                "Backs up routines to a local JSON file exactly as the API returns them (unrounded weights, nulls preserved), for restoring with importRoutines if a later write goes wrong. Run this before any bulk change (e.g. regrouping many routines into supersets). 'path' supports '~' and, if relative, resolves against ~/.hevy-mcp/backups - the response's 'path' field always reports the absolute path actually written.",
            inputSchema: {
                routineIds: z.array(z.string()).optional(),
                path: z.string(),
            },
        },
        async ({ routineIds, path: filePath }) => {
            const resolvedPath = resolveBackupPath(filePath);
            const all = await fetchAllRoutines(hevy);
            const selected = routineIds && routineIds.length > 0
                ? all.filter(r => routineIds.includes(r.id))
                : all;

            fs.mkdirSync(nodePath.dirname(resolvedPath), { recursive: true });
            const data: ExportFile = { exportedAt: new Date().toISOString(), routines: selected };
            fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2));

            return { content: [{ type: "text", text: JSON.stringify({ exported: selected.length, path: resolvedPath }, null, 2) }] };
        }
    );

    server.registerTool(
        "importRoutines",
        {
            title: "Import Routines",
            description:
                "Restores routines from a file previously written by exportRoutines, writing each one back via updateRoutine. Only mode:'restore' is supported. Optionally limit to specific routineIds within the file; omit to restore everything in it. 'path' resolves the same way as in exportRoutines ('~' and relative paths supported). Note: a routine's own 'notes' field isn't part of the exported snapshot (Hevy's API never returns it), so restoring doesn't touch routine-level notes.",
            inputSchema: {
                path: z.string(),
                mode: z.literal("restore"),
                routineIds: z.array(z.string()).optional(),
            },
        },
        async ({ path: filePath, routineIds }) => {
            const raw = fs.readFileSync(resolveBackupPath(filePath), "utf-8");
            const data = JSON.parse(raw) as ExportFile;
            const toRestore = routineIds && routineIds.length > 0
                ? data.routines.filter(r => routineIds.includes(r.id))
                : data.routines;

            const results: { id: string; title: string; status: "restored" | "failed"; error?: string }[] = [];
            for (const routine of toRestore) {
                try {
                    await hevy.updateRoutine(routine.id, routineToUpdateRequest(routine));
                    results.push({ id: routine.id, title: routine.title, status: "restored" });
                } catch (error: any) {
                    results.push({ id: routine.id, title: routine.title, status: "failed", error: String(error?.message ?? error) });
                }
            }

            return { content: [{ type: "text", text: JSON.stringify({ mode: "restore", results }, null, 2) }] };
        }
    );
}

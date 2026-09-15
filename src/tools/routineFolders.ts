import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "hevy-ts";

export function registerRoutineFolderTools(server: McpServer, hevy: HevyClient) {
    server.registerTool(
        "getRoutineFolders",
        {
            title: "Get Routine Folders",
            description: "List all routine folders",
            inputSchema: { page: z.number().optional(), pageSize: z.number().optional() },
        },
        async ({ page = 1, pageSize = 10 }) => {
            const folders = await hevy.getRoutineFolders(page, pageSize);
            return { content: [{ type: "text", text: JSON.stringify(folders, null, 2) }] };
        }
    );

    server.registerTool(
        "getRoutineFolderById",
        {
            title: "Get Routine Folder By ID",
            description: "Get a routine folder by its ID",
            inputSchema: { folderId: z.number() },
        },
        async ({ folderId }) => {
            const folder = await hevy.getRoutineFolderById(folderId);
            return { content: [{ type: "text", text: JSON.stringify(folder, null, 2) }] };
        }
    );

    server.registerTool(
        "createRoutineFolder",
        {
            title: "Create Routine Folder",
            description: "Create a new routine folder",
            inputSchema: { title: z.string() },
        },
        async ({ title }) => {
            const folder = await hevy.createRoutineFolder({ title });
            return { content: [{ type: "text", text: JSON.stringify(folder, null, 2) }] };
        }
    );
}

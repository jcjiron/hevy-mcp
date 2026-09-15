import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { hevy } from "./hevyClient";
import { registerWorkoutTools } from "./tools/workouts";
import { registerRoutineFolderTools } from "./tools/routineFolders";
import { registerRoutineTools } from "./tools/routines";
import { registerRoutineCatalogTools } from "./tools/routineCatalogTools";
import { registerRoutineBackupTools } from "./tools/routineBackup";
import { registerExerciseTemplateTools } from "./tools/exerciseTemplates";
import { registerWebhookTools } from "./tools/webhooks";

const server = new McpServer({
    name: "hevy-api-mcp",
    version: "1.0.0"
});

registerWorkoutTools(server, hevy);
registerRoutineFolderTools(server, hevy);
registerRoutineTools(server, hevy);
registerRoutineCatalogTools(server, hevy);
registerRoutineBackupTools(server, hevy);
registerExerciseTemplateTools(server, hevy);
registerWebhookTools(server, hevy);

// Add a dynamic greeting resource
server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
        title: "Greeting Resource",      // Display name for UI
        description: "Dynamic greeting generator"
    },
    async (uri, { name }) => ({
        contents: [{
            uri: uri.href,
            text: `Hello, ${name}!`
        }]
    })
);

// Start receiving messages on stdin and sending messages on stdout
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main();

import type { Config } from "jest";

const config: Config = {
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    preset: "ts-jest",
    testEnvironment: "jest-environment-node",
    setupFiles: ["dotenv/config"],
    moduleFileExtensions: ["ts", "tsx", "js", "json"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    testMatch: ["**/test/**/*.test.ts", "**/src/__tests__/**/*.test.ts"],
};

export default config;
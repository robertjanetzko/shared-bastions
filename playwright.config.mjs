import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./integration",
  workers: 1,
  timeout: 180000,
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:30014",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"] }
  }
});

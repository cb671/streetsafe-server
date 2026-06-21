const { assertStartupConfig } = require("./config/env");
const app = require("./app");
const { ensureEducationalSources } = require("./database/ensureEducationalSources");
const port = process.env.PORT || 3000;

async function startServer() {
  assertStartupConfig();
  await ensureEducationalSources();

  app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

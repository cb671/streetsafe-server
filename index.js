const { assertStartupConfig } = require("./config/env");
const app = require("./app");
const port = process.env.PORT || 3000;

assertStartupConfig();

app.listen(port, ()=>{
  console.log(`Listening on port ${port}`);
});

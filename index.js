const app = require("./app");
const Case = require("./model/Case");
const port = process.env.PORT || 3000;

app.listen(port, ()=>{
  console.log(`Listening on port ${port}`);
});

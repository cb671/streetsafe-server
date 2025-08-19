require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./routers/api");

const cookieParser = require('cookie-parser')

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api", api);

module.exports = app;

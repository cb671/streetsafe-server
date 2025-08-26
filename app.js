require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./routers/api");

const cookieParser = require('cookie-parser')

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if(!origin) return callback(false, true);
    if(origin.endsWith(":localhost")) return callback(false, true);
    return callback(false, ['https://streetsafe.space'].includes(origin))
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/api", api);

module.exports = app;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const api = require("./routers/api");
const { allowedOrigins, normalizeOrigin } = require("./config/security");

const cookieParser = require('cookie-parser')

const app = express();
app.set("trust proxy", 1);

const corsOptions = {
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(origin.startsWith("http://localhost")) return callback(null, true);
    return callback(null, allowedOrigins.includes(normalizeOrigin(origin)));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/api", api);

module.exports = app;

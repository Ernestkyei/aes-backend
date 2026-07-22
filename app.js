const express = require("express");
const morgan = require("morgan");
const cors = require("cors");


const app = express();

//======middleware===========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//=========http morgan request==================
app.use(morgan("dev"));


module.exports = app;
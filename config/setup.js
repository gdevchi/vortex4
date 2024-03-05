const http = require("http");
const express = require("express");
const socket = require("socket.io");

const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

module.exports = { server, app, io };

require("dotenv").config({});

const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const socket = require("socket.io");

const { connectDB } = require("./database");

const app = express();
const server = http.createServer(app);
const io = socket(server);

//PAGE ROUTES
const pageRoutes = require("./routes/page.routes");
//API ROUTES
const authRoutes = require("./routes/apis/auth.routes");
const roomRoutes = require("./routes/apis/room.routes");
const { initiateSocket } = require("./socket");

const state = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGOURI || "mongodb://127.0.0.1:27017/conferencedb",
};

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use("/public", express.static("public"));

//Mount APIs
app.use("/", pageRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/rooms", roomRoutes);

//MOUNT SOCKET
initiateSocket(io);

//CONNECT WITH DATABASE
connectDB(state.mongoURI).then(() => {
  server.listen(state.port, () => {
    console.log("Server is up and running!");
  });
});

require("dotenv").config({});
const express = require("express");
const { server, app, io } = require("./config/setup");
const { connectDB } = require("./config/database");
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

app.set("view engine", "ejs");

// Middleware to prevent caching for all routes
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/public", express.static("public"));
//MOUNT APIs
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

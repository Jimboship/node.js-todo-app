require("dotenv").config()

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const User = require("./models/User");
const Task = require("./models/Task");


const app = express();
const PORT = precess.env.Port||3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "replace-this-with-a-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect("/login.html");
  }
  next();
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.redirect("/register.html");
});

app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/todo", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "todo", "todo.html"));
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully", redirect: "/login.html" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    req.session.userId = user._id;
    return res.status(200).json({ message: "Login successful", redirect: "/todo" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  });
});

app.post("/add", requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.Name || req.body?.name || req.body?.task || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Task name is required" });
    }

    const existingTask = await Task.findOne({ Name: name, userId: req.session.userId });
    if (existingTask) {
      return res.status(409).json({ message: "Task already exists" });
    }

    const createdTask = await Task.create({ Name: name, userId: req.session.userId });
    return res.status(201).json({ message: "Task added successfully", task: createdTask });
  } catch (err) {
    console.error("Add task error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/tasks", requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId }).sort({ _id: -1 });
    return res.status(200).json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.delete("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({ message: "Task deleted successfully", task: deletedTask });
  } catch (err) {
    console.error("Delete task error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.listen(PORT,"0.0.0.0", () => {
  console.log(` yongamas Server running on port:${PORT}`);
});
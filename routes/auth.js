const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: "username & password required" });
        const [users] = await pool.query(
            "SELECT id FROM users WHERE username=?",
            [username]
        );
        if (users.length > 0)
            return res.status(400).json({ error: "Username already exists" });
        const hash = await bcrypt.hash(password, 10);
        const userRole = role === "admin" ? "admin" : "user";
        await pool.query(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            [username, hash, userRole]
        );
        res.json({ message: "Registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query(
            "SELECT * FROM users WHERE username=?",
            [username]
        );
        if (users.length === 0)
            return res.status(400).json({ error: "Invalid credentials" });
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(400).json({ error: "Invalid credentials" });
        const token = jwt.sign(
            { username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );
        res.json({ token, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

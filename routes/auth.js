const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { authLimiter, sanitizeInput, validate } = require("../middleware/security");
const { registerValidation, loginValidation } = require("../middleware/validation");
require("dotenv").config();

const router = express.Router();

router.post("/register", authLimiter, sanitizeInput, validate(registerValidation), async (req, res) => {
    try {
        const { username, password, role, email, nomor_hp, alamat } = req.body;
        
        // Cek username sudah ada
        const [users] = await pool.query(
            "SELECT id FROM users WHERE username=?",
            [username]
        );
        if (users.length > 0)
            return res.status(400).json({ error: "Username already exists" });
        
        // Cek email jika sudah ada
        if (email) {
            const [emailUsers] = await pool.query(
                "SELECT id FROM users WHERE email=?",
                [email]
            );
            if (emailUsers.length > 0)
                return res.status(400).json({ error: "Email already exists" });
        }
        
        // Sanitize input
        const sanitizedUsername = username.trim().substring(0, 50);
        const sanitizedEmail = email ? email.trim().substring(0, 255) : null;
        const sanitizedNomorHp = nomor_hp ? nomor_hp.trim().substring(0, 20) : null;
        const sanitizedAlamat = alamat ? alamat.trim().substring(0, 500) : null;
        
        const hash = await bcrypt.hash(password, 12); // Increased salt rounds
        const userRole = role === "admin" ? "admin" : "user";
        await pool.query(
            "INSERT INTO users (username, password_hash, role, email, nomor_hp, alamat) VALUES (?, ?, ?, ?, ?, ?)",
            [sanitizedUsername, hash, userRole, sanitizedEmail, sanitizedNomorHp, sanitizedAlamat]
        );
        res.json({ message: "Registered successfully" });
    } catch (err) {
        // Jangan expose error detail
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username or email already exists" });
        }
        console.error('Register error:', err);
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post("/login", authLimiter, sanitizeInput, validate(loginValidation), async (req, res) => {
    try {
        const { username, password } = req.body;
        const inputUsername = (username || "").trim();
        if (!inputUsername || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        // Cari user dengan perbandingan case-insensitive pada username
        const [users] = await pool.query(
            "SELECT * FROM users WHERE LOWER(username)=LOWER(?)",
            [inputUsername]
        );
        if (users.length === 0) {
            return res.status(401).json({ error: "Username atau password salah" });
        }
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Username atau password salah" });
        }
        const token = jwt.sign(
            { username: user.username, role: user.role, id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "12h", issuer: "kawan-hiking" }
        );
        res.json({ token, username: user.username, role: user.role });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: "Login failed" });
    }
});

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            "SELECT id, username, role, email, nomor_hp, alamat, created_at FROM users WHERE id=?",
            [req.user.id]
        );
        if (users.length === 0)
            return res.status(404).json({ error: "User not found" });
        res.json(users[0]);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// Update user profile
router.put("/profile", authenticateToken, sanitizeInput, async (req, res) => {
    try {
        const { email, nomor_hp, alamat } = req.body;
        
        // Validasi email jika diubah
        if (email) {
            const [emailCheck] = await pool.query(
                "SELECT id FROM users WHERE email=? AND id != ?",
                [email, req.user.id]
            );
            if (emailCheck.length > 0)
                return res.status(400).json({ error: "Email already exists" });
        }

        // Sanitize input
        const sanitizedEmail = email ? email.trim().substring(0, 255) : null;
        const sanitizedNomorHp = nomor_hp ? nomor_hp.trim().substring(0, 20) : null;
        const sanitizedAlamat = alamat ? alamat.trim().substring(0, 500) : null;

        await pool.query(
            "UPDATE users SET email=?, nomor_hp=?, alamat=? WHERE id=?",
            [sanitizedEmail, sanitizedNomorHp, sanitizedAlamat, req.user.id]
        );
        
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;

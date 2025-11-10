const express = require("express")
const pool = require("../db")
const { authenticateToken, authorizeRole } = require("../middleware/auth")
const router = express.Router()

// GET: list all trip activity history (admin only)
router.get("/", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM history ORDER BY created_at DESC"
        )
        res.json(rows)
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// POST: record trip action
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { action, trip_type, trip_id, request_body } = req.body
        const username = req.user.username
        const role = req.user.role
        await pool.query(
            "INSERT INTO history (username, role, action, trip_type, trip_id, request_body) VALUES (?, ?, ?, ?, ?, ?)",
            [
                username,
                role,
                action,
                trip_type,
                trip_id,
                JSON.stringify(request_body),
            ]
        )
        res.json({ message: "History recorded" })
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

module.exports = router

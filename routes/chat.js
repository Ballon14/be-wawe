const express = require("express")
const pool = require("../db")
const { authenticateToken } = require("../middleware/auth")
const {
    chatLimiter,
    sanitizeInput,
    validate,
} = require("../middleware/security")
const { chatMessageValidation } = require("../middleware/validation")
const router = express.Router()

async function getUnreadCount() {
    const [result] = await pool.query(
        "SELECT COUNT(*) as count FROM chat_messages WHERE is_read = 0 AND role = 'user'"
    )
    const countRow =
        Array.isArray(result) && result.length > 0 ? result[0] : { count: 0 }
    return countRow.count || 0
}

// Get recent messages (optimized - hanya ambil 30 pesan terakhir)
router.get("/", authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 50) // Max 50 pesan
        const sinceId = parseInt(req.query.since_id) || 0 // Untuk incremental fetch

        let query, params
        if (sinceId > 0) {
            // Hanya ambil pesan baru setelah ID tertentu
            query =
                "SELECT id, username, message, role, is_read, created_at FROM chat_messages WHERE id > ? ORDER BY created_at ASC LIMIT ?"
            params = [sinceId, limit]
        } else {
            // Ambil pesan terakhir
            query =
                "SELECT id, username, message, role, is_read, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?"
            params = [limit]
        }

        const [messages] = await pool.query(query, params)

        // Reverse untuk menampilkan dari yang terbaru di bawah (kecuali incremental)
        if (sinceId === 0) {
            messages.reverse()
        }

        res.json(messages)
    } catch (err) {
        console.error("Get messages error:", err)
        res.status(500).json({ error: "Failed to fetch messages" })
    }
})

// Get unread messages count (for admin)
router.get("/unread-count", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ count: 0 })
        }

        const count = await getUnreadCount()
        res.json({ count })
    } catch (err) {
        console.error("Get unread count error:", err)
        res.status(500).json({ error: "Failed to fetch unread count" })
    }
})

// Send a message
router.post(
    "/",
    authenticateToken,
    chatLimiter,
    sanitizeInput,
    validate(chatMessageValidation),
    async (req, res) => {
        try {
            let { message } = req.body
            if (!message || message.trim().length === 0) {
                return res.status(400).json({ error: "Message is required" })
            }

            // Limit panjang pesan (max 1000 karakter)
            message = message.trim().substring(0, 1000)

            const username = req.user.username
            const role = req.user.role

            const [result] = await pool.query(
                "INSERT INTO chat_messages (username, message, role) VALUES (?, ?, ?)",
                [username, message, role]
            )

            // Jika admin yang mengirim, mark semua pesan user sebagai read
            if (role === "admin") {
                await pool.query(
                    "UPDATE chat_messages SET is_read = 1 WHERE role = 'user' AND is_read = 0"
                )
            }

            // Auto cleanup: hapus pesan yang lebih dari 30 hari
            await pool.query(
                "DELETE FROM chat_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
            )

            const [rows] = await pool.query(
                "SELECT id, username, message, role, is_read, created_at FROM chat_messages WHERE id = ?",
                [result.insertId]
            )

            const savedMessage = rows && rows.length > 0 ? rows[0] : null
            const io = req.app.get("io")

            if (io && savedMessage) {
                io.emit("chat:message", savedMessage)
                const unreadCount = await getUnreadCount()
                io.emit("chat:unread-count", unreadCount)
            }

            res.status(201).json({
                id: result.insertId,
                message: "Message sent successfully",
            })
        } catch (err) {
            console.error("Send message error:", err)
            res.status(500).json({ error: "Failed to send message" })
        }
    }
)

// Mark messages as read (for admin)
router.put("/mark-read", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" })
        }

        await pool.query(
            "UPDATE chat_messages SET is_read = 1 WHERE role = 'user' AND is_read = 0"
        )
        const io = req.app.get("io")
        if (io) {
            const unreadCount = await getUnreadCount()
            io.emit("chat:unread-count", unreadCount)
        }

        res.json({ message: "Messages marked as read" })
    } catch (err) {
        console.error("Mark read error:", err)
        res.status(500).json({ error: "Failed to mark messages as read" })
    }
})

// Delete message (admin only)
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" })
        }

        const messageId = parseInt(req.params.id, 10)
        if (Number.isNaN(messageId) || messageId <= 0) {
            return res.status(400).json({ error: "Invalid message id" })
        }

        const [result] = await pool.query(
            "DELETE FROM chat_messages WHERE id = ?",
            [messageId]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Message not found" })
        }

        const io = req.app.get("io")
        if (io) {
            io.emit("chat:delete", { id: messageId })
            const unreadCount = await getUnreadCount()
            io.emit("chat:unread-count", unreadCount)
        }

        res.json({ message: "Message deleted" })
    } catch (err) {
        console.error("Delete message error:", err)
        res.status(500).json({ error: "Failed to delete message" })
    }
})

module.exports = router

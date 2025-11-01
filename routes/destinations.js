const express = require("express")
const pool = require("../db")
const { authenticateToken, authorizeRole } = require("../middleware/auth")
const router = express.Router()

// Get all destinations
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM destinations ORDER BY id DESC"
        )
        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Get single destination
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM destinations WHERE id=?",
            [req.params.id]
        )
        if (rows.length === 0)
            return res.status(404).json({ error: "Destination not found" })
        res.json(rows[0])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Create destination
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama_destinasi,
                lokasi,
                ketinggian,
                kesulitan,
                durasi,
                deskripsi,
                jalur_pendakian,
                fasilitas,
                tips,
                gambar,
            } = req.body
            if (!nama_destinasi)
                return res
                    .status(400)
                    .json({ error: "nama_destinasi required" })

            const [result] = await pool.query(
                "INSERT INTO destinations (nama_destinasi, lokasi, ketinggian, kesulitan, durasi, deskripsi, jalur_pendakian, fasilitas, tips, gambar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    nama_destinasi,
                    lokasi || null,
                    ketinggian || null,
                    kesulitan || null,
                    durasi || null,
                    deskripsi || null,
                    jalur_pendakian ? JSON.stringify(jalur_pendakian) : null,
                    fasilitas ? JSON.stringify(fasilitas) : null,
                    tips ? JSON.stringify(tips) : null,
                    gambar || null,
                ]
            )
            res.status(201).json({ id: result.insertId })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

// Update destination
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama_destinasi,
                lokasi,
                ketinggian,
                kesulitan,
                durasi,
                deskripsi,
                jalur_pendakian,
                fasilitas,
                tips,
                gambar,
            } = req.body

            // Check if destination exists
            const [existingRows] = await pool.query(
                "SELECT * FROM destinations WHERE id=?",
                [req.params.id]
            )
            if (existingRows.length === 0)
                return res.status(404).json({ error: "Destination not found" })

            const existing = existingRows[0]

            const [result] = await pool.query(
                "UPDATE destinations SET nama_destinasi=?, lokasi=?, ketinggian=?, kesulitan=?, durasi=?, deskripsi=?, jalur_pendakian=?, fasilitas=?, tips=?, gambar=? WHERE id=?",
                [
                    nama_destinasi !== undefined
                        ? nama_destinasi
                        : existing.nama_destinasi,
                    lokasi !== undefined ? lokasi : existing.lokasi,
                    ketinggian !== undefined ? ketinggian : existing.ketinggian,
                    kesulitan !== undefined ? kesulitan : existing.kesulitan,
                    durasi !== undefined ? durasi : existing.durasi,
                    deskripsi !== undefined ? deskripsi : existing.deskripsi,
                    jalur_pendakian !== undefined
                        ? JSON.stringify(jalur_pendakian)
                        : existing.jalur_pendakian,
                    fasilitas !== undefined
                        ? JSON.stringify(fasilitas)
                        : existing.fasilitas,
                    tips !== undefined ? JSON.stringify(tips) : existing.tips,
                    gambar !== undefined ? gambar : existing.gambar,
                    req.params.id,
                ]
            )
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

// Delete destination
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const [result] = await pool.query(
                "DELETE FROM destinations WHERE id=?",
                [req.params.id]
            )
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

module.exports = router

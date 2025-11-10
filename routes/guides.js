const express = require("express")
const pool = require("../db")
const { authenticateToken, authorizeRole } = require("../middleware/auth")
const router = express.Router()

// Get all guides
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nama, email, alamat, pengalaman, spesialisasi, rating, deskripsi, foto, sertifikat, status, created_at, updated_at FROM guides ORDER BY id DESC"
        )
        res.json(rows)
    } catch (err) {
        console.error('Guides error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// Get single guide
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nama, email, alamat, pengalaman, spesialisasi, rating, deskripsi, foto, sertifikat, status, created_at, updated_at FROM guides WHERE id=?",
            [req.params.id]
        )
        if (rows.length === 0)
            return res.status(404).json({ error: "Guide not found" })
        res.json(rows[0])
    } catch (err) {
        console.error('Guides error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// Create guide
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama,
                email,
                alamat,
                pengalaman,
                spesialisasi,
                rating,
                deskripsi,
                foto,
                sertifikat,
                status,
            } = req.body
            if (!nama) return res.status(400).json({ error: "nama required" })

            const [result] = await pool.query(
                "INSERT INTO guides (nama, email, alamat, pengalaman, spesialisasi, rating, deskripsi, foto, sertifikat, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    nama,
                    email || null,
                    alamat || null,
                    pengalaman || null,
                    spesialisasi ? JSON.stringify(spesialisasi) : null,
                    rating || null,
                    deskripsi || null,
                    foto || null,
                    sertifikat ? JSON.stringify(sertifikat) : null,
                    status || "aktif",
                ]
            )
            res.status(201).json({ id: result.insertId })
        } catch (err) {
            console.error('Create guide error:', err);
            res.status(500).json({ error: "Failed to create guide" })
        }
    }
)

// Update guide
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama,
                email,
                alamat,
                pengalaman,
                spesialisasi,
                rating,
                deskripsi,
                foto,
                sertifikat,
                status,
            } = req.body

            // Check if guide exists
            const [existingRows] = await pool.query(
                "SELECT * FROM guides WHERE id=?",
                [req.params.id]
            )
            if (existingRows.length === 0)
                return res.status(404).json({ error: "Guide not found" })

            const existing = existingRows[0]

            const [result] = await pool.query(
                "UPDATE guides SET nama=?, email=?, alamat=?, pengalaman=?, spesialisasi=?, rating=?, deskripsi=?, foto=?, sertifikat=?, status=? WHERE id=?",
                [
                    nama !== undefined ? nama : existing.nama,
                    email !== undefined ? email : existing.email,
                    alamat !== undefined ? alamat : existing.alamat,
                    pengalaman !== undefined ? pengalaman : existing.pengalaman,
                    spesialisasi !== undefined
                        ? JSON.stringify(spesialisasi)
                        : existing.spesialisasi,
                    rating !== undefined ? rating : existing.rating,
                    deskripsi !== undefined ? deskripsi : existing.deskripsi,
                    foto !== undefined ? foto : existing.foto,
                    sertifikat !== undefined
                        ? JSON.stringify(sertifikat)
                        : existing.sertifikat,
                    status !== undefined ? status : existing.status,
                    req.params.id,
                ]
            )
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            console.error('Guides error:', err);
        res.status(500).json({ error: "Operation failed" })
        }
    }
)

// Delete guide
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const [result] = await pool.query("DELETE FROM guides WHERE id=?", [
                req.params.id,
            ])
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            console.error('Guides error:', err);
        res.status(500).json({ error: "Operation failed" })
        }
    }
)

module.exports = router

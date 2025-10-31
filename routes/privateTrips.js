const express = require("express")
const pool = require("../db")
const { authenticateToken, authorizeRole } = require("../middleware/auth")
const router = express.Router()

// Get all private trips
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM private_trips ORDER BY id DESC"
        )
        res.json(rows)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Get single private trip
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM private_trips WHERE id=?",
            [req.params.id]
        )
        if (rows.length === 0)
            return res.status(404).json({ error: "Trip not found" })
        res.json(rows[0])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Create private trip
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                destinasi,
                min_peserta,
                harga_paket,
                paket_pilihan,
                custom_form,
                estimasi_biaya,
                dokumentasi,
                dilaksanakan,
            } = req.body
            const [result] = await pool.query(
                "INSERT INTO private_trips (destinasi, min_peserta, harga_paket, paket_pilihan, custom_form, estimasi_biaya, dokumentasi, dilaksanakan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    destinasi,
                    min_peserta,
                    harga_paket,
                    JSON.stringify(paket_pilihan),
                    JSON.stringify(custom_form),
                    estimasi_biaya || null,
                    JSON.stringify(dokumentasi),
                    dilaksanakan || 0,
                ]
            )
            res.status(201).json({ id: result.insertId })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

// Update private trip
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                destinasi,
                min_peserta,
                harga_paket,
                paket_pilihan,
                custom_form,
                estimasi_biaya,
                dokumentasi,
                status,
                dilaksanakan,
            } = req.body
            // dapatkan data sebelum update
            const [oldTripRows] = await pool.query(
                "SELECT * FROM private_trips WHERE id=?",
                [req.params.id]
            )
            const oldStatus = oldTripRows[0]?.status
            const oldDilaksanakan = oldTripRows[0]?.dilaksanakan || 0
            const newDilaksanakan =
                dilaksanakan !== undefined ? dilaksanakan : oldDilaksanakan

            const [result] = await pool.query(
                "UPDATE private_trips SET destinasi=?, min_peserta=?, harga_paket=?, paket_pilihan=?, custom_form=?, estimasi_biaya=?, dokumentasi=?, status=?, dilaksanakan=? WHERE id=?",
                [
                    destinasi,
                    min_peserta,
                    harga_paket,
                    JSON.stringify(paket_pilihan),
                    JSON.stringify(custom_form),
                    estimasi_biaya || null,
                    JSON.stringify(dokumentasi),
                    status || oldStatus,
                    newDilaksanakan,
                    req.params.id,
                ]
            )
            // jika dilaksanakan berubah dari 0 ke 1 (belum -> sudah)
            if (newDilaksanakan === 1 && oldDilaksanakan === 0) {
                await pool.query(
                    "INSERT INTO history (username, role, action, trip_type, trip_id, request_body) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        req.user.username,
                        req.user.role,
                        "complete",
                        "private_trip",
                        req.params.id,
                        JSON.stringify(req.body),
                    ]
                )
            }
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

// Delete private trip
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const [result] = await pool.query(
                "DELETE FROM private_trips WHERE id=?",
                [req.params.id]
            )
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            res.status(500).json({ error: err.message })
        }
    }
)

module.exports = router

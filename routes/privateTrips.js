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
        console.error('Private trips error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// User request private trip (create request)
router.post("/request", authenticateToken, async (req, res) => {
    try {
        const { destinasi_id, guide_id, tanggal_keberangkatan, jumlah_peserta, catatan, username } = req.body
        
        if (!destinasi_id || !tanggal_keberangkatan || !jumlah_peserta) {
            return res.status(400).json({ error: "destinasi_id, tanggal_keberangkatan, dan jumlah_peserta wajib diisi" })
        }

        // Get destinasi name
        const [destRows] = await pool.query("SELECT nama_destinasi FROM destinations WHERE id = ?", [destinasi_id])
        const destinasiName = destRows[0]?.nama_destinasi || `Destinasi ID ${destinasi_id}`

        // Get guide name if provided
        let guideName = null
        if (guide_id) {
            const [guideRows] = await pool.query("SELECT nama FROM guides WHERE id = ?", [guide_id])
            guideName = guideRows[0]?.nama || null
        }

        // Create request (simpan sebagai private trip dengan status pending)
        const requestData = {
            destinasi: destinasiName,
            min_peserta: parseInt(jumlah_peserta) || 1,
            harga_paket: 0, // Akan dihitung admin
            paket_pilihan: JSON.stringify([]),
            custom_form: JSON.stringify({
                username: username || req.user.username,
                guide_id: guide_id || null,
                guide_name: guideName,
                tanggal_keberangkatan: tanggal_keberangkatan,
                jumlah_peserta: parseInt(jumlah_peserta),
                catatan: catatan || null,
                status: 'pending'
            }),
            estimasi_biaya: null,
            dokumentasi: JSON.stringify([]),
            dilaksanakan: 0
        }

        const [result] = await pool.query(
            "INSERT INTO private_trips (destinasi, min_peserta, harga_paket, paket_pilihan, custom_form, estimasi_biaya, dokumentasi, dilaksanakan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                requestData.destinasi,
                requestData.min_peserta,
                requestData.harga_paket,
                requestData.paket_pilihan,
                requestData.custom_form,
                requestData.estimasi_biaya,
                requestData.dokumentasi,
                requestData.dilaksanakan
            ]
        )

        res.status(201).json({ 
            id: result.insertId,
            message: "Permintaan trip berhasil dikirim. Admin akan menghubungi Anda segera."
        })
    } catch (err) {
        console.error('Create private trip request error:', err);
        res.status(500).json({ error: "Gagal mengirim permintaan trip" })
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
        console.error('Private trips error:', err);
        res.status(500).json({ error: "Operation failed" })
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
            console.error('Private trips error:', err);
        res.status(500).json({ error: "Operation failed" })
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
            console.error('Private trips error:', err);
        res.status(500).json({ error: "Operation failed" })
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
            console.error('Private trips error:', err);
        res.status(500).json({ error: "Operation failed" })
        }
    }
)

module.exports = router

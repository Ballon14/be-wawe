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

// Get private trips milik user login
router.get("/my", authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const [rows] = await pool.query(
            "SELECT * FROM private_trips WHERE JSON_EXTRACT(custom_form, '$.username') = ? ORDER BY id DESC",
            [username]
        );
        res.json(rows);
    } catch (err) {
        console.error("Get my private trips error:", err);
        res.status(500).json({ error: "Failed to fetch user trips" });
    }
});

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

// Update only status permintaan private trip (admin)
router.put("/:id/status", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const { status } = req.body;
        // Ambil data trip lama
        const [oldRows] = await pool.query("SELECT custom_form FROM private_trips WHERE id=?", [req.params.id]);
        if (!oldRows[0]) {
            return res.status(404).json({ error: "Trip not found" });
        }
        let customForm = {};
        try {
            if (typeof oldRows[0].custom_form === 'string') {
                customForm = JSON.parse(oldRows[0].custom_form || '{}');
            } else {
                customForm = oldRows[0].custom_form || {};
            }
        } catch {
            customForm = {};
        }
        customForm.status = status;
        // Lakukan update hanya field custom_form
        await pool.query(
            "UPDATE private_trips SET custom_form=? WHERE id=?",
            [JSON.stringify(customForm), req.params.id]
        );
        res.json({ message: "Status updated" });
    } catch (err) {
        console.error('Update status private trip error:', err);
        res.status(500).json({ error: "Failed to update status" });
    }
});

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

// Laporan bulanan private trip untuk admin dashboard
router.get("/report", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        // Rekap bulanan by status dari field custom_form.status
        const [rows] = await pool.query(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                COUNT(*) AS total,
                SUM(JSON_EXTRACT(custom_form, '$.status') = 'aktif' OR status = 'aktif') AS aktif,
                SUM(JSON_EXTRACT(custom_form, '$.status') = 'pending' OR status = 'pending') AS pending,
                SUM(JSON_EXTRACT(custom_form, '$.status') = 'ditolak' OR status = 'ditolak') AS ditolak,
                SUM(JSON_EXTRACT(custom_form, '$.jumlah_peserta')) AS total_peserta
            FROM private_trips
            WHERE YEAR(created_at) = ?
            GROUP BY month
            ORDER BY month DESC`,
            [year]
        );
        res.json({ year, data: rows });
    } catch (err) {
        console.error("Laporan bulanan private trip error:", err);
        res.status(500).json({ error: "Gagal mengambil data laporan bulanan" });
    }
});

module.exports = router

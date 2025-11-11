const express = require("express")
const pool = require("../db")
const { authenticateToken, authorizeRole } = require("../middleware/auth")
const router = express.Router()

// Get all open trips
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM open_trips ORDER BY id DESC"
        )
        res.json(rows)
    } catch (err) {
        console.error('Open trips error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// Get single open trip
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM open_trips WHERE id=?", [
            req.params.id,
        ])
        if (rows.length === 0)
            return res.status(404).json({ error: "Trip not found" })
        res.json(rows[0])
    } catch (err) {
        console.error('Get open trip error:', err);
        res.status(500).json({ error: "Failed to fetch trip" })
    }
})

// Create open trip
router.post(
    "/",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama_trip,
                tanggal_berangkat,
                durasi,
                kuota,
                harga_per_orang,
                fasilitas,
                itinerary,
                dokumentasi,
                dilaksanakan,
            } = req.body
            // Validasi input
            if (!nama_trip || !tanggal_berangkat || !durasi || !kuota || !harga_per_orang) {
                return res.status(400).json({ error: "Required fields missing" });
            }
            
            // Sanitize dan validasi
            const sanitizedNamaTrip = String(nama_trip).trim().substring(0, 255);
            const sanitizedDurasi = parseInt(durasi) || 0;
            const sanitizedKuota = parseInt(kuota) || 0;
            const sanitizedHarga = parseInt(harga_per_orang) || 0;
            
            if (sanitizedDurasi <= 0 || sanitizedKuota <= 0 || sanitizedHarga < 0) {
                return res.status(400).json({ error: "Invalid numeric values" });
            }
            
            const [result] = await pool.query(
                "INSERT INTO open_trips (nama_trip, tanggal_berangkat, durasi, kuota, harga_per_orang, fasilitas, itinerary, dokumentasi, dilaksanakan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    sanitizedNamaTrip,
                    tanggal_berangkat,
                    sanitizedDurasi,
                    sanitizedKuota,
                    sanitizedHarga,
                    fasilitas ? JSON.stringify(fasilitas) : null,
                    itinerary ? String(itinerary).trim().substring(0, 5000) : null,
                    dokumentasi ? JSON.stringify(dokumentasi) : null,
                    dilaksanakan || 0,
                ]
            )
            res.status(201).json({ id: result.insertId })
        } catch (err) {
            console.error('Create open trip error:', err);
            res.status(500).json({ error: "Failed to create trip" })
        }
    }
)

// Update open trip
router.put(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const {
                nama_trip,
                tanggal_berangkat,
                durasi,
                kuota,
                harga_per_orang,
                fasilitas,
                itinerary,
                dokumentasi,
                status,
                dilaksanakan,
            } = req.body
            // dapatkan data sebelum update
            const [oldTripRows] = await pool.query(
                "SELECT * FROM open_trips WHERE id=?",
                [req.params.id]
            )
            const oldStatus = oldTripRows[0]?.status
            const oldDilaksanakan = oldTripRows[0]?.dilaksanakan || 0
            const newDilaksanakan =
                dilaksanakan !== undefined ? dilaksanakan : oldDilaksanakan

            const [result] = await pool.query(
                "UPDATE open_trips SET nama_trip=?, tanggal_berangkat=?, durasi=?, kuota=?, harga_per_orang=?, fasilitas=?, itinerary=?, dokumentasi=?, status=?, dilaksanakan=? WHERE id=?",
                [
                    nama_trip,
                    tanggal_berangkat,
                    durasi,
                    kuota,
                    harga_per_orang,
                    JSON.stringify(fasilitas),
                    itinerary,
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
                        "open_trip",
                        req.params.id,
                        JSON.stringify(req.body),
                    ]
                )
            }
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            console.error('Open trips error:', err);
        res.status(500).json({ error: "Operation failed" })
        }
    }
)

// Delete open trip
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const [result] = await pool.query(
                "DELETE FROM open_trips WHERE id=?",
                [req.params.id]
            )
            res.json({ affectedRows: result.affectedRows })
        } catch (err) {
            console.error('Open trips error:', err);
        res.status(500).json({ error: "Operation failed" })
        }
    }
)

// Register to an open trip (user)
router.post(
    "/:id/register",
    authenticateToken,
    async (req, res) => {
        try {
            const tripId = parseInt(req.params.id)
            const {
                nama_lengkap,
                email,
                nomor_hp,
                jumlah_peserta,
                catatan,
                alamat,
                kontak_darurat_nama,
                kontak_darurat_nomor,
                riwayat_penyakit,
                kondisi_fit,
            } = req.body

            if (!tripId || !nama_lengkap || !email || !nomor_hp || !jumlah_peserta) {
                return res.status(400).json({ error: "Required fields missing" })
            }

            const [tripRows] = await pool.query("SELECT id, nama_trip FROM open_trips WHERE id=?", [tripId])
            if (tripRows.length === 0) return res.status(404).json({ error: "Trip not found" })

            const [result] = await pool.query(
                `INSERT INTO open_trip_registrations 
                (trip_id, user_id, username, nama_lengkap, email, nomor_hp, jumlah_peserta, catatan, alamat, kontak_darurat_nama, kontak_darurat_nomor, riwayat_penyakit, kondisi_fit, status, payment_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                [
                    tripId,
                    req.user?.id || null,
                    req.user?.username || null,
                    String(nama_lengkap).trim().substring(0,255),
                    String(email).trim().substring(0,255),
                    String(nomor_hp).trim().substring(0,30),
                    parseInt(jumlah_peserta) || 1,
                    catatan ? String(catatan).trim() : null,
                    alamat ? String(alamat).trim() : null,
                    kontak_darurat_nama ? String(kontak_darurat_nama).trim() : null,
                    kontak_darurat_nomor ? String(kontak_darurat_nomor).trim() : null,
                    riwayat_penyakit ? String(riwayat_penyakit).trim() : null,
                    kondisi_fit ? 1 : 0,
                ]
            )

            res.status(201).json({ id: result.insertId })
        } catch (err) {
            console.error('Register open trip error:', err);
            res.status(500).json({ error: "Failed to register" })
        }
    }
)

// List all registrations (admin)
router.get("/registrations", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, t.nama_trip FROM open_trip_registrations r 
             JOIN open_trips t ON r.trip_id = t.id
             ORDER BY r.id DESC`
        )
        res.json(rows)
    } catch (err) {
        console.error('List open trip registrations error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

// List registrations by trip (admin)
router.get("/:id/registrations", authenticateToken, authorizeRole("admin"), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, t.nama_trip FROM open_trip_registrations r 
             JOIN open_trips t ON r.trip_id = t.id
             WHERE r.trip_id = ?
             ORDER BY r.id DESC`,
            [req.params.id]
        )
        res.json(rows)
    } catch (err) {
        console.error('List open trip registrations by trip error:', err);
        res.status(500).json({ error: "Operation failed" })
    }
})

module.exports = router

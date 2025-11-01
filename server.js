const express = require("express")
require("dotenv").config()
const authRoutes = require("./routes/auth")
const openTripsRoutes = require("./routes/openTrips")
const privateTripsRoutes = require("./routes/privateTrips")
const historyRoutes = require("./routes/history")
const destinationsRoutes = require("./routes/destinations")
const guidesRoutes = require("./routes/guides")
const multer = require("multer")
const path = require("path")

const uploadFolder = path.join(__dirname, "uploads")
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
        const ext = path.extname(file.originalname)
        cb(null, file.fieldname + "-" + uniqueSuffix + ext)
    },
})
const upload = multer({ storage })

const app = express()
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Route modular
app.use("/api/auth", authRoutes)
app.use("/api/open-trips", openTripsRoutes)
app.use("/api/private-trips", privateTripsRoutes)
app.use("/api/history", historyRoutes)
app.use("/api/destinations", destinationsRoutes)
app.use("/api/guides", guidesRoutes)
app.use("/uploads", express.static(uploadFolder))

app.post("/api/uploads/image", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })
    const urlPath = `/uploads/${req.file.filename}`
    res.json({ filename: req.file.filename, url: urlPath })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found" })
})

// Centralized error handler (optional)
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message || "Internal server error" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Server ready on port", PORT))

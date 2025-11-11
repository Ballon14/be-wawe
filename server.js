const express = require("express")
require("dotenv").config()
const helmet = require("helmet")
const cors = require("cors")
const { apiLimiter } = require("./middleware/security")
const authRoutes = require("./routes/auth")
const openTripsRoutes = require("./routes/openTrips")
const privateTripsRoutes = require("./routes/privateTrips")
const historyRoutes = require("./routes/history")
const destinationsRoutes = require("./routes/destinations")
const guidesRoutes = require("./routes/guides")
const chatRoutes = require("./routes/chat")
const multer = require("multer")
const path = require("path")

const uploadFolder = path.join(__dirname, "uploads")

// File upload security
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
        const ext = path.extname(file.originalname).toLowerCase()
        // Sanitize filename
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")
        cb(null, file.fieldname + "-" + uniqueSuffix + ext)
    },
})

// File filter untuk validasi tipe file
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    )
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error("Only image files are allowed!"))
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
})

const app = express()

// Security Headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
)

// CORS Configuration
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
)

// Body Parser dengan limit
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Rate Limiting
app.use("/api/", apiLimiter)

// Input Sanitization
const { sanitizeBody } = require("./middleware/inputSanitizer")
app.use(sanitizeBody)

// Route modular
app.use("/api/auth", authRoutes)
app.use("/api/open-trips", openTripsRoutes)
app.use("/api/private-trips", privateTripsRoutes)
app.use("/api/history", historyRoutes)
app.use("/api/destinations", destinationsRoutes)
app.use("/api/guides", guidesRoutes)
app.use("/api/chat", chatRoutes)
app.use("/uploads", express.static(uploadFolder))

app.post("/api/uploads/image", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })
    const urlPath = `/uploads/${req.file.filename}`
    res.json({ filename: req.file.filename, url: urlPath })
})

// Error handler untuk multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ error: "File too large. Maximum size is 5MB" })
        }
        return res.status(400).json({ error: err.message })
    }
    next(err)
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found" })
})

// Centralized error handler (tidak expose informasi sensitif)
app.use((err, req, res, next) => {
    console.error("Error:", err)

    // Jangan expose error detail di production
    const isDevelopment = process.env.NODE_ENV !== "production"

    if (err.name === "ValidationError") {
        return res.status(400).json({ error: "Validation error" })
    }

    if (err.name === "UnauthorizedError") {
        return res.status(401).json({ error: "Unauthorized" })
    }

    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : "Internal server error",
    })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => console.log("Server ready on port", PORT))

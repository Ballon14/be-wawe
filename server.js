const express = require("express")
require("dotenv").config()
const http = require("http")
const { Server } = require("socket.io")
const helmet = require("helmet")
const cors = require("cors")
const { apiLimiter } = require("./middleware/security")
const jwt = require("jsonwebtoken")
const pool = require("./db")
const authRoutes = require("./routes/auth")
const openTripsRoutes = require("./routes/openTrips")
const privateTripsRoutes = require("./routes/privateTrips")
const historyRoutes = require("./routes/history")
const destinationsRoutes = require("./routes/destinations")
const guidesRoutes = require("./routes/guides")
const chatRoutes = require("./routes/chat")
const paymentRoutes = require("./routes/payment")
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

const MESSAGE_LIMIT_PER_MINUTE = 100
const MESSAGE_WINDOW_MS = 60 * 1000
const messageRateTracker = new Map()

function isRateLimited(userId) {
    if (!userId) return false
    const now = Date.now()
    const entry = messageRateTracker.get(userId) || { count: 0, start: now }

    if (now - entry.start > MESSAGE_WINDOW_MS) {
        entry.count = 0
        entry.start = now
    }

    entry.count += 1
    messageRateTracker.set(userId, entry)
    return entry.count > MESSAGE_LIMIT_PER_MINUTE
}

function sanitizeMessageContent(content) {
    if (typeof content !== "string") return ""
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .trim()
        .slice(0, 1000)
}

async function fetchRecentMessages(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const [rows] = await pool.query(
        "SELECT id, username, message, role, is_read, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?",
        [safeLimit]
    )
    return rows.reverse()
}

async function getUnreadCount() {
    const [result] = await pool.query(
        "SELECT COUNT(*) as count FROM chat_messages WHERE is_read = 0 AND role = 'user'"
    )
    const countRow =
        Array.isArray(result) && result.length > 0 ? result[0] : { count: 0 }
    return countRow.count || 0
}

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
                connectSrc: [
                    "'self'",
                    process.env.FRONTEND_URL || "http://localhost:5173",
                    process.env.BACKEND_URL || "http://localhost:3000",
                    "ws:",
                    "wss:",
                ],
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
app.use("/api/payment", paymentRoutes)
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
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
})

app.set("io", io)

const respond = (ack, payload) => {
    if (typeof ack === "function") {
        ack(payload)
    }
}

io.use((socket, next) => {
    try {
        const authToken = socket.handshake.auth?.token
        const headerToken = socket.handshake.headers?.authorization
        let token = authToken

        if (
            !token &&
            typeof headerToken === "string" &&
            headerToken.startsWith("Bearer ")
        ) {
            token = headerToken.split(" ")[1]
        }

        if (!token) {
            return next(new Error("Unauthorized"))
        }

        const user = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "kawan-hiking",
        })
        socket.data.user = user
        return next()
    } catch (err) {
        return next(new Error("Unauthorized"))
    }
})

io.on("connection", async (socket) => {
    const user = socket.data.user

    try {
        const history = await fetchRecentMessages(100)
        socket.emit("chat:history", history)

        if (user.role === "admin") {
            const unread = await getUnreadCount()
            socket.emit("chat:unread-count", unread)
        }
    } catch (err) {
        console.error("Socket initial sync error:", err)
    }

    socket.on("chat:send", async (payload = {}, ack) => {
        try {
            const messageContent = sanitizeMessageContent(payload.message)

            if (!messageContent) {
                respond(ack, { ok: false, error: "Pesan tidak boleh kosong." })
                return
            }

            if (isRateLimited(user.id)) {
                respond(ack, {
                    ok: false,
                    error: "Terlalu banyak pesan dalam satu menit. Coba lagi nanti.",
                })
                return
            }

            const [result] = await pool.query(
                "INSERT INTO chat_messages (username, message, role) VALUES (?, ?, ?)",
                [user.username, messageContent, user.role]
            )

            if (user.role === "admin") {
                await pool.query(
                    "UPDATE chat_messages SET is_read = 1 WHERE role = 'user' AND is_read = 0"
                )
            }

            const [rows] = await pool.query(
                "SELECT id, username, message, role, is_read, created_at FROM chat_messages WHERE id = ?",
                [result.insertId]
            )

            const savedMessage = rows && rows.length > 0 ? rows[0] : null

            if (savedMessage) {
                io.emit("chat:message", savedMessage)
            }

            const unreadCount = await getUnreadCount()
            io.emit("chat:unread-count", unreadCount)

            respond(ack, { ok: true, id: result.insertId })
        } catch (err) {
            console.error("Socket send message error:", err)
            socket.emit(
                "chat:error",
                "Gagal mengirim pesan. Silakan coba lagi."
            )
            respond(ack, { ok: false, error: "Gagal mengirim pesan." })
        }
    })

    socket.on("chat:mark-read", async (_payload, ack) => {
        if (user.role !== "admin") {
            respond(ack, { ok: false, error: "Forbidden" })
            return
        }

        try {
            await pool.query(
                "UPDATE chat_messages SET is_read = 1 WHERE role = 'user' AND is_read = 0"
            )
            const unreadCount = await getUnreadCount()
            io.emit("chat:unread-count", unreadCount)
            respond(ack, { ok: true })
        } catch (err) {
            console.error("Socket mark-read error:", err)
            respond(ack, { ok: false, error: "Gagal memperbarui status baca." })
        }
    })
})

server.listen(PORT, "0.0.0.0", () => console.log("Server ready on port", PORT))

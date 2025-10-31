const express = require("express")
require("dotenv").config()
const authRoutes = require("./routes/auth")
const openTripsRoutes = require("./routes/openTrips")
const privateTripsRoutes = require("./routes/privateTrips")
const historyRoutes = require("./routes/history")

const app = express()
app.use(express.json())

// Route modular
app.use("/api/auth", authRoutes)
app.use("/api/open-trips", openTripsRoutes)
app.use("/api/private-trips", privateTripsRoutes)
app.use("/api/history", historyRoutes)

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

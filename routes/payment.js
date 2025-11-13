const express = require("express")
const midtransClient = require("midtrans-client")
const pool = require("../db")
const { authenticateToken } = require("../middleware/auth")
const router = express.Router()

// Initialize Midtrans Snap
// Check if Midtrans credentials are configured
if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
    console.warn(
        "WARNING: Midtrans credentials not configured. Payment will not work."
    )
    console.warn(
        "Please set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY in .env file"
    )
}

const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
})

// Create payment transaction for open trip registration
router.post(
    "/open-trip/:registrationId",
    authenticateToken,
    async (req, res) => {
        try {
            const registrationId = parseInt(req.params.registrationId)

            // Get registration data
            const [registrationRows] = await pool.query(
                `SELECT r.*, t.nama_trip, t.harga_per_orang 
                 FROM open_trip_registrations r
                 JOIN open_trips t ON r.trip_id = t.id
                 WHERE r.id = ? AND r.user_id = ?`,
                [registrationId, req.user.id]
            )

            if (registrationRows.length === 0) {
                return res.status(404).json({ error: "Registration not found" })
            }

            const registration = registrationRows[0]

            // Check if payment already completed
            if (registration.payment_status === "paid") {
                return res
                    .status(400)
                    .json({ error: "Payment already completed" })
            }

            // Allow retry if payment is pending or expired
            // This allows users to create a new payment transaction

            // Validate Midtrans configuration
            if (
                !process.env.MIDTRANS_SERVER_KEY ||
                !process.env.MIDTRANS_CLIENT_KEY
            ) {
                console.error("Midtrans credentials not configured")
                return res.status(500).json({
                    error: "Payment gateway not configured. Please contact administrator.",
                })
            }

            // Calculate total amount
            const totalAmount =
                parseInt(registration.harga_per_orang) *
                parseInt(registration.jumlah_peserta)

            if (totalAmount <= 0) {
                return res.status(400).json({
                    error: "Invalid payment amount",
                })
            }

            // Create Midtrans transaction
            const parameter = {
                transaction_details: {
                    order_id: `OPEN-TRIP-${registrationId}-${Date.now()}`,
                    gross_amount: totalAmount,
                },
                item_details: [
                    {
                        id: `TRIP-${registration.trip_id}`,
                        price: totalAmount,
                        quantity: 1,
                        name: `Open Trip: ${registration.nama_trip} (${registration.jumlah_peserta} peserta)`,
                    },
                ],
                customer_details: {
                    first_name: registration.nama_lengkap,
                    email: registration.email,
                    phone: registration.nomor_hp,
                },
                callbacks: {
                    finish: `${
                        process.env.FRONTEND_URL || "http://localhost:5173"
                    }/open-trip/${
                        registration.trip_id
                    }/pembayaran?status=success`,
                    unfinish: `${
                        process.env.FRONTEND_URL || "http://localhost:5173"
                    }/open-trip/${
                        registration.trip_id
                    }/pembayaran?status=pending`,
                    error: `${
                        process.env.FRONTEND_URL || "http://localhost:5173"
                    }/open-trip/${
                        registration.trip_id
                    }/pembayaran?status=error`,
                },
            }

            console.log(
                "Creating Midtrans transaction for registration:",
                registrationId
            )
            console.log(
                "Transaction parameter:",
                JSON.stringify(parameter, null, 2)
            )

            const transaction = await snap.createTransaction(parameter)

            if (!transaction || !transaction.token) {
                console.error("Midtrans transaction failed: No token returned")
                return res.status(500).json({
                    error: "Failed to create payment transaction. No token received.",
                })
            }

            // Update registration with payment reference
            const orderId = parameter.transaction_details.order_id
            await pool.query(
                `UPDATE open_trip_registrations 
                 SET payment_reference = ?, payment_deadline = DATE_ADD(NOW(), INTERVAL 24 HOUR)
                 WHERE id = ?`,
                [orderId, registrationId]
            )

            console.log("Payment transaction created successfully:", orderId)

            res.json({
                token: transaction.token,
                redirect_url: transaction.redirect_url,
                order_id: orderId,
            })
        } catch (err) {
            console.error("Create payment error:", err)
            console.error("Error details:", {
                message: err.message,
                stack: err.stack,
                response: err.response?.data || err.response,
            })

            // Provide more detailed error message
            let errorMessage = "Failed to create payment transaction"
            if (err.message) {
                errorMessage += `: ${err.message}`
            }
            if (err.response?.data) {
                errorMessage += ` (${JSON.stringify(err.response.data)})`
            }

            res.status(500).json({
                error: errorMessage,
            })
        }
    }
)

// Webhook handler for Midtrans payment notifications
router.post("/webhook", async (req, res) => {
    try {
        const notificationJson = req.body

        // Verify notification using Midtrans
        const apiClient = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.MIDTRANS_CLIENT_KEY,
        })

        const statusResponse = await apiClient.transaction.notification(
            notificationJson
        )

        const orderId = statusResponse.order_id
        const transactionStatus = statusResponse.transaction_status
        const fraudStatus = statusResponse.fraud_status

        // Extract registration ID from order_id (format: OPEN-TRIP-{registrationId}-{timestamp})
        const orderIdMatch = orderId.match(/^OPEN-TRIP-(\d+)-/)
        if (!orderIdMatch) {
            console.error("Invalid order_id format:", orderId)
            return res.status(400).json({ error: "Invalid order_id format" })
        }

        const registrationId = parseInt(orderIdMatch[1])

        // Get registration
        const [registrationRows] = await pool.query(
            "SELECT * FROM open_trip_registrations WHERE id = ?",
            [registrationId]
        )

        if (registrationRows.length === 0) {
            console.error("Registration not found:", registrationId)
            return res.status(404).json({ error: "Registration not found" })
        }

        // Update payment status based on transaction status
        let paymentStatus = "pending"
        let registrationStatus = "pending"

        if (transactionStatus === "capture") {
            if (fraudStatus === "challenge") {
                paymentStatus = "pending"
            } else if (fraudStatus === "accept") {
                paymentStatus = "paid"
                registrationStatus = "confirmed"
            }
        } else if (transactionStatus === "settlement") {
            paymentStatus = "paid"
            registrationStatus = "confirmed"
        } else if (transactionStatus === "pending") {
            paymentStatus = "pending"
        } else if (
            transactionStatus === "deny" ||
            transactionStatus === "expire" ||
            transactionStatus === "cancel"
        ) {
            paymentStatus = "expired"
        }

        // Update registration
        await pool.query(
            `UPDATE open_trip_registrations 
             SET payment_status = ?, status = ?, payment_reference = ?
             WHERE id = ?`,
            [paymentStatus, registrationStatus, orderId, registrationId]
        )

        console.log(
            `Payment webhook processed: Registration ${registrationId}, Status: ${paymentStatus}`
        )

        res.status(200).json({ message: "Webhook processed successfully" })
    } catch (err) {
        console.error("Webhook error:", err)
        res.status(500).json({ error: "Webhook processing failed" })
    }
})

// Get payment status
router.get(
    "/open-trip/:registrationId/status",
    authenticateToken,
    async (req, res) => {
        try {
            const registrationId = parseInt(req.params.registrationId)

            const [registrationRows] = await pool.query(
                `SELECT payment_status, status, payment_reference, payment_deadline
                 FROM open_trip_registrations
                 WHERE id = ? AND user_id = ?`,
                [registrationId, req.user.id]
            )

            if (registrationRows.length === 0) {
                return res.status(404).json({ error: "Registration not found" })
            }

            res.json(registrationRows[0])
        } catch (err) {
            console.error("Get payment status error:", err)
            res.status(500).json({ error: "Failed to get payment status" })
        }
    }
)

module.exports = router

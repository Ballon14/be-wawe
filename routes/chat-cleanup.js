// Script untuk cleanup pesan chat lama (bisa dijadwalkan dengan cron)
// Jalankan: node routes/chat-cleanup.js

const pool = require("../db");
require("dotenv").config();

async function cleanupOldMessages() {
    try {
        // Hapus pesan yang lebih dari 30 hari
        const [result] = await pool.query(
            "DELETE FROM chat_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
        
        console.log(`✓ Cleanup selesai. ${result.affectedRows} pesan lama dihapus.`);
        
        // Optimasi tabel setelah delete
        await pool.query("OPTIMIZE TABLE chat_messages");
        console.log("✓ Tabel dioptimalkan.");
        
    } catch (err) {
        console.error("Error cleanup:", err.message);
    } finally {
        process.exit(0);
    }
}

cleanupOldMessages();




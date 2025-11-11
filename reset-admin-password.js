const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'iqbal14',
  database: process.env.DB_NAME || 'wawe',
});

async function resetAdminPassword() {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3] || 'admin123';
  
  try {
    // Hash password baru
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password dan pastikan role adalah admin
    const [result] = await connection.promise().query(
      'UPDATE users SET password_hash = ?, role = ? WHERE username = ?',
      [hash, 'admin', username]
    );
    
    if (result.affectedRows === 0) {
      // Jika user tidak ada, buat user baru
      await connection.promise().query(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, hash, 'admin']
      );
      console.log(`✓ User admin "${username}" berhasil dibuat!`);
    } else {
      console.log(`✓ Password admin "${username}" berhasil direset!`);
    }
    
    console.log(`\n📋 Kredensial Login:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: admin\n`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    connection.end();
  }
}

resetAdminPassword();







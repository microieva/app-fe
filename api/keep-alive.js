import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true, 
  connectionLimit: 10,    
  queueLimit: 0         
});

export default async function handler(req, res) {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();

    res.status(200).json({ status: 'Database pinged successfully' });
  } catch (error) {
    console.error('Keep-alive failed:', error);
    res.status(500).json({ error: 'Database ping failed' });
  }
}
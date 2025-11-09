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
    
    const [rows] = await connection.query(`
      SELECT COUNT(*) as user_count 
      FROM user
    `);
    
    connection.release();
    
    res.status(200).json({ 
      status: 'Database active',
      user_count: rows[0].user_count 
    });
  } catch (error) {  
    res.status(500).json({ error: 'Database ping failed' });
  }
}
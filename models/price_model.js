const pool = require('../libs/db_pool');

class PriceModel {
  // 📌 1. บันทึกราคารับซื้อประจำวัน
  static async savePrice(buyPrice) {
    try {
      // ดึงวันที่ปัจจุบันตามเวลาท้องถิ่นในฟอร์แมต YYYY-MM-DD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      // ใช้ SQL บันทึกโดยตรง โดยกำหนด price_id และ p_date เป็น String วันที่ 'YYYY-MM-DD'
      const sql = `
        INSERT INTO price (price_id, p_date, buy_price)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE buy_price = VALUES(buy_price)
      `;
      
      const result = await pool.query(sql, [today, today, buyPrice]);
      
      return { 
        isError: false, 
        data: { 
          affectedRows: result.affectedRows != null ? result.affectedRows : 1 
        } 
      };
    } catch (error) {
      console.error('Error in PriceModel.savePrice:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 2. ดึงราคารับซื้อประจำวันล่าสุด
  static async getTodayPrice() {
    try {
      const sql = `
        SELECT price_id, p_date, buy_price 
        FROM price 
        ORDER BY p_date DESC, price_id DESC 
        LIMIT 1
      `;
      const result = await pool.query(sql);

      let rows = Array.isArray(result[0]) ? result[0] : result;

      if (!rows || rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      console.error('Error in PriceModel.getTodayPrice:', error);
      throw error;
    }
  }
}

module.exports = PriceModel;
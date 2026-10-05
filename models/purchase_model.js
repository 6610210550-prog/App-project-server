const pool = require('../libs/db_pool');

class PurchaseModel {
  // 📌 1. ฟังก์ชันสร้างรหัสการรับซื้ออัตโนมัติ (เช่น PU00000001)
  static async generatePurchaseId() {
    try {
      const sql = `SELECT purchase_id FROM purchase WHERE purchase_id LIKE 'PU%' ORDER BY purchase_id DESC LIMIT 1`;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;

      if (!rows || rows.length === 0 || !rows[0] || !rows[0].purchase_id) {
        return 'PU00000001';
      }

      const lastId = rows[0].purchase_id;
      const numberPart = parseInt(lastId.replace('PU', ''), 10);
      const nextNumber = numberPart + 1;
      return `PU${String(nextNumber).padStart(8, '0')}`;
    } catch (error) {
      console.error('Error generating purchase ID:', error);
      throw error;
    }
  }

  // 📌 2. บันทึกข้อมูลการรับซื้อ
  static async savePurchase(data) {
    try {
      const purchase_id = await this.generatePurchaseId();
      const today = new Date().toISOString().split('T')[0];

      const {
        farmer_id,
        weight_in = 0,
        weight_out = 0,
        rubber_weight,
        drc,
        net_weight,
        price_id,
        total_price,
        rubber_type = 'สด'
      } = data;

      // 🔍 ดึง price_id ล่าสุดที่มีอยู่ในตาราง price
      let validPriceId = price_id;
      const priceResult = await pool.query(`SELECT price_id FROM price ORDER BY p_date DESC LIMIT 1`);
      let priceRows = Array.isArray(priceResult[0]) ? priceResult[0] : priceResult;

      if (priceRows && priceRows.length > 0) {
        validPriceId = priceRows[0].price_id;
      } else {
        return { isError: true, errorMessage: 'ไม่พบราคารับซื้อในระบบ กรุณาบันทึกราคารับซื้อก่อน' };
      }

      // 💾 คำสั่ง SQL บันทึกรายการ
      const sql = `
        INSERT INTO purchase 
        (purchase_id, farmer_id, weight_in, weight_out, rubber_weight, drc, net_weight, price_id, total_price, purchase_date, rubber_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await pool.query(sql, [
        purchase_id,
        farmer_id,
        weight_in,
        weight_out,
        rubber_weight,
        drc,
        net_weight,
        validPriceId,
        total_price,
        today,
        rubber_type
      ]);

      return { isError: false, data: result, generatedId: purchase_id };
    } catch (error) {
      console.error('Error in PurchaseModel.savePurchase:', error);
      return { isError: true, errorMessage: error.message };
    }
  }
}

module.exports = PurchaseModel;
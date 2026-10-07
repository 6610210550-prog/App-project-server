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

  // 📌 2. แสดง purchase ทั้งหมด (Read)
  // 📌 2. แสดง purchase ทั้งหมด (Read)
  static async getAllPurchases() {
    try {
      const sql = `
        SELECT 
          p.purchase_id,
          p.farmer_id,
          f.farmer_name,
          p.weight_in,
          p.weight_out,
          p.rubber_weight,
          p.drc,
          p.net_weight,
          p.total_price,
          p.price_id,
          prc.buy_price, -- 👈 เพิ่มคอลัมน์ buy_price จากตาราง price
          p.purchase_date,
          p.rubber_type
        FROM purchase p
        LEFT JOIN farmer f ON p.farmer_id = f.farmer_id
        LEFT JOIN price prc ON p.price_id = prc.price_id -- 👈 JOIN ตาราง price
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;

      // Map ค่า buy_price ออกไปเป็นทั้ง buy_price และ price_value ให้ Flutter อ่านง่ายขึ้น
      rows = rows.map(row => ({
        ...row,
        buy_price: Number(row.buy_price || 0),
        price_value: Number(row.buy_price || 0)
      }));

      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in PurchaseModel.getAllPurchases:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 3. เพิ่ม purchase (Create)
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

  // 📌 4. แก้ไข purchase (Update)
  static async updatePurchase(purchaseId, data) {
    try {
      const {
        farmer_id,
        weight_in = 0,
        weight_out = 0,
        rubber_weight,
        drc,
        net_weight,
        total_price,
        rubber_type = 'สด'
      } = data;

      const sql = `
        UPDATE purchase 
        SET farmer_id = ?, weight_in = ?, weight_out = ?, rubber_weight = ?, drc = ?, net_weight = ?, total_price = ?, rubber_type = ?
        WHERE purchase_id = ?
      `;

      await pool.query(sql, [
        farmer_id,
        weight_in,
        weight_out,
        rubber_weight,
        drc,
        net_weight,
        total_price,
        rubber_type,
        purchaseId
      ]);

      return { isError: false, message: 'แก้ไขรายการรับซื้อสำเร็จ' };
    } catch (error) {
      console.error('Error in PurchaseModel.updatePurchase:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 5. ลบ purchase (Delete)
  static async deletePurchase(purchaseId) {
    try {
      const sql = `DELETE FROM purchase WHERE purchase_id = ?`;
      await pool.query(sql, [purchaseId]);
      return { isError: false, message: 'ลบรายการรับซื้อสำเร็จ' };
    } catch (error) {
      console.error('Error in PurchaseModel.deletePurchase:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 6. แสดงจำนวน purchase แยกตาม price (Analytics)


  // 📌 แสดงจำนวน purchase แยกตาม price (Analytics)
  static async getPurchaseCountByPrice() {
  try {
    const sql = `
      SELECT 
        p.price_id,
        p.buy_price, -- 👈 แก้จุดนี้ให้ใช้ buy_price ตามตารางจริง
        CAST(COUNT(pr.purchase_id) AS UNSIGNED) AS total_purchases,
        CAST(COALESCE(SUM(pr.rubber_weight), 0) AS DOUBLE) AS total_weight,
        CAST(COALESCE(SUM(pr.total_price), 0) AS DOUBLE) AS grand_total_amount
      FROM price p
      LEFT JOIN purchase pr ON p.price_id = pr.price_id
      GROUP BY p.price_id, p.buy_price -- 👈 แก้จุดนี้ด้วย
      ORDER BY p.price_id DESC
    `;
    const result = await pool.query(sql);
    let rows = Array.isArray(result[0]) ? result[0] : result;

    rows = rows.map(row => ({
      ...row,
      price_id: String(row.price_id),
      price_value: Number(row.buy_price || 0), // 👈 แปลง buy_price ส่งออกเป็น price_value ให้ Flutter
      total_purchases: Number(row.total_purchases || 0),
      total_weight: Number(row.total_weight || 0),
      grand_total_amount: Number(row.grand_total_amount || 0)
    }));

    return { isError: false, data: rows };
  } catch (error) {
    console.error('Error in PurchaseModel.getPurchaseCountByPrice:', error);
    return { isError: true, errorMessage: error.message };
  }
}
static async getPurchaseCountByPrice() {
    try {
      const sql = `
        SELECT 
          pr.price_id,
          p.buy_price AS price_value,
          CAST(COUNT(pr.purchase_id) AS UNSIGNED) AS total_count,
          SUM(pr.rubber_weight) AS total_weight,
          SUM(pr.total_price) AS sum_amount
        FROM purchase pr
        JOIN price p ON pr.price_id = p.price_id
        GROUP BY pr.price_id, p.buy_price
        ORDER BY p.buy_price DESC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;

      rows = rows.map(row => ({
        price_id: row.price_id,
        price_value: Number(row.price_value) || 0,
        total_count: Number(row.total_count) || 0,
        total_weight: Number(row.total_weight) || 0,
        sum_amount: Number(row.sum_amount) || 0
      }));

      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in PurchaseModel.getPurchaseCountByPrice:', error);
      return { isError: true, errorMessage: error.message };
    }
  }
}


module.exports = PurchaseModel; 
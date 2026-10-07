const pool = require('../libs/db_pool');

class FarmerModel {
    // 📌 ฟังก์ชันสร้างรหัสเกษตรกรให้อัตโนมัติ (เช่น FM000000001)
    static async generateFarmerId() {
        try {
            const sql = `SELECT farmer_id FROM farmer ORDER BY farmer_id DESC LIMIT 1`;
            const result = await pool.query(sql);

            // 1. จัดการแยกค่า rows ออกมาให้ชัวร์ว่าได้ Array ของผลลัพธ์แน่นอน
            let rows = Array.isArray(result[0]) ? result[0] : result;

            // 2. ถ้ายังไม่มีข้อมูลในตาราง ให้เริ่มที่ FM000000001
            if (!rows || rows.length === 0 || !rows[0] || !rows[0].farmer_id) {
                return 'FM000000001';
            }

            // 3. ดึงค่า ID ล่าสุดมาแปลงเลข
            const lastId = String(rows[0].farmer_id);
            const numberPart = parseInt(lastId.replace(/[^0-9]/g, ''), 10);
            
            // ถ้าแปลงตัวเลขไม่ได้ ให้เริ่มที่ 1
            const nextNumber = isNaN(numberPart) ? 1 : numberPart + 1;

            // 4. รันรหัสใหม่พร้อมเติม 0 ข้างหน้าให้ครบ 9 หลัก
            return `FM${nextNumber.toString().padStart(9, '0')}`;
        } catch (error) {
            console.error('Error generating farmer ID:', error);
            throw error;
        }
    }

    // 📌 บันทึกข้อมูลเกษตรกร
    static async createFarmer(farmerData) {
        try {
            // สร้างรหัสอัตโนมัติหากไม่ได้ส่ง farmer_id มา
            const farmer_id = farmerData.farmer_id || (await this.generateFarmerId());
            const { farmer_name, address, phone, bank_number, bank_type } = farmerData;

            const sql = `
                INSERT INTO farmer (farmer_id, farmer_name, address, phone, bank_number, bank_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const result = await pool.query(sql, [
                farmer_id,
                farmer_name,
                address || null,
                phone || null,
                bank_number || null,
                bank_type || null
            ]);

            return { isError: false, data: result, generatedId: farmer_id };
        } catch (error) {
            console.error('Error in FarmerModel.createFarmer:', error);
            if (error.errno === 1062 || error.code === 'ER_DUP_ENTRY') {
                return { isError: true, errorMessage: 'รหัสเกษตรกรซ้ำในระบบ' };
            }
            return { isError: true, errorMessage: error.message };
        }
    }

    // 📌 ดึงรายการเกษตรกรทั้งหมด
    static async getAllFarmers() {
        try {
            const sql = `SELECT * FROM farmer ORDER BY farmer_id DESC`;
            const result = await pool.query(sql);

            // ปรับการแยก rows ให้รองรับ mysql2 และกรณีผลลัพธ์เป็น Array ชั้นเดียวหรือสองชั้น
            let rows = Array.isArray(result[0]) ? result[0] : result;

            return { isError: false, data: rows };
        } catch (error) {
            console.error('Error in FarmerModel.getAllFarmers:', error);
            return { isError: true, errorMessage: error.message };
        }
    }

    static async deleteFarmer(farmerId) {
    try {
      const sql = `DELETE FROM farmer WHERE farmer_id = ?`;
      const result = await pool.query(sql, [farmerId]);

      return { success: true, isError: false };
    } catch (error) {
      console.error('Error in FarmerModel.deleteFarmer:', error);
      return { success: false, isError: true, errorMessage: error.message };
    }
  }

  //  แก้ไขข้อมูลเกษตรกร
  static async updateFarmer(farmerId, updateData) {
    try {
      const {
        farmer_name,
        address,
        phone,
        bank_number,
        bank_type
      } = updateData;

      const sql = `
        UPDATE farmer 
        SET farmer_name = ?, 
            address = ?, 
            phone = ?, 
            bank_number = ?, 
            bank_type = ?
        WHERE farmer_id = ?
      `;

      const params = [
        farmer_name,
        address,
        phone,
        bank_number,
        bank_type,
        farmerId
      ];

      const result = await pool.query(sql, params);

      return { success: true, isError: false };
    } catch (error) {
      console.error('Error in FarmerModel.updateFarmer:', error);
      return { success: false, isError: true, errorMessage: error.message };
    }
  }

  static async getFarmerTestSummary() {
    let conn;
    let result;
    try {
      conn = await pool.getConnection();
      const sql = `
        SELECT 
          f.farmer_id,
          f.farmer_name,
          COUNT(t.test_id) AS total_tests,
          AVG(t.drc) AS avg_drc
        FROM test t
        JOIN purchase p ON t.purchase_id = p.purchase_id
        JOIN farmer f ON p.farmer_id = f.farmer_id
        GROUP BY f.farmer_id, f.farmer_name
      `;
      const [rows] = await conn.query(sql);
      result = { isError: false, data: rows, errorMessage: "" };
    } catch (error) {
      result = { isError: true, data: [], errorMessage: error.message };
    } finally {
      if (conn) conn.release();
      return result;
    }
  }
}

module.exports = FarmerModel;
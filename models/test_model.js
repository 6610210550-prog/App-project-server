const pool = require('../libs/db_pool');

class TestModel {
  // 📌 1. ดึงรายการรับซื้อที่ยังไม่ได้ตรวจคุณภาพ
  static async getPendingPurchases() {
    try {
      const sql = `
        SELECT 
          p.purchase_id,
          p.farmer_id,
          f.farmer_name,
          p.rubber_weight,
          p.drc AS purchase_drc,
          p.total_price,
          p.purchase_date
        FROM purchase p
        LEFT JOIN farmer f ON p.farmer_id = f.farmer_id
        LEFT JOIN test t ON p.purchase_id = t.purchase_id
        WHERE t.test_id IS NULL  -- ดึงเฉพาะรายการที่ยังไม่มีในตาราง test
        ORDER BY p.purchase_date DESC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;
      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in TestModel.getPendingPurchases:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 2. [Scope 1: แสดงข้อมูล Test] ดึงรายการผลการตรวจคุณภาพทั้งหมด
  static async getAllTests() {
    try {
      const sql = `
        SELECT 
          t.test_id,
          t.purchase_id,
          t.ammonia,
          t.vfa,
          t.magnesium,
          t.drc,
          t.test_date,
          t.result_status,
          t.result_approve,
          f.farmer_name,
          p.rubber_weight
        FROM test t
        LEFT JOIN purchase p ON t.purchase_id = p.purchase_id
        LEFT JOIN farmer f ON p.farmer_id = f.farmer_id
        ORDER BY t.test_id DESC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;
      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in TestModel.getAllTests:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 3. [Scope 2: เพิ่มข้อมูล Test] บันทึกผลการตรวจคุณภาพน้ำยาง
  static async createTest(testData) {
    try {
      const {
        purchase_id,
        ammonia,
        vfa,
        magnesium,
        drc,
        result_status,
        result_approve
      } = testData;

      const today = new Date().toISOString().split('T')[0];

      const sql = `
        INSERT INTO test (
          purchase_id, ammonia, vfa, magnesium, drc, 
          test_date, result_status, result_approve
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        purchase_id,
        ammonia || null,
        vfa || null,
        magnesium || null,
        drc || null,
        today,
        result_status || 'PASS',
        result_approve || 'PENDING'
      ];

      const result = await pool.query(sql, params);
      const insertId = result[0]?.insertId || result.insertId;

      return {
        isError: false,
        generatedId: Number(insertId)
      };
    } catch (error) {
      console.error('Error in TestModel.createTest:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 4. [Scope 3: แก้ไขข้อมูล Test]
  static async updateTest(testId, testData) {
    try {
      const { ammonia, vfa, magnesium, drc, result_status, result_approve } = testData;

      const sql = `
        UPDATE test 
        SET ammonia = ?, vfa = ?, magnesium = ?, drc = ?, result_status = ?, result_approve = ?
        WHERE test_id = ?
      `;

      const params = [
        ammonia || null,
        vfa || null,
        magnesium || null,
        drc || null,
        result_status || 'PASS',
        result_approve || 'PENDING',
        testId
      ];

      await pool.query(sql, params);
      return { isError: false, message: 'แก้ไขข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Error in TestModel.updateTest:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 5. [Scope 4: ลบข้อมูล Test]
  static async deleteTest(testId) {
    try {
      const sql = `DELETE FROM test WHERE test_id = ?`;
      await pool.query(sql, [testId]);
      return { isError: false, message: 'ลบข้อมูลสำเร็จ' };
    } catch (error) {
      console.error('Error in TestModel.deleteTest:', error);
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 6. แสดงจำนวน Test แยกตาม Farmer
 // 📌 แก้ไขฟังก์ชัน getTestCountByFarmer ใน models/test_model.js
static async getTestCountByFarmer() {
  try {
    const sql = `
      SELECT 
        f.farmer_id,
        f.farmer_name,
        CAST(COUNT(t.test_id) AS UNSIGNED) AS total_tests  -- 👈 ใช้ CAST แปลง BigInt เป็น Unsigned Int
      FROM farmer f
      LEFT JOIN purchase p ON f.farmer_id = p.farmer_id
      LEFT JOIN test t ON p.purchase_id = t.purchase_id
      GROUP BY f.farmer_id, f.farmer_name
      ORDER BY total_tests DESC
    `;
    const result = await pool.query(sql);
    let rows = Array.isArray(result[0]) ? result[0] : result;
    
    // แปลง BigInt เป็น Number อีกชั้นเผื่อ Driver คืนค่าเป็น BigInt
    rows = rows.map(row => ({
      ...row,
      total_tests: Number(row.total_tests)
    }));

    return { isError: false, data: rows };
  } catch (error) {
    console.error('Error in TestModel.getTestCountByFarmer:', error);
    return { isError: true, errorMessage: error.message };
  }
}

// 📌 ดึงรายการตรวจคุณภาพ แยกตามเกษตรกร (หรือค้นหาด้วยชื่อ/รหัส)
static async getTestsByFarmer(searchQuery = '') {
  try {
    const sql = `
      SELECT 
        t.test_id,
        t.purchase_id,
        t.ammonia,
        t.vfa,
        t.magnesium,
        t.drc,
        t.test_date,
        t.result_status,
        t.result_approve,
        f.farmer_id,
        f.farmer_name,
        p.rubber_weight
      FROM test t
      JOIN purchase p ON t.purchase_id = p.purchase_id
      JOIN farmer f ON p.farmer_id = f.farmer_id
      WHERE f.farmer_name LIKE ? OR f.farmer_id LIKE ?
      ORDER BY t.test_date DESC, t.test_id DESC
    `;
    const searchParam = `%${searchQuery}%`;
    const result = await pool.query(sql, [searchParam, searchParam]);
    let rows = Array.isArray(result[0]) ? result[0] : result;
    return { isError: false, data: rows };
  } catch (error) {
    console.error('Error in TestModel.getTestsByFarmer:', error);
    return { isError: true, errorMessage: error.message };
  }
}

static async getFarmerTestSummary() {
    try {
      const sql = `
        SELECT 
          f.farmer_id,
          f.farmer_name,
          ROUND(AVG(t.drc), 2) AS avg_drc,
          CAST(COUNT(t.test_id) AS UNSIGNED) AS total_tests
        FROM test t
        JOIN purchase p ON t.purchase_id = p.purchase_id
        JOIN farmer f ON p.farmer_id = f.farmer_id
        GROUP BY f.farmer_id, f.farmer_name
        ORDER BY avg_drc DESC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;

      rows = rows.map(row => ({
        farmer_id: row.farmer_id,
        farmer_name: row.farmer_name,
        avg_drc: Number(row.avg_drc) || 0,
        total_tests: Number(row.total_tests) || 0
      }));

      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in TestModel.getFarmerTestSummary:', error);
      return { isError: true, errorMessage: error.message };
    }
  }
}

module.exports = TestModel;
const pool = require('../libs/db_pool');

class CarModel {
  // 📌 บันทึกข้อมูลรถของเกษตรกร
  static async createCar(carData) {
    try {
      const { car_number, farmer_id, color, province, cartype_id } = carData;

      const sql = `
        INSERT INTO car (car_number, farmer_id, color, province, cartype_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = await pool.query(sql, [
        car_number,
        farmer_id,
        color || null,
        province || null,
        cartype_id || 1 // ค่าเริ่มต้นประเภทรถ
      ]);

      return { isError: false, data: result };
    } catch (error) {
      console.error('Error in CarModel.createCar:', error);
      if (error.errno === 1062 || error.code === 'ER_DUP_ENTRY') {
        return { isError: true, errorMessage: 'ทะเบียนรถนี้มีในระบบแล้ว' };
      }
      return { isError: true, errorMessage: error.message };
    }
  }

  // 📌 ดึงรายการรถของเกษตรกรตาม farmer_id
  static async getCarsByFarmerId(farmer_id) {
    try {
      const sql = `SELECT * FROM car WHERE farmer_id = ?`;
      const result = await pool.query(sql, [farmer_id]);
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      return { isError: false, data: rows };
    } catch (error) {
      return { isError: true, errorMessage: error.message };
    }
  }
  static async getCarsByFarmerId(farmer_id) {
    try {
        const sql = `
            SELECT c.car_number, c.color, c.province, ct.cartype_name 
            FROM car c
            LEFT JOIN cartype ct ON c.cartype_id = ct.cartype_id
            WHERE c.farmer_id = ?
            ORDER BY c.car_number ASC
        `;
        const result = await pool.query(sql, [farmer_id]);
        let rows = Array.isArray(result[0]) ? result[0] : result;
        return { isError: false, data: rows };
    } catch (error) {
        console.error('Error in CarModel.getCarsByFarmerId:', error);
        return { isError: true, errorMessage: error.message };
    }
}

  // 📌 1. ดึงรายการรถทั้งหมด พร้อมชื่อเกษตรกร (สำหรับ Dropdown หน้ารับซื้อ)
  static async getAllCars() {
    try {
      const sql = `
        SELECT 
          c.car_number, 
          c.province, 
          c.farmer_id, 
          f.farmer_name
        FROM car c
        LEFT JOIN farmer f ON c.farmer_id = f.farmer_id
        ORDER BY c.car_number ASC
      `;
      const result = await pool.query(sql);
      let rows = Array.isArray(result[0]) ? result[0] : result;
      return { isError: false, data: rows };
    } catch (error) {
      console.error('Error in CarModel.getAllCars:', error);
      return { isError: true, errorMessage: error.message };
    }
  }
}



module.exports = CarModel;
const http = require('http');
const bp = require('body-parser');
const express = require('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUntils = require('./libs/date_untils');
const priceModel = require('./models/price_model');
const farmerModel = require('./models/farmer_model');
const carModel = require('./models/car_model');
const cors = require('cors');
const purchaseModel = require('./models/purchase_model');

const app = express();
app.use(cors());
app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());

const hostname = '127.0.0.1';
const port = 3000;

app.get("/api/users", (req, res) => {
    var response = {
        isError: true,
        data: "You are unauthorized for this data"
    };
    res.send(JSON.stringify(response));
});

app.post("/api/multiple_by_2", (req, res) => {
    var response = {
        isError: false,
        data: {
            no1: req.body.no_1 * 2,
            no2: req.body.no_2 * 2
        }
    };
    res.send(JSON.stringify(response));
});

app.get("/api/user/:accountId", async (req, res) => {
    const accountId = req.params.accountId;
    const response = await userAccountModel.getUserAccountById(accountId);
    res.send(JSON.stringify(response));
});

app.post("/api/authen/authen_request", async (req, res) => {
    console.log(req.body.authen_request);
    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.checkAuthenRequest(authenRequest);
    console.log(result);

    let response;
    if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };
    } else {
        var payload = { username: result.data[0].account_username };
        const authenToken = jwt.sign(payload);
        response = {
            isError: false,
            data: authenToken,
            errorMessage: ""
        };
    }

    res.send(JSON.stringify(response));
});

app.post("/api/authen/access_request", async (req, res) => {
    const authenSignature = req.body.authen_signature;
    const authenToken = req.body.authen_token;

    const decoded = await jwt.verify(authenToken);

    let response;

    if (decoded) {
        const result = await userAccountModel.checkAccessRequest(authenSignature, authenToken);
        console.log(result);

        if (result.isError) {
            response = {
                isError: true,
                data: "",
                errorMessage: result.errorMessage
            };
        } else {
            var payload = {
                user_id: result.data[0].account_id,
                username: result.data[0].account_username,
                date: dateUntils.getCurrentDateForToken()
            };
            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data: {
                    access_token: accessToken,
                },
                errorMessage: ""
            };
        }
    } else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ข้อมูลไม่ถูกต้อง"
        };
    }

    res.send(JSON.stringify(response));
});

app.post("/api/price/save_price", async (req, res) => {
    const buyPrice = req.body.buy_price;

    let response;
    
    if (!buyPrice || isNaN(buyPrice) || buyPrice <= 0) {
        response = {
            isError: true,
            data: "",
            errorMessage: "กรุณากรอกราคารับซื้อที่ถูกต้อง"
        };
    } else {
        const result = await priceModel.savePrice(buyPrice);
        
        if (result.isError) {
            response = {
                isError: true,
                data: "",
                errorMessage: result.errorMessage
            };
        } else {
            response = {
                isError: false,
                data: "บันทึกราคารับซื้อสำเร็จ",
                errorMessage: ""
            };
        }
    }

    res.send(JSON.stringify(response));
});

app.get("/api/price/get_today_price", async (req, res) => {
    let response;
    try {
        const todayPrice = await priceModel.getTodayPrice();
        response = {
            isError: false,
            data: todayPrice,
            errorMessage: ""
        };
    } catch (err) {
        response = {
            isError: true,
            data: null,
            errorMessage: err.message
        };
    }

    res.send(JSON.stringify(response));
});

// 📌 API ลงทะเบียนเกษตรกร
app.post("/api/farmer/register", async (req, res) => {
    let response;
    try {
        const { farmer_name, address, phone, bank_number, bank_type } = req.body;

        if (!farmer_name) {
            response = {
                isError: true,
                data: "",
                errorMessage: "กรุณากรอกชื่อ-นามสกุล"
            };
            return res.send(JSON.stringify(response));
        }

        if (farmer_name.length > 100) {
            response = { isError: true, data: "", errorMessage: "ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร" };
            return res.send(JSON.stringify(response));
        }

        const result = await farmerModel.createFarmer({
            farmer_name: farmer_name.trim(),
            address: address ? address.trim() : "",
            phone: phone ? phone.trim() : "",
            bank_number: bank_number ? bank_number.trim() : "",
            bank_type: bank_type ? bank_type.trim() : ""
        });

        if (result.isError) {
            response = {
                isError: true,
                data: "",
                errorMessage: result.errorMessage
            };
        } else {
            response = {
                isError: false,
                data: `ลงทะเบียนสำเร็จ รหัสเกษตรกรคือ: ${result.generatedId}`,
                errorMessage: ""
            };
        }
    } catch (err) {
        response = {
            isError: true,
            data: "",
            errorMessage: err.message
        };
    }

    res.send(JSON.stringify(response));
});

// 📌 API ดึงรายชื่อเกษตรกรทั้งหมด (เพิ่มส่วนนี้)
app.get("/api/farmer/list", async (req, res) => {
    let response;
    try {
        const result = await farmerModel.getAllFarmers();
        if (result.isError) {
            response = { isError: true, data: [], errorMessage: result.errorMessage };
        } else {
            response = { isError: false, data: result.data, errorMessage: "" };
        }
    } catch (err) {
        response = { isError: true, data: [], errorMessage: err.message };
    }
    res.send(JSON.stringify(response));
});

// 📌 API ลงทะเบียนรถ
app.post("/api/car/register", async (req, res) => {
    let response;
    try {
        const { car_number, farmer_id, color, province, cartype_id } = req.body;

        if (!car_number || !farmer_id) {
            response = {
                isError: true,
                data: "",
                errorMessage: "กรุณากรอกทะเบียนรถและเลือกเกษตรกร"
            };
            return res.send(JSON.stringify(response));
        }

        const result = await carModel.createCar({
            car_number: car_number.trim(),
            farmer_id: farmer_id.trim(),
            color: color ? color.trim() : "",
            province: province ? province.trim() : "",
            cartype_id: cartype_id || 1
        });

        if (result.isError) {
            response = { isError: true, data: "", errorMessage: result.errorMessage };
        } else {
            response = { isError: false, data: "บันทึกข้อมูลรถเรียบร้อยแล้ว", errorMessage: "" };
        }
    } catch (err) {
        response = { isError: true, data: "", errorMessage: err.message };
    }

    res.send(JSON.stringify(response));
});

//API ดึงรายการรถของเกษตรกรรายคน
app.get("/api/car/list/:farmerId", async (req, res) => {
    let response;
    try {
        const farmerId = req.params.farmerId;
        const result = await carModel.getCarsByFarmerId(farmerId);
        
        if (result.isError) {
            response = { isError: true, data: [], errorMessage: result.errorMessage };
        } else {
            response = { isError: false, data: result.data, errorMessage: "" };
        }
    } catch (err) {
        response = { isError: true, data: [], errorMessage: err.message };
    }
    res.send(JSON.stringify(response));
});

app.post("/api/purchase/save_purchase", async (req, res) => {
  try {
    const { farmer_id, weight_in, weight_out, rubber_weight, drc, total_price } = req.body;

    // 📌 เช็กว่ามีค่าส่งมาจริงไหม (รองรับค่าตัวเลขที่ไม่ใช่ null/undefined)
    if (!farmer_id || rubber_weight == null || drc == null || total_price == null) {
      return res.status(400).json({
        isError: true,
        errorMessage: "กรุณากรอกข้อมูลการรับซื้อให้ครบถ้วน"
      });
    }

    const result = await purchaseModel.savePurchase(req.body);

    if (result.isError) {
      console.error("Database Error Detail:", result.errorMessage);
      return res.status(500).json({
        isError: true,
        errorMessage: result.errorMessage
      });
    }

    return res.status(200).json({
      isError: false,
      data: "บันทึกข้อมูลการรับซื้อเรียบร้อยแล้ว",
      purchaseId: result.generatedId
    });

  } catch (err) {
    console.error("Error in save_purchase route:", err);
    return res.status(500).json({ isError: true, errorMessage: err.message });
  }
});

app.get("/api/car/get_all_cars", async (req, res) => {
    let response;
    try {
        const result = await carModel.getAllCars();
        if (result.isError) {
            response = { isError: true, data: [], errorMessage: result.errorMessage };
        } else {
            response = { isError: false, data: result.data, errorMessage: "" };
        }
    } catch (err) {
        response = { isError: true, data: [], errorMessage: err.message };
    }
    res.send(JSON.stringify(response));
});

app.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
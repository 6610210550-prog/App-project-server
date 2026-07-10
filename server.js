const http = require('http');
const bp = require('body-parser');
const express = require ('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUntils = require('./libs/date_untils');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bp.urlencoded({ extended: true}));
app.use(bp.json());

const hostname = '127.0.0.1';
const port = 3000;

app.get("/api/users", (req,res) => {
    var response = {
        isError: true,
        data:"You are unauthorized for this data"
    };
    res.send(JSON.stringify(response));
});

app.post("/api/multiple_by_2",(req,res) => {
    var response = {
        isError: false,
        data: {
            no1: req.body.no_1 * 2,
            no2: req.body.no_2 * 2
        }
    };
    res.send(JSON.stringify(response));
});

// const server = http.createServer   ((req,res)=> {
//     res.statuscode = 200;
//     res.setHeader('Content-type','text/plain');
//     res.end('Hello Uncle');
// });

app.get("/api/user/:accountId", async (req,res) => {
    const accountId = req.params.accountId;
    const response = await userAccountModel.getUserAccountById(accountId);
    res.send(JSON.stringify(response));
});

app.post("/api/authen/authen_request",async (req,res) => {
    console.log(req.body.authen_request);
    const authenRequest = req.body.authen_request;
    const result =  await userAccountModel.checkAuthenRequest(authenRequest);
    console.log(result);

    if (result.isError){
        response = { isError: true,data:"",errorMessage: result.errorMessage};
        
    }else{
        var payload = { username: result.data[0].account_username }
        const authenToken = jwt.sign(payload);
        response = {
            isError:false,
            data:authenToken,
            errorMessage:""
        }
    }

    res.send(JSON.stringify(response));
});

app.post("/api/authen/access_request", async (req,res) => {
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
            }
        } else {
            var payload ={
                user_id: result.data[0].account_id,
                username: result.data[0].account_username,
                image_url: result.data[0].account_image_url,
                date: dateUntils.getCurrentDateForToken()
            };
            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data:{
                    access_token: accessToken,
                    image_url: result.data[0].account_image_url
                },
                errorMessage: ""
            }
        }
    }else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ข้อมูลไม่ถูกต้อง"
        }
    }

    res.send(JSON.stringify(response));
});

app.listen(port,  () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});


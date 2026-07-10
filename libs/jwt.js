var jwt = require('jsonwebtoken');
var secretKey = "MySecretKey";

module.exports = {
    sign(playload) {
        let token = jwt.sign(playload, secretKey,{
            expiresIn : '1d'
        });
        return token;
    },

    verify(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secretKey, (err, decoded) => {
                if (err){
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }
}
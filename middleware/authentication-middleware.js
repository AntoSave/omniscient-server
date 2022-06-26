const jwt = require("jsonwebtoken");
const postgres = require('../postgres')

verifyTokenMiddleware = (req, res, next) => {
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(401).send({
      status:"ERROR",
      message: "No token provided!"
    });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        status:"ERROR",
        message: "Invalid token!"
      });
    }
    req.username = decoded.username;
    next();
  });
};

userOwnsSensor = (username,sensor_id) => {
  const query = 'SELECT * FROM SENSORS WHERE id=$1 and room_user=$2'
  const data = [sensor_id, username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return false
    }
    if(result.rowCount==0){
      return false
    }
    return true
  })
}

userOwnsSensorMiddleware = (sensor_id) => (req,res,next) => {
  if(!req.username){
    return res.status(401).send({
      status:"ERROR",
      message: "Unauthorized!"
    });
  }

  const query = 'SELECT * FROM SENSORS WHERE id=$1 and room_user=$2'
  const data = [sensor_id, req.username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return res.status(400).json({status: "ERROR", error: error, stack: error.stack, message: error.message})
    }
    if(result.rowCount==0){
      return res.status(403).json({status: "ERROR", message: "Forbidden access"})
    }
    next()
  })
}



module.exports = {
  verifyTokenMiddleware,
  userOwnsSensorMiddleware,
  userOwnsSensor
};
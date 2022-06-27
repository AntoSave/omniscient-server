const { consoleLogger } = require("@influxdata/influxdb-client");
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

userOwnsSensor = async (username,sensor_id) => {
  const query = 'SELECT * FROM SENSORS WHERE id=$1 and room_user=$2'
  const data = [sensor_id, username]
  try{
    let result = await postgres.getClient().query(query, data)
    console.log(username,sensor_id,result.rowCount,result.rowCount != 0)
    return (result.rowCount != 0)
  } catch (ex) {
    console.log("Exception",ex.message)
    return false
  }
}

userOwnsSensorMiddleware = (req,res,next) => {
  if(!req.username){
    return res.status(401).send({
      status:"ERROR",
      message: "Unauthorized!"
    });
  }
  if(!req.body.id){
    return res.status(400).send({
      status:"ERROR",
      message: "Bad request!"
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

verifyToken = (req) => {
  let token = req.headers["x-access-token"];
  if (!token) {
    return false;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.username = decoded.username;
    return true;
  } catch (ex) { 
  console.log(ex.message)
  return false
  }
};

module.exports = {
  verifyTokenMiddleware,
  userOwnsSensorMiddleware,
  userOwnsSensor,
  verifyToken
};
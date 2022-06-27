const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const influx = require('../influx')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();
const {verifyTokenMiddleware} = require('../middleware/authentication-middleware')
const actuatorSchema = {
	type: "object",
	required: ["id","name","type"],
	properties: {
		id: {
			type: "string",
			minLength: 1
		},
    name: {
			type: "string",
			minLength: 1
		},
    type: {
			type: "string",
			minLength: 1
		}
  }
};
const actuatorPKSchema = {
	type: "object",
	required: ["id"],
	properties: {
		id: {
			type: "string",
			minLength: 1
		}
  }
};

/*Restituisce tutti i sensori dell'utente*/
router.get("/", [verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const query = 'SELECT * FROM ACTUATORS WHERE owner=$1'
  const data = [username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      res.status(200).json([...result.rows])
    }
    next()
  })
})

router.post("/", [validate({ body: actuatorSchema }),verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'INSERT INTO ACTUATORS(id,"name",type,owner) VALUES ($1,$2,$3,$4)'
  const data = [payload.id,payload.name,payload.type,username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      res.status(200).json({status: "SUCCESS", rows_number:result.rowCount})
    }
    next()
  })
})

router.delete("/", [validate({ body: actuatorPKSchema }),verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'DELETE FROM ACTUATORS WHERE "id" = $1 AND "owner"= $2'
  const data = [payload.id,username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      res.status(200).json({status: "SUCCESS", rows_number:result.rowCount})
    }
    next()
  })
})

module.exports = router
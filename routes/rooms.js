const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();

const roomSchema = {
	type: "object",
	required: ["name"],
	properties: {
		name: {
			type: "string",
			minLength: 1
		}
  }
};


router.get("/", (req,res,next) => {
  let username = 'default'
  const query = 'SELECT * FROM ROOMS WHERE "user"=$1'
  const data = [username]
  console.log("GETTING ROOMS:",...data)
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

router.post("/", validate({ body: roomSchema }), (req,res,next) => {
  let username = 'default'
  const payload = req.body
  const query = 'INSERT INTO ROOMS("name","user") VALUES ($1,$2)'
  const data = [payload.name,username]
  console.log("CREATING ROOM:",...data)
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

router.delete("/", validate({ body: roomSchema }), (req,res,next) => {
  let username = 'default'
  const payload = req.body
  const query = 'DELETE FROM ROOMS WHERE "name" = $1 AND "user" = $2'
  const data = [payload.name,username]
  console.log("DELETING ROOM:",...data)
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

//Il metodo di update per ora è omesso: un update si può fare con una cancellazione e una creazione

module.exports = router
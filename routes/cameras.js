const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();
const {verifyTokenMiddleware} = require('../middleware/authentication-middleware')

const cameraSchema = {
	type: "object",
	required: ["name", "room_name", "domain", "port"],
	properties: {
		name: {
			type: "string",
			minLength: 1
		},
		room_name: {
			type: "string",
			minLength: 1
		},
    domain: {
			type: "string",
			minLength: 1
		},
    port: {
			type: "string",
			minLength: 1
		},
    username: {
			type: "string",
			minLength: 1
		},
    password: {
			type: "string",
			minLength: 1
		}
	},
};

const cameraPKSchema = {
	type: "object",
	required: ["name", "room_name"],
	properties: {
		name: {
			type: "string",
			minLength: 1
		},
		room_name: {
			type: "string",
			minLength: 1
		}
  }
};

/*Restituisce tutte le telecamere dell'utente*/
router.get("/", [verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const query = 'SELECT * FROM CAMERAS WHERE room_user=$1'
  const data = [username]
  console.log("GETTING CAMERAS:",...data)
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

/*Aggiunge una telecamera all'utente*/
router.post("/", [validate({ body: cameraSchema }), verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'INSERT INTO CAMERAS("name",room_name,room_user,domain,port,username,password) VALUES ($1,$2,$3,$4,$5,$6,$7)'
  const data = [payload.name,payload.room_name,username,payload.domain,payload.port,payload.username,payload.password]
  console.log("CREATING CAMERA:",...data)
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

/*Elimina una telecamera dell'utente*/
router.delete("/", [validate({ body: cameraPKSchema }),verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'DELETE FROM CAMERAS WHERE "name" = $1 AND room_name = $2 AND room_user = $3'
  const data = [payload.name,payload.room_name,username]
  console.log("DELETING CAMERA:",...data)
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
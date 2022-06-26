const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const { Validator } = require("express-json-validator-middleware");
const { verifyTokenMiddleware } = require('../middleware/authentication-middleware');
const { validate } = new Validator();

const roomSchema = {
	type: "object",
	required: ["name","color"],
	properties: {
		name: {
			type: "string",
			minLength: 1
		},
    color:{
      type: "object",
      properties:{
        red: {
          type: "number"
        },
        blue: {
          type: "number"
        },
        green: {
          type: "number"
        },
        alpha: {
          type: "number"
        }
      },
      required:["red","blue","green","alpha"]
    }
    
  }
};
const roomPKSchema = {
	type: "object",
	required: ["name"],
	properties: {
		name: {
			type: "string",
			minLength: 1
		}
  }
};

/*Restituisce tutte le stanze dell'utente*/
router.get("/", [verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const query = 'SELECT * FROM ROOMS WHERE "user"=$1'
  const data = [username]
  console.log("GETTING ROOMS:",...data)
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      res.status(200).json(result.rows.map((value,index,array) => {
        return {
          name:value.name,
          user:value.user,
          color:{
            red:value.colorRed,
            blue:value.colorBlue,
            green:value.colorGreen,
            alpha:value.colorAlpha
          }
        }
      }))
    }
    next()
  })
})

/*Aggiunge una stanza all'utente*/
router.post("/", [validate({ body: roomSchema }), verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'INSERT INTO ROOMS("name","user","colorRed","colorGreen","colorBlue","colorAlpha") VALUES ($1,$2,$3,$4,$5,$6)'
  const data = [payload.name,username,payload.color.red,payload.color.green,payload.color.blue,payload.color.alpha]
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

/*Elimina una stanza dell'utente*/
router.delete("/", [validate({ body: roomPKSchema }), verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
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
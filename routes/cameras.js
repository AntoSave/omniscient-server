const express = require('express')
const router = express.Router()
const postgres = require('./postgres')
const { Validator } = require("express-json-validator-middleware");
const { response } = require('express');
const { validate } = new Validator();

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

router.get("/", (req,res) => {
  res.send("Cameras endpoint")
})

router.post("/create", validate({ body:cameraSchema }), (req,res,next) => {
  const payload = req.body
  const query = 'INSERT INTO CAMERAS("name",room_name,room_user,domain,port,username,password) VALUES ($1,$2,$3,$4,$5,$6,$7)'
  const data = [payload.name,payload.room_name,'default',payload.domain,payload.port,payload.username,payload.password]
  client.query(query, data, (err,res) => {
    if(err){
      response.status(400).json({status: "ERROR", error: err, stack:err.stack})
    }
    else {
      response.status(200).json({status: "SUCCESS", res:res})
    }
    next()
  })
})

module.exports = router
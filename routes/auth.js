const express = require('express')
const router = express.Router()
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const postgres = require('../postgres')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();

const userSchema = {
	type: "object",
	required: ["username","password","email"],
	properties: {
		username: {
			type: "string",
			minLength: 1
		},
    password: {
			type: "string",
			minLength: 1
		},
    email: {
			type: "string",
			minLength: 1
		}
  }
};

const loginSchema = {
	type: "object",
	required: ["username","password"],
	properties: {
		username: {
			type: "string",
			minLength: 1
		},
    password: {
			type: "string",
			minLength: 1
		}
  }
};

router.post('/signup', validate({ body: userSchema }), (req,res,next) => {
  const payload = req.body
  const query = 'INSERT INTO USERS(username,password,email,signup_date) VALUES ($1,$2,$3,current_date)'
  const data = [payload.username, bcrypt.hashSync(payload.password, 8), payload.email]

  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return res.status(400).json({status: "ERROR", error: error, stack: error.stack, message: error.message})
    }
    res.status(200).json({status: "SUCCESS", message: "User was registered successfully"})
    next()
  })
})

router.post('/login', validate({ body: loginSchema }), (req,res) => {
  const payload = req.body
  const query = 'SELECT password FROM USERS WHERE username = $1'
  const data = [payload.username]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return res.status(400).json({status: "ERROR", message: error.message})
    }
    if(result.rows.length==0){
      return res.status(400).json({status: "ERROR", message: "User not found"})
    }
    var passwordIsValid = bcrypt.compareSync(
      payload.password,
      result.rows[0].password
    );
    if (!passwordIsValid) {
      return res.status(401).json({
        accessToken: null,
        message: "Invalid Password!"
      })
    }
    var token = jwt.sign({ username: payload.username }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 hours
    })
    return res.status(200).json({
      username: payload.username,
      accessToken: token
    })
  })
})

module.exports = router
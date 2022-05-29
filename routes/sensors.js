const express = require('express')
const router = express.Router()
const postgres = require('../postgres')

router.get("/", (req,res,next) => {
  let username = 'default'
  const query = 'SELECT * FROM SENSORS WHERE room_user=$1'
  const data = [username]
  console.log("GETTING SENSORS:",...data)
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

module.exports = router
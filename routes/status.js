const express = require('express')
const router = express.Router()
const influx = require('../influx')
const {Point} = require('@influxdata/influxdb-client')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();
const mqttClient = require('../mqtt')

const setAlarmedSchema = {
	type: "object",
	required: ["setAlarmed"],
	properties: {
		setAlarmed: {
			type: "boolean"
		}
  }
};

router.get("/alarmed", [verifyTokenMiddleware], (req,res)=>{
  let username = req.username
  const fluxQuery =
  `from(bucket:"admin")
    |> range(start: -1y)
    |> filter(fn: (r) => r["_measurement"] == "system_status" and r["username"] == "${username}" and r["_field"] == "alarmed")
    |> last()`
  var alarmed = false
  influx.queryApi.queryRows(fluxQuery,{
    next: (row,tableMeta) => {
      const o = tableMeta.toObject(row)
      alarmed=o._value
    },
    error: error => res.status(400).json({status:"ERROR", message:"Couldn't get status"}),
    complete: () => res.status(200).json({isAlarmed:alarmed})
  })
  return
})

router.post("/alarmed", [validate({ body: setAlarmedSchema }), verifyTokenMiddleware], (req,res)=>{
  let username = req.username
  let payload = req.body
  let point = new Point('system_status')
    .tag('username',username)
    .booleanField('alarmed',payload.setAlarmed)
  let writeApi = influx.getWriteApi('admin')
  writeApi.writePoint(point)
  writeApi.close().then(()=>{
    //Disattiva i buzzer dell'utente se l'allarme è disattivato
    if(payload.setAlarmed==false){
      const query = 
        `SELECT A.id
        FROM ACTUATORS
        WHERE A.type='BUZZER'
        AND A.owner=$1`
      const data = [username]
      postgres.getClient().query(query, data, (error,result) => {
        if(error){
          console.log(error)
          return res.status(400).json({status:"ERROR", message:"Couldn't disable buzzers"})
        }
        result.rows.forEach(element => {mqttClient.publish(`NOCTUA/BUZZER/${element.id}/STATE`,'OFF')})
        return res.status(200).json({status:"SUCCESS", message:"Status was set successfully"})
      })
    }
    else return res.status(200).json({status:"SUCCESS", message:"Status was set successfully"})
  }).catch((error)=>{
    return res.status(400).json({status:"ERROR", message:"Couldn't set status"})
  })
})

module.exports = router
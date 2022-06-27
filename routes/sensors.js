const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const influx = require('../influx')
const { Validator } = require("express-json-validator-middleware");
const { validate } = new Validator();
const {verifyTokenMiddleware, userOwnsSensorMiddleware} = require('../middleware/authentication-middleware')

const sensorSchema = {
	type: "object",
	required: ["id","name","type","room_name"],
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
		},
    room_name: {
			type: "string",
			minLength: 1
		},
  }
};
const sensorPKSchema = {
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

router.post("/", [validate({ body: sensorSchema }),verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'INSERT INTO SENSORS(id,"name",type,room_name,room_user) VALUES ($1,$2,$3,$4,$5)'
  const data = [payload.id,payload.name,payload.type,payload.room_name,username]
  console.log("CREATING SENSOR:",...data)
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

router.delete("/", [validate({ body: sensorPKSchema }),verifyTokenMiddleware], (req,res,next) => {
  let username = req.username
  const payload = req.body
  const query = 'DELETE FROM SENSORS WHERE "id" = $1 AND "room_user"= $2'
  const data = [payload.id,username]
  console.log("DELETING SENSOR:",...data)
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

/*Restituisce lo stato attuale di tutti i sensori*/
router.get("/state", [verifyTokenMiddleware], (req,res,next) => {
  //console.log(process.env.STACKHERO_INFLUXDB_HOST,process.env.STACKHERO_INFLUXDB_ADMIN_ORGANIZATION,process.env.INFLUX_API_TOKEN)
  let username = req.username
  let state = {
    sensor_status:{},
    analog_sensor_data:{},
    digital_sensor_data:{}
  }
  /*FETCH SENSOR STATUS*/
  const promise1 = new Promise((resolve,reject) => {
    var query=`
    from(bucket:"admin")
      |> range(start: -1y)
      |> filter(fn:(r) => r["_measurement"] == "sensor_status" and r["_field"] == "connection_status")
      |> group(columns: ["sensor_id"])
      |> last()
    `
    //console.log("SENSOR STATUS")
    influx.queryApi.queryRows(query,{
      next: (row,tableMeta) => {
        const o = tableMeta.toObject(row)
        //console.log(o)
        state.sensor_status[o.sensor_id]={
          id:o.sensor_id,
          status:o._value
        }
      },
      error: error => reject(error),
      complete: () => resolve()
    })
  })
  

  /*FETCH LAST 10 READINGS FROM DOORS*/
  const promise2 = new Promise((resolve,reject) => {
    query=`
    from(bucket:"admin")
      |> range(start: -1y)
      |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and r["sensor_type"] == "DOOR")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:10)
    `
    influx.queryApi.queryRows(query,{
      next: (row,tableMeta) => {
        const o = tableMeta.toObject(row)
        //console.log(o)
        if(!(o.sensor_id in state.digital_sensor_data)){
          state.digital_sensor_data[o.sensor_id] = {
            id: o.sensor_id,
            data: []
          }
        }
        state.digital_sensor_data[o.sensor_id].data.push({
          time:o._time,
          value:o._value
        })
      },
      error: error => reject(error),
      complete: () => resolve()
    })
  })

  /*FETCH MOVEMENT READINGS IN LAST 1 MINUTE*/
  const promise3 = new Promise((resolve,reject) => {
    query=`
    from(bucket:"admin")
      |> range(start: -1m)
      |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and r["sensor_type"] == "MOVEMENT")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
    `
    influx.queryApi.queryRows(query,{
      next: (row,tableMeta) => {
        const o = tableMeta.toObject(row)
        //console.log(o)
        if(!(o.sensor_id in state.digital_sensor_data)){
          state.digital_sensor_data[o.sensor_id] = {
            id: o.sensor_id,
            data: []
          }
        }
        state.digital_sensor_data[o.sensor_id].data.push({
          time:o._time,
          value:o._value
        })
      },
      error: error => reject(error),
      complete: () => resolve()
    })
  })

  /*FETCH ANALOG READINGS IN LAST 10 MINUTES*/
  const promise4 = new Promise((resolve,reject) => {
    query=`
    from(bucket:"admin")
      |> range(start: -2m)
      |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and (r["sensor_type"] == "LIGHT" or r["sensor_type"] == "TEMPERATURE"))
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
    `
    influx.queryApi.queryRows(query,{
      next: (row,tableMeta) => {
        const o = tableMeta.toObject(row)
        //console.log(o)
        if(!(o.sensor_id in state.analog_sensor_data)){
          state.analog_sensor_data[o.sensor_id] = {
            id: o.sensor_id,
            data: []
          }
        }
        state.analog_sensor_data[o.sensor_id].data.push({
          time:o._time,
          value:parseFloat(o._value)
        })
      },
      error: error => reject(error),
      complete: () => resolve()
    })
  })
  Promise.all([promise1,promise2,promise3,promise4])
    .then(()=>res.status(200).json(state))
    .catch((error)=>res.status(400).json({status: "ERROR", error: error}))
    .finally(next)
})

module.exports = router
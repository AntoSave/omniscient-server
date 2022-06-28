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
router.get("/", [verifyTokenMiddleware], (req,res) => {
  let username = req.username
  const query = 'SELECT * FROM SENSORS WHERE room_user=$1'
  const data = [username]
  console.log("GETTING SENSORS:",...data)
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      return res.status(200).json([...result.rows])
    }
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
      return res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      return res.status(200).json({status: "SUCCESS", rows_number:result.rowCount})
    }
  })
})

router.delete("/", [validate({ body: sensorPKSchema }),verifyTokenMiddleware], (req,res) => {
  let username = req.username
  const payload = req.body
  const query = 'DELETE FROM SENSORS WHERE "id" = $1 AND "room_user"= $2'
  const data = [payload.id,username]
  console.log("DELETING SENSOR:",...data)
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      return res.status(400).json({status: "ERROR", error: error, stack:error.stack})
    }
    else {
      return res.status(200).json({status: "SUCCESS", rows_number:result.rowCount})
    }
  })
})

/*Restituisce lo stato attuale di tutti i sensori*/
router.get("/state", [verifyTokenMiddleware], async (req,res,next) => {
  //console.log(process.env.STACKHERO_INFLUXDB_HOST,process.env.STACKHERO_INFLUXDB_ADMIN_ORGANIZATION,process.env.INFLUX_API_TOKEN)
  let username = req.username

  const pgQuery = 'SELECT * FROM SENSORS WHERE room_user=$1'
  const data = [username]
  console.log("GETTING SENSORS:",...data)
  try{
    let result = await postgres.getClient().query(pgQuery, data)
    let sensor_ids = result.rows.map(e => e.id)

    let state = {
      sensor_status:{},
      analog_sensor_data:{},
      digital_sensor_data:{}
    }
    /*FETCH SENSOR STATUS*/
    const promise1 = new Promise((resolve,reject) => {
      var query=`
      sensor_ids = [${sensor_ids.map(e=>"\""+e+"\"")}]
      from(bucket:"admin")
        |> range(start: -1y)
        |> filter(fn:(r) => r["_measurement"] == "sensor_status" and r["_field"] == "connection_status" and contains(value: r["sensor_id"], set: sensor_ids))
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
      sensor_ids = [${sensor_ids.map(e=>"\""+e+"\"")}]
      from(bucket:"admin")
        |> range(start: -1y)
        |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and r["sensor_type"] == "DOOR" and contains(value: r["sensor_id"], set: sensor_ids))
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
      sensor_ids = [${sensor_ids.map(e=>"\""+e+"\"")}]
      from(bucket:"admin")
        |> range(start: -1m)
        |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and r["sensor_type"] == "MOVEMENT" and contains(value: r["sensor_id"], set: sensor_ids))
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
      sensor_ids = [${sensor_ids.map(e=>"\""+e+"\"")}]
      from(bucket:"admin")
        |> range(start: -2m)
        |> filter(fn:(r) => r["_measurement"] == "sensor_value" and r["_field"] == "value" and (r["sensor_type"] == "LIGHT" or r["sensor_type"] == "TEMPERATURE") and contains(value: r["sensor_id"], set: sensor_ids))
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
      .catch((error)=>res.status(400).json({status: "ERROR", message: error.message}))
      .finally(next)
  } catch(ex) {
    return res.status(400).json({status: "ERROR", message: ex.message})
  }
})

router.get("/connection_status", [verifyTokenMiddleware], async (req,res) => {
  let username = req.username
  //Get user sensors
  const pgQuery = 'SELECT * FROM SENSORS WHERE room_user=$1'
  const data = [username]
  console.log("GETTING SENSORS:",...data)
  try{
    let result = await postgres.getClient().query(pgQuery, data)
    let sensor_ids = result.rows.map(e => e.id)
    var sensor_status = {}
    console.log(`[${sensor_ids.map(e=>"\""+e+"\"")}]`)
    const influxQuery=`
    sensor_ids = [${sensor_ids.map(e=>"\""+e+"\"")}]

    from(bucket:"admin")
      |> range(start: -1y)
      |> filter(fn:(r) => r["_measurement"] == "sensor_status" and r["_field"] == "connection_status" and contains(value: r["sensor_id"], set: sensor_ids))
      |> group(columns: ["sensor_id"])
      |> last()
    `
    influx.queryApi.queryRows(influxQuery,{
      next: (row,tableMeta) => {
        const o = tableMeta.toObject(row)
        //console.log(o)
        sensor_status[o.sensor_id]={
          id:o.sensor_id,
          status:o._value
        }
      },
      error: error => {throw error},
      complete: () => {
        return res.status(200).json(sensor_status)
      }
    })
  } catch (ex) {
    return res.status(400).json({status: "ERROR", message:error.message})
  }
})

module.exports = router
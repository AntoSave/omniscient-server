const express = require('express')
const router = express.Router()
const postgres = require('../postgres')
const influx = require('../influx')

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

router.get("/state", (req,res,next) => {
  //console.log(process.env.STACKHERO_INFLUXDB_HOST,process.env.STACKHERO_INFLUXDB_ADMIN_ORGANIZATION,process.env.INFLUX_API_TOKEN)
  let username = 'default'
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

  /*FETCH MOVEMENT READINGS IN LAST 10 MINUTES*/
  const promise3 = new Promise((resolve,reject) => {
    query=`
    from(bucket:"admin")
      |> range(start: -10m)
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
      |> range(start: -10m)
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
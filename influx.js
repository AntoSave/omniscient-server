const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const url = 'https://'+process.env.STACKHERO_INFLUXDB_HOST
const organization = process.env.STACKHERO_INFLUXDB_ADMIN_ORGANIZATION
const token = process.env.INFLUX_API_TOKEN

const influxDB = new InfluxDB({url,token})
const queryApi = influxDB.getQueryApi(organization)
const getWriteApi = (bucket) => influxDB.getWriteApi(organization,bucket)

module.exports = {
  queryApi,
  getWriteApi
}

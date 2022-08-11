const express = require('express')
const http = require('http')
const ws = require('ws')
const cors = require('cors')
const data = require('./data.json')

const app = express().use(cors())
const port = 3001

const server = http.createServer(app)

const wss = new ws.Server({ server })

async function sortData(order, data) {
   const comparableArray = await Promise.all(data.map(async x => [await x.id, x]));
   comparableArray.sort((a, b) => order === 'DESC' ?
      -(a[0] > b[0]) || +(a[0] < b[0])
      : -(a[0] < b[0]) || +(a[0] > b[0]));
   return await comparableArray.map(x => x[1]);
}

const dispatchEvent = async (message, ws) => {
   const json = JSON.parse(message);

   switch (json.method) {
      case "get":
         switch (json.event) {
            case 'users':
               const list = await sortData(json.sort, data)
               wss.clients.forEach(client => client === ws && ws.send(JSON.stringify({ method: json.method, event: json.event, sort: json.sort, users: list })))
               break;
            default:
         }
      case "update":
         switch (json.event) {
            case 'user':
               data.map((el, index) => el.id === json.id
                  ? !el[json.field]
                     ? json.value ? el[json.field] = json.value : el
                     : json.value 
                        ? !data.find(elem=>elem.id === Number(json.value)) ? el[json.field] = json.value : el
                        : json.field !== 'id' && delete el[json.field]
                  : el)
               const list = await sortData(json.sort, data)
               wss.clients.forEach(client => client.send(JSON.stringify({ method: json.method, event: json.event, users: client === ws ? list : data })))
         }
         break;
      default: ws.send((new Error('Error')).message);
   }
}

wss.on('connection', ws => {
   ws.on('message', m => dispatchEvent(m, ws, data));
});


server.listen(port, () => {
   console.log('Server listen port: ' + port)
})

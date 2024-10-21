const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const SPEED = 10
const RADIUS = 10

const backEndPlayers = {}
const backEndProjectiles = {}
let projectileId = 0;

//code to run on connection: create a user and add to the backendplayers dictionary
io.on('connection', (socket) => {
  console.log('a user connected')
  

  //send to frontend
  io.emit('updatePlayers', backEndPlayers)

  socket.on('shoot', ({x, y, angle}) => {
    projectileId++;
    const velocity = {
        x: Math.cos(angle) * 5,
        y: Math.sin(angle) * 5
    };
    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id
    }
  })

  socket.on('initGame', ({username, width, height}) => {
    backEndPlayers[socket.id] = {
      x: 500 * Math.random(),
      y: 500 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username: username
    }
    //where we init our canvas
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }
  })

  //code to run on disconnect
  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]
    io.emit('updatePlayers', backEndPlayers)
  })

  //received from frontend to display to all other connected
  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break

      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break
    }
  })
})

// backend ticker
setInterval(() => {
  // update projectile position
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    
    const PROJECTILE_RADIUS = 5
    if(backEndProjectiles[id].x - PROJECTILE_RADIUS >= 
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
      backEndProjectiles[id].x - PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS >= 
      backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS <=0 ){
        delete backEndProjectiles[id];
        continue;
    }

    for (const playerId in backEndPlayers){
      const backEndPlayer = backEndPlayers[playerId]

      const DISTANCE = Math.hypot(
        backEndProjectiles[id]?.x - backEndPlayer.x, 
        backEndProjectiles[id]?.y - backEndPlayer.y
      )

      // collision detection
      if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
        backEndProjectiles[id].playerId != playerId
      ){
        if(backEndPlayers[backEndProjectiles[id].playerId]){
          backEndPlayers[backEndProjectiles[id].playerId].score++
        }
        console.log(backEndPlayers[backEndProjectiles[id].playerId])
        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break 
      }
    }

  }

  io.emit('updatePlayers', backEndPlayers)
  io.emit('updateProjectiles', backEndProjectiles)
}, 15)



server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



console.log('server did load')
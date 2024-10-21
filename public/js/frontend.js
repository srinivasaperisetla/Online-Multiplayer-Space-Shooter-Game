const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = 1024 * devicePixelRatio
canvas.height = 576 * devicePixelRatio

c.scale(devicePixelRatio, devicePixelRatio)

const x = canvas.width / 2
const y = canvas.height / 2

const socket = io()

const frontEndPlayers = {}
const frontEndProjectiles = {}
const playerInputs = [] 

socket.on('updateProjectiles', (backendProjectiles) => {
    for(const id in backendProjectiles){
        const backendProjectile = backendProjectiles[id];

        if (!frontEndProjectiles[id]){
            frontEndProjectiles[id] = new Projectile({
                x: backendProjectile.x, 
                y: backendProjectile.y, 
                radius: 5, 
                color: frontEndPlayers[backendProjectile.playerId]?.color, 
                velocity: backendProjectile.velocity
            });
        } else {
            frontEndProjectiles[id].x += backendProjectile.velocity.x;
            frontEndProjectiles[id].y += backendProjectile.velocity.y;
        }
    }

    for (const frontEndProjectileId in frontEndProjectiles) {
        if (!backendProjectiles[frontEndProjectileId]) {
          delete frontEndProjectiles[frontEndProjectileId]
        }
      }

});

socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color
      })
      
      document.querySelector('#playerLabels').innerHTML += `<div data-id = "${id}" datae-score = "${backEndPlayer.score}"> ${backEndPlayer.username}: ${backEndPlayer.score}</div>`;
    } else {
        document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
        document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)
        const parentDiv = document.querySelector('#playerLabels')
        const childDivs = Array.from(parentDiv.querySelectorAll('div'))
        childDivs.sort((a, b) => {
            const scoreA = Number(a.getAttribute('data-score'));
            const scoreB = Number(b.getAttribute('data-score'));
 
            return scoreB - scoreA;
        })
        // removes old elements
        childDivs.forEach(div => {
            parentDiv.removeChild(div)
        })
        // adds sorted elements 
        childDivs.forEach(div => {
            parentDiv.appendChild(div)
        })
      if (id === socket.id) {
        // if a player already exists 
        frontEndPlayers[id].x = backEndPlayer.x
        frontEndPlayers[id].y = backEndPlayer.y

        const lastBackendInputIndex = playerInputs.findIndex((input) => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackendInputIndex > -1)
          playerInputs.splice(0, lastBackendInputIndex + 1)

        playerInputs.forEach((input) => {
          frontEndPlayers[id].x += input.dx
          frontEndPlayers[id].y += input.dy
        })
      } else {
        // for all other players
        gsap.to(frontEndPlayers[id], {
          x: backEndPlayer.x,
          y: backEndPlayer.y,
          duration: 0.015,
          ease: 'linear'
        })
      }
    }
  }

  // this is where we delete the front end players
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
        const divToDelete = document.querySelector(`div[data-id="${id}"]`);
        divToDelete.parentNode.removeChild(divToDelete );

        if(id === socket.id){
            document.querySelector('#usernameForm').style.display = 'block'
        }

        delete frontEndPlayers[id]
    }
  }
})


//animation in order to draw the objects
let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)

  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    frontEndProjectile.draw()
  }

  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id]
    frontEndPlayer.draw()
  }

//   for(let i = frontEndProjectiles.length-1; i>=0; i--){
//     const frontEndProjectile = frontEndProjectiles[i];
//     frontEndProjectile.update();
//   }
}
animate();


//Event Listeners
const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

const SPEED = 10

let sequenceNumber = 0
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED })
    frontEndPlayers[socket.id].y -= SPEED
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }

  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 })
    frontEndPlayers[socket.id].x -= SPEED
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }

  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: 0, dy: SPEED })
    frontEndPlayers[socket.id].y += SPEED
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }

  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 })
    frontEndPlayers[socket.id].x += SPEED
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15)

window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break

    case 'KeyA':
      keys.a.pressed = true
      break

    case 'KeyS':
      keys.s.pressed = true
      break

    case 'KeyD':
      keys.d.pressed = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  if (!frontEndPlayers[socket.id]) return

  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
    event.preventDefault()
    document.querySelector('#usernameForm').style.display = 'none';
    socket.emit('initGame', {
        username: document.querySelector('#usernameInput').value,
        width: canvas.width, 
        height: canvas.height,
        devicePixelRatio
    })
})
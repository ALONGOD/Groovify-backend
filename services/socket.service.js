import { logger } from './logger.service.js'
import { Server } from 'socket.io'

var gIo = null

export function setupSocketAPI(http) {
  gIo = new Server(http, {
    cors: {
      origin: '*',
    },
  })

  const stationUsers = {}
  gIo.on('connection', socket => {
    logger.info(`New connected socket [id: ${socket.id}]`)

    socket.on('join-party', ({ stationId }) => {
      console.log('socket?.user?.id:', socket?.user?.id)
      const room = `party: ${stationId}`
      
      socket.join(room)

      // console.log('room joined brother:', room)
      socket.to(room).emit('user-joined', socket?.user)
      socket.to(room).emit('request-player', { room, userId: socket?.user?.id })
    })

    socket.on('send-player', ({ player, currentTime, userId }) => {
      const room = `party: ${player.partyListen.stationId}`
      // console.log('room:', room)
      console.log('send-sync:')
      gIo.to(room).emit('sync-player', {player, currentTime, userId})
    })

    socket.on('party-members', (data) => {
      console.log('callback:', data)
      const room = `party: ${data.stationId}`
      console.log('room:', room)
      const roomInfo = gIo.sockets.adapter.rooms.get(room)
      console.log('roomInfo:', roomInfo)
      if (roomInfo) {
        const members = Array.from(roomInfo).map(socketId => gIo.sockets.sockets.get(socketId).user)
        console.log('members:', members)
        gIo.to(room).emit('receieve-members', members)
      //   callback(members)
      }
    })


    socket.on('leave-party', ({ stationId }) => {
      const room = `party: ${stationId}`
      console.log('leave', room);
      
      socket.leave(room)
      gIo.to(room).emit('user-left', socket?.user?.id)
    })

    socket.on('updated-station', station => {
      console.log('updated-station:', station)
      socket.broadcast.to(station?._id).emit('updated-station', station)
    })

    socket.on('join-station', ({ stationId }) => {
      console.log('join-user:', socket?.user)
      if (socket.user) {
        if (!stationUsers[stationId]) stationUsers[stationId] = []
        socket.join(stationId)
        if (
          !stationUsers[stationId].some(user => user?.id === socket?.user?.id)
        ) {
          stationUsers[stationId].push(socket.user)
        }

        const currentUsersInStation = stationUsers[stationId]

        gIo.to(stationId).emit('station-current-users', currentUsersInStation)
      }
    })

    socket.on('leave-station', ({ stationId }) => {
      // socket.leave(stationId)
      socket.leaveAll()

      if (stationUsers[stationId]) {
        const userIdx = stationUsers[stationId].findIndex(
          user => user.id === socket?.user?.id
        )
        if (userIdx > -1) stationUsers[stationId].splice(userIdx, 1)
        const currentUsersInStation = stationUsers[stationId].filter(
          user => user.id !== socket?.user?.id
        )
        console.log('socket.rooms:', socket.rooms)

        // Notify others in the station that this user left
        socket.broadcast
          .to(stationId)
          .emit('station-current-users', currentUsersInStation)
      }
    })
    socket.on('set-user-socket', user => {
      console.log('set-user:', user)
      logger.info(
        `Setting socket.user = ${user?.id} for socket [id: ${socket.id}]`
      )
      socket.user = user
    })

    socket.on('unset-user-socket', () => {
      console.log('unset')

      logger.info(`Removing socket.userId for socket [id: ${socket.id}]`)
      delete socket.user
    })

    socket.on('disconnect', socket => {
      logger.info(`Socket disconnected [id: ${socket.id}]`)
    })
  })
}
// export function setupSocketAPI(http) {
//     gIo = new Server(http, {
//         cors: {
//             origin: '*',
//         }
//     })
//     gIo.on('connection', socket => {
//         logger.info(`New connected socket [id: ${socket.id}]`)
//         socket.on('disconnect', socket => {
//             logger.info(`Socket disconnected [id: ${socket.id}]`)
//         })
//         socket.on('chat-set-topic', topic => {
//             if (socket.myTopic === topic) return
//             if (socket.myTopic) {
//                 socket.leave(socket.myTopic)
//                 logger.info(`Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`)
//             }
//             socket.join(topic)
//             socket.myTopic = topic
//         })
//         socket.on('chat-send-msg', msg => {
//             logger.info(`New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`)
//             // emits to all sockets:
//             // gIo.emit('chat addMsg', msg)
//             // emits only to sockets in the same room
//             gIo.to(socket.myTopic).emit('chat-add-msg', msg)
//         })
//         socket.on('user-watch', userId => {
//             logger.info(`user-watch from socket [id: ${socket.id}], on user ${userId}`)
//             socket.join('watching:' + userId)
//         })

//     })
// }

function emitTo({ type, data, label }) {
  if (label) gIo.to('watching:' + label.toString()).emit(type, data)
  else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
  console.log('userId:', userId)

  userId = userId?.toString()
  const socket = await _getUserSocket(userId)

  if (socket) {
    logger.info(
      `Emiting event: ${type} to user: ${userId} socket [id: ${socket.id}]`
    )
    socket.emit(type, data)
  } else {
    logger.info(`No active socket for user: ${userId}`)
    // _printSockets()
  }
}

// If possible, send to all sockets BUT not the current socket
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, userId }) {
  // userId = userId.toString()

  logger.info(`Broadcasting event: ${type}`)
  const excludedSocket = await _getUserSocket(userId)
  if (room && excludedSocket) {
    logger.info(`Broadcast to room ${room} excluding user: ${userId}`)
    excludedSocket.broadcast.to(room).emit(type, data)
  } else if (excludedSocket) {
    logger.info(`Broadcast to all excluding user: ${userId}`)
    excludedSocket.broadcast.emit(type, data)
  } else if (room) {
    logger.info(`Emit to room: ${room}`)
    gIo.to(room).emit(type, data)
  } else {
    logger.info(`Emit to all`)
    gIo.emit(type, data)
  }
}

async function _getUserSocket(userId) {
  const sockets = await _getAllSockets()
  console.log('sockets:', sockets)

  const socket = sockets.find(s => s?.user?.id === userId)
  return socket
}
async function _getAllSockets() {
  // return all Socket instances
  const sockets = await gIo.fetchSockets()
  return sockets
}

async function _printSockets() {
  const sockets = await _getAllSockets()
  console.log(`Sockets: (count: ${sockets.length}):`)
  sockets.forEach(_printSocket)
}
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

export const socketService = {
  // set up the sockets service and define the API
  setupSocketAPI,
  // emit to everyone / everyone in a specific room (label)
  emitTo,
  // emit to a specific user (if currently active in system)
  emitToUser,
  // Send to all sockets BUT not the current socket - if found
  // (otherwise broadcast to a room / to all)
  broadcast,
}

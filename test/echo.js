/* eslint no-console: 0 */

const net = require('net')
const log = require('debug')('test:echo')
const _events = require('./_events')

module.exports = echo

function echo (port, cb) {
  const sockets = new Set()

  const server = net.createServer((socket) => {
    sockets.add(socket)

    _events('echo', socket)

    socket.on('close', () => {
      sockets.delete(socket)
    })
    socket.on('error', (err) => {
      log('%s', err)
    })
    socket.pipe(socket) // echo all...
  })

  server.listen(port, cb)

  const destroyFirstSocket = () => {
    if (sockets.size) {
      const socket = Array.from(sockets)[0]
      socket.destroy()
      sockets.delete(socket)
    }
  }

  const close = (cb) => {
    for (let socket of sockets) {
      socket.destroy()
      sockets.delete(socket)
    }
    server.close(() => {
      server.unref()
      cb && cb()
    })
  }

  return {close, destroyFirstSocket}
}

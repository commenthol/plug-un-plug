/* eslint no-console: 0 */

const net = require('net')

module.exports = echo

function echo (port, cb) {
  const sockets = new Set()

  const server = net.createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => {
      sockets.delete(socket)
    })
    socket.on('error', (err) => {
      console.log('echo: %s', err)
    })
    socket.on('data', (chunk) => {
      if (/cmd::destroy/.test(chunk.toString())) {
        socket.destroy()
      }
    })
    socket.pipe(socket) // echo all...
  })

  server.listen(port, cb)

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

  return {close}
}

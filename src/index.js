const net = require('net')
const {EventEmitter} = require('events')

class Proxy extends EventEmitter {
  /**
  * connect proxy with remote server
  * @param {Number} [opts.port=3001] - local port to listen
  * @param {String} [opts.host] - local host to listen - if undefined the ip([::] or
  * @param {Number} [opts.forwardPort=3002] - server port to proxy connection
  * @param {String} [opts.forwardHost='127.0.0.1'] - server host to proxy connection
  */
  connect (opts) {
    opts = Object.assign({port: 3001, forwardHost: '127.0.0.1', forwardPort: 3002}, opts)
    const {port, host, forwardHost, forwardPort} = opts

    this.sockets = new Set()
    this.server = net.createServer((client) => {
      const proxy = net.createConnection({host: forwardHost, port: forwardPort})
      this.sockets.add(client)
      this.sockets.add(proxy)

      client.pipe(proxy).pipe(client)

      const onClose = (stream, err) => {
        client.destroy()
        proxy.destroy()
        this.sockets.delete(stream)
        if (err) {
          this.emit('error', err)
        } else if (stream === proxy) {
          this.emit('close')
        }
      }

      client.on('close', onClose.bind(this, client))
      client.on('error', onClose.bind(this, client))
      proxy.on('close', onClose.bind(this, proxy))
      proxy.on('error', onClose.bind(this, proxy))

      this.emit('connection')
    })

    this.server.listen(port, host, () => {
      this.emit('listening')
    })

    return this
  }

  /**
  * force close proxy server
  * @param {Function} cb - callback
  */
  close (cb) {
    for (let socket of this.sockets) {
      socket.destroy()
      this.sockets.delete(socket)
    }
    if (this.server) {
      this.server.close(() => {
        this.server.unref()
        cb && cb()
      })
    } else {
      cb && cb()
    }
  }
}

module.exports = Proxy

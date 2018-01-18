/* eslint no-console: 0 */

const assert = require('assert')
const net = require('net')
const echo = require('./echo')
const Proxy = require('..')

const PROXY_PORT = 3001
const SERVER_PORT = 3002

function clientWriter (port, str) {
  const client = net.createConnection({port})
  client.on('data', () => {
    process.stdout.write('.')
  })
  client.on('error', (err) => {
    console.log('client: %s', err)
  })
  function run () {
    if (client.destroyed) {
      return
    }
    client.write(str)
    setImmediate(run)
  }
  run()
  return client
}

describe('Proxy', function () {
  const str = 'hello world!'
  const strDestroy = Array(100000).fill(str).concat('cmd::destroy').join('\n')

  let _echo

  beforeEach((done) => {
    _echo = echo(SERVER_PORT, done)
  })
  afterEach((done) => {
    _echo.close(done)
  })

  it('client should connect to echo server', function (done) {
    const client = net.createConnection({port: SERVER_PORT})
    client.on('data', (chunk) => {
      assert.equal(chunk.toString(), str)
      client.end()
    })
    client.on('close', () => {
      done()
    })
    client.write(str)
  })

  it('client should disconnect on remote server destroy', function (done) {
    const client = clientWriter(SERVER_PORT, strDestroy)
    let writes = 0
    client.on('data', () => {
      writes++
    })
    client.on('close', () => {
      console.log(writes)
      done()
    })
  })

  it('should connect client to echo server via proxy', function (done) {
    const proxy = new Proxy()

    const test = {}
    const event = (ev) => {
      if (!test[ev]) test[ev] = 0
      test[ev]++
    }

    proxy.connect({port: PROXY_PORT, forwardPort: SERVER_PORT})
    proxy.on('close', () => {
      event('close')
      assert.deepEqual(test, { listening: 1, connection: 1, close: 1 })
      done()
    })
    proxy.on('connection', () => event('connection'))
    proxy.on('listening', () => {
      event('listening')
      const client = net.createConnection({port: PROXY_PORT})
      client.on('data', (chunk) => {
        assert.equal(chunk.toString(), str)
        client.end()
      })
      client.on('close', () => {
        proxy.close()
      })
      client.write(str)
    })
  })

  it('proxy should force close connection', function (done) {
    const proxy = new Proxy()

    const test = {}
    const event = (ev) => {
      if (!test[ev]) test[ev] = 0
      test[ev]++
    }

    proxy.connect({port: PROXY_PORT, forwardPort: SERVER_PORT})
    proxy.on('close', () => {
      event('close')
      assert.deepEqual(test, { listening: 1, connection: 1, close: 1 })
      done()
    })
    proxy.on('connection', () => event('connection'))
    proxy.on('listening', () => {
      event('listening')

      clientWriter(PROXY_PORT, str)

      setTimeout(() => {
        proxy.close()
      }, 100)
    })
  })

  it('proxy should force close multiple connections', function (done) {
    const proxy = new Proxy()

    const test = {}
    const event = (ev) => {
      if (!test[ev]) test[ev] = 0
      test[ev]++
    }

    proxy.connect({port: PROXY_PORT, forwardPort: SERVER_PORT})
    proxy.on('close', () => {
      event('close')
      assert.deepEqual(test, { listening: 1, connection: 10, close: 1 })
      done()
    })
    proxy.on('connection', () => event('connection'))
    proxy.on('listening', () => {
      event('listening')

      for (let i = 0; i < 10; i++) {
        clientWriter(PROXY_PORT, str + i)
      }

      setTimeout(() => {
        proxy.close()
      }, 100)
    })
  })

  it.skip('proxy should disconnect on remote server destroy', function (done) {
    const proxy = new Proxy()

    const test = {}
    const event = (ev) => {
      console.log(ev)
      if (!test[ev]) test[ev] = 0
      test[ev]++
    }
    proxy.connect({port: PROXY_PORT, forwardPort: SERVER_PORT})
    proxy.on('error', () => {
      event('error')
    })
    proxy.on('close', () => {
      event('close')
      console.log(test)
      // assert.deepEqual(test, { listening: 1, connection: 1, error: 2 })
      done()
    })
    proxy.on('connection', () => event('connection'))
    proxy.on('listening', () => {
      event('listening')
      clientWriter(PROXY_PORT, strDestroy)
    })
    setTimeout(() => {
      console.log(proxy.server)
      proxy.close()
    }, 1000)
  })
})

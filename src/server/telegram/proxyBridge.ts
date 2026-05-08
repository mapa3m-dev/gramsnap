import net from 'node:net'

interface UpstreamHttp {
  host: string
  port: number
}

function parseHttpProxy(url: string): UpstreamHttp | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return { host: u.hostname, port: u.port ? Number(u.port) : 80 }
  } catch {
    return null
  }
}

function handleSocksClient(client: net.Socket, upstream: UpstreamHttp): void {
  client.once('data', (greeting: Buffer) => {
    if (greeting[0] !== 0x05) {
      client.destroy()
      return
    }
    client.write(Buffer.from([0x05, 0x00]))

    client.once('data', (req: Buffer) => {
      if (req[0] !== 0x05 || req[1] !== 0x01) {
        client.destroy()
        return
      }
      const atyp = req[3]
      let host: string
      let addrEnd: number
      if (atyp === 0x01) {
        host = `${req[4]}.${req[5]}.${req[6]}.${req[7]}`
        addrEnd = 8
      } else if (atyp === 0x03) {
        const len = req[4]
        host = req.subarray(5, 5 + len).toString('utf8')
        addrEnd = 5 + len
      } else {
        client.destroy()
        return
      }
      const port = req.readUInt16BE(addrEnd)

      const proxySock = net.createConnection(upstream.port, upstream.host)
      proxySock.once('connect', () => {
        const target = `${host}:${port}`
        proxySock.write(
          `CONNECT ${target} HTTP/1.1\r\n` +
            `Host: ${target}\r\n` +
            `Proxy-Connection: keep-alive\r\n\r\n`,
        )
      })

      let buf = Buffer.alloc(0)
      const onProxyData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])
        const headerEnd = buf.indexOf('\r\n\r\n')
        if (headerEnd === -1) return
        const status = buf.subarray(0, buf.indexOf('\r\n')).toString('utf8')
        if (!/^HTTP\/\d\.\d 200/i.test(status)) {
          client.destroy()
          proxySock.destroy()
          return
        }
        proxySock.removeListener('data', onProxyData)
        client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
        const leftover = buf.subarray(headerEnd + 4)
        if (leftover.length > 0) client.write(leftover)
        proxySock.pipe(client)
        client.pipe(proxySock)
      }
      proxySock.on('data', onProxyData)

      const onError = () => {
        client.destroy()
        proxySock.destroy()
      }
      proxySock.on('error', onError)
      client.on('error', onError)
    })
  })
}

export interface SocksBridge {
  host: string
  port: number
  upstreamUrl: string
}

export async function startSocksOverHttpBridge(httpProxyUrl: string): Promise<SocksBridge> {
  const upstream = parseHttpProxy(httpProxyUrl)
  if (!upstream) throw new Error(`invalid HTTP proxy URL: ${httpProxyUrl}`)

  const server = net.createServer((client) => handleSocksClient(client, upstream))
  server.on('error', (err) => {
    console.error('[proxyBridge] server error:', err)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

  const addr = server.address()
  if (!addr || typeof addr === 'string') throw new Error('failed to bind socks bridge')

  console.log(
    `[proxyBridge] SOCKS5 listener on 127.0.0.1:${addr.port} → HTTP CONNECT ${upstream.host}:${upstream.port}`,
  )

  return { host: '127.0.0.1', port: addr.port, upstreamUrl: httpProxyUrl }
}

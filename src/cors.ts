import { durationInMs, HTTPMethod } from '@cowtech/favo'
import { IncomingMessage, ServerResponse } from 'http'
import { NO_CONTENT } from 'http-status-codes'
import { send } from 'micro'
// @ts-ignore
import corsFactory from 'micro-cors'
import { globalState, RawHandler } from './models'

export interface CorsOptions {
  allowMethods?: Array<HTTPMethod>
  allowHeaders?: Array<string>
  allowCredentials?: boolean
  exposeHeaders: Array<string>
  maxAge?: number
  origin?: string
}

export function enableCors(handler: RawHandler, options?: CorsOptions): RawHandler {
  const wrapper = corsFactory(options)

  const wrapped: RawHandler = wrapper(function(req: IncomingMessage, res: ServerResponse): any | Promise<any> {
    if (req.method !== 'OPTIONS') {
      return handler(req, res)
    }

    res.setHeader('CowTech-Response-Id', globalState.currentRequest.toString())
    res.setHeader('CowTech-Response-Time', `${durationInMs(process.hrtime()).toFixed(6)} ms`)
    return send(res, NO_CONTENT, '')
  })

  wrapped.route = handler.route
  wrapped.routes = handler.routes
  return wrapped
}

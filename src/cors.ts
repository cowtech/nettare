import { HTTPMethod } from '@cowtech/favo'
// @ts-ignore
import corsFactory from 'micro-cors'
import { RawHandler } from './models'

export interface CorsOptions {
  allowMethods?: Array<HTTPMethod>
  allowHeaders?: Array<string>
  allowCredentials?: boolean
  exposeHeaders: Array<string>
  maxAge?: number
  origin?: string
}

export function enableCors(handler: RawHandler, options?: CorsOptions): RawHandler {
  handler.corsEnabled = true

  const wrapper = corsFactory(options)
  const wrapped = wrapper(handler)

  if (handler.route) wrapped.route = handler.route
  if (handler.routes) wrapped.routes = handler.routes

  return wrapped
}

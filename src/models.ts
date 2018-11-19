import { HTTPMethod, Route } from '@cowtech/favo'
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'
import { ParsedUrlQuery } from 'querystring'

export type BodyParser = (req: IncomingMessage, info?: { limit?: string | number; encoding?: string }) => Promise<any>
export type RawHandler = ((req: IncomingMessage, res: ServerResponse) => any | Promise<any>) & { route?: Route }
export type Handler = (req: Request, res: ServerResponse) => Promise<any>

export interface Request {
  method: string
  path: string
  headers: IncomingHttpHeaders
  params: { [key: string]: string }
  query: ParsedUrlQuery
  body: any
  id: string
  req: IncomingMessage
}

export interface Router {
  find(method: string, path: string): { params: { [key: string]: string } }
  on(method: HTTPMethod | Array<HTTPMethod>, path: string, handler: unknown): void
}

export const environment: string = process.env.NODE_ENV || 'development'

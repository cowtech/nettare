import {
  convertError,
  convertValidationErrors,
  durationInMs,
  ExtendedError,
  Route,
  validationMessagesFormatters
} from '@cowtech/favo'
import Ajv from 'ajv'
import Boom, { badData, internal, notFound } from 'boom'
// @ts-ignore
import findMyWay from 'find-my-way'
import { IncomingMessage, ServerResponse } from 'http'
import { OK } from 'http-status-codes'
import { json as jsonBodyParser, send, text, text as textBodyParser } from 'micro'
import { parse as parseUrlEncoded } from 'qs'
import { ParsedUrlQuery } from 'querystring'
import { URL } from 'url'
import { BodyParser, environment, globalState, Handler, RawHandler, Request, Router } from './models'

async function urlEncodedBodyParser(req: IncomingMessage): Promise<ParsedUrlQuery> {
  return parseUrlEncoded(await text(req))
}

const bodyParsers: { [key: string]: BodyParser } = {
  'application/json': jsonBodyParser,
  'application/x-www-form-urlencoded': urlEncodedBodyParser
}

export async function parseRequestPayload(request: Request, router: Router | null): Promise<void> {
  // Parse URL
  const { headers, method } = request.req
  const url = new URL(`http://${headers.host || 'localhost'}${request.req.url!}`)

  // Match method and path and set params
  if (router) {
    const match = router.find(method!, url.pathname)
    if (!match) throw notFound('Not found.')

    request.params = match.params
  }

  // Set basic properties
  request.method = method!
  request.headers = headers
  request.path = url.pathname
  request.query = {}

  // Parse querystring
  for (const [k, v] of url.searchParams.entries()) request.query[k] = v

  // Set body, if needed
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    const contentType = (headers['content-type'] || '').toLowerCase().replace(/\s*;.+$/, '')

    request.body = await (bodyParsers[contentType] || textBodyParser)(request.req)
  }
}

export function handleFullRequest(handler: Handler, route?: Route): RawHandler {
  let router: Router | null = null
  let requestValidator: Ajv.ValidateFunction | null = null
  let responseValidator: { [key: string]: Ajv.ValidateFunction } | null = null

  if (route) {
    // Create the router
    if (route.method && (route.path || route.url)) {
      router = findMyWay()
      router.on(route.method, route.path || route.url, () => false)
    }

    // Create the request validator
    if (route.schema) {
      const { querystring: query, body, params } = { querystring: true, body: true, params: true, ...route.schema }

      const ajv = new Ajv({
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: true,
        allErrors: true,
        unknownFormats: true,
        // Add custom validation
        formats: route.config.customFormats
      })

      const components = route.config.components || {}

      // Also add models to components
      if (route.config.models) {
        components.schemas = components.schemas || {}

        for (const [name, definition] of Object.entries(route.config.models))
          components.schemas[`models.${name}`] = definition
      }

      requestValidator = ajv.compile({
        type: 'object',
        properties: { query, params, body },
        components
      })

      // Create response validator in development
      if (environment === 'development' && route.schema.response) {
        responseValidator = {}

        for (const [code, schema] of Object.entries(route.schema.response))
          responseValidator[code] = ajv.compile({ ...schema, components })
      }
    }
  }

  const wrapped: RawHandler = async function(req: IncomingMessage, res: ServerResponse): Promise<any> {
    // Prepare response
    const startTime = process.hrtime()
    let code = OK
    let response: any = null
    globalState.currentRequest++

    // Wrap the request object. Note that no parsing is done yet
    const request: Request = {
      id: globalState.currentRequest.toString(),
      req,
      method: '',
      path: '',
      headers: {},
      params: {},
      query: {},
      body: null
    }

    try {
      // Parse the request, including route matching
      await parseRequestPayload(request, router)

      // Validate the request, if we have a schema
      if (requestValidator) {
        const valid = requestValidator(request)

        if (!valid) {
          throw badData('Bad input data.', {
            errors: convertValidationErrors(request, requestValidator.errors!, '').data.errors
          })
        }
      }

      // Perform the handler
      response = await handler(request, res)
      code = res.statusCode

      // Validate the response, if we have validators
      if (responseValidator) {
        const code = res.statusCode.toString() || '200'
        const validator = responseValidator[code]

        if (!validator) throw internal('', { message: validationMessagesFormatters.invalidResponseCode(code) })

        const valid = validator(response)

        if (!valid) {
          throw internal('', {
            message: validationMessagesFormatters.invalidResponse(code),
            errors: convertValidationErrors(response, validator.errors!, '').data.errors
          })
        }
      }
    } catch (e) {
      // Convert the error
      const boom = (e as Boom).isBoom
        ? (e as Boom)
        : convertError({ body: request.body, query: request.query, params: request.params }, e as ExtendedError)

      // Add all headers, including response time, then send the error
      for (const [k, v] of Object.entries(boom.output.headers)) res.setHeader(k, v)

      code = boom.output.statusCode
      response = { ...boom.output.payload, ...boom.data }
    }

    // Set the response time header and send send the response
    res.setHeader('CowTech-Response-Id', globalState.currentRequest.toString())
    res.setHeader('CowTech-Response-Time', `${durationInMs(startTime).toFixed(6)} ms`)
    await send(res, code, response)
  }

  wrapped.route = route
  return wrapped
}

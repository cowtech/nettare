"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const favo_1 = require("@cowtech/favo");
const ajv_1 = __importDefault(require("ajv"));
const boom_1 = require("boom");
// @ts-ignore
const find_my_way_1 = __importDefault(require("find-my-way"));
const http_status_codes_1 = require("http-status-codes");
const micro_1 = require("micro");
const qs_1 = require("qs");
const url_1 = require("url");
const models_1 = require("./models");
async function urlEncodedBodyParser(req) {
    return qs_1.parse(await micro_1.text(req));
}
exports.bodyParsers = {
    'application/json': micro_1.json,
    'application/x-www-form-urlencoded': urlEncodedBodyParser
};
async function parseRequestPayload(request, router) {
    // Parse URL
    const { headers, method } = request.req;
    const url = new url_1.URL(`http://${headers.host || 'localhost'}${request.req.url}`);
    // Match method and path and set params
    if (router) {
        const match = router.find(method, url.pathname);
        if (!match)
            throw boom_1.notFound('Not found.');
        request.params = match.params;
    }
    // Set basic properties
    request.method = method;
    request.headers = headers;
    request.path = url.pathname;
    request.query = {};
    // Parse querystring
    for (const [k, v] of url.searchParams.entries())
        request.query[k] = v;
    // Set body, if needed
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        const contentType = (headers['content-type'] || '').toLowerCase().replace(/\s*;.+$/, '');
        request.body = await (exports.bodyParsers[contentType] || micro_1.text)(request.req);
    }
}
exports.parseRequestPayload = parseRequestPayload;
function handleFullRequest(handler, route) {
    let router = null;
    let requestValidator = null;
    let responseValidator = null;
    if (route) {
        // Create the router
        if (route.method && (route.path || route.url)) {
            router = find_my_way_1.default();
            router.on(route.method, route.path || route.url, () => false);
        }
        // Create the request validator
        if (route.schema) {
            const { querystring: query, body, params } = { querystring: true, body: true, params: true, ...route.schema };
            const ajv = new ajv_1.default({
                removeAdditional: false,
                useDefaults: true,
                coerceTypes: true,
                allErrors: true,
                unknownFormats: true,
                // Add custom validation
                formats: route.config.customFormats
            });
            const components = route.config.components || {};
            // Also add models to components
            if (route.config.models) {
                components.schemas = components.schemas || {};
                for (const [name, definition] of Object.entries(route.config.models))
                    components.schemas[`models.${name}`] = definition;
            }
            requestValidator = ajv.compile({
                type: 'object',
                properties: { query, params, body },
                components
            });
            // Create response validator in development
            if (models_1.environment === 'development' && route.schema.response) {
                responseValidator = {};
                for (const [code, schema] of Object.entries(route.schema.response))
                    responseValidator[code] = ajv.compile({ ...schema, components });
            }
        }
    }
    const wrapped = async function (req, res) {
        // Prepare response
        const startTime = process.hrtime();
        let code = http_status_codes_1.OK;
        let response = null;
        models_1.globalState.currentRequest++;
        // Wrap the request object. Note that no parsing is done yet
        const request = {
            id: models_1.globalState.currentRequest.toString(),
            req,
            method: '',
            path: '',
            headers: {},
            params: {},
            query: {},
            body: null
        };
        try {
            // Parse the request, including route matching
            await parseRequestPayload(request, router);
            // Validate the request, if we have a schema
            if (requestValidator) {
                const valid = requestValidator(request);
                if (!valid) {
                    throw boom_1.badData('Bad input data.', {
                        errors: favo_1.convertValidationErrors(request, requestValidator.errors, '').data.errors
                    });
                }
            }
            // Perform the handler
            response = await handler(request, res);
            code = res.statusCode;
            // Validate the response, if we have validators
            if (responseValidator) {
                const code = res.statusCode.toString() || '200';
                const validator = responseValidator[code];
                if (!validator)
                    throw boom_1.internal('', { message: favo_1.validationMessagesFormatters.invalidResponseCode(code) });
                const valid = validator(response);
                if (!valid) {
                    throw boom_1.internal('', {
                        message: favo_1.validationMessagesFormatters.invalidResponse(code),
                        errors: favo_1.convertValidationErrors(response, validator.errors, '').data.errors
                    });
                }
            }
        }
        catch (e) {
            // Convert the error
            const boom = e.isBoom
                ? e
                : favo_1.convertError({ body: request.body, query: request.query, params: request.params }, e);
            // Add all headers, including response time, then send the error
            for (const [k, v] of Object.entries(boom.output.headers))
                res.setHeader(k, v);
            code = boom.output.statusCode;
            response = { ...boom.output.payload, ...boom.data };
        }
        // Set the response time header and send send the response
        res.setHeader('CowTech-Response-Id', models_1.globalState.currentRequest.toString());
        res.setHeader('CowTech-Response-Time', `${favo_1.durationInMs(startTime).toFixed(6)} ms`);
        await micro_1.send(res, code, response);
    };
    wrapped.route = route;
    return wrapped;
}
exports.handleFullRequest = handleFullRequest;

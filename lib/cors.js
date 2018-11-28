"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const favo_1 = require("@cowtech/favo");
const http_status_codes_1 = require("http-status-codes");
const micro_1 = require("micro");
// @ts-ignore
const micro_cors_1 = __importDefault(require("micro-cors"));
const models_1 = require("./models");
function enableCors(handler, options) {
    const wrapper = micro_cors_1.default(options);
    const wrapped = wrapper(function (req, res) {
        if (req.method !== 'OPTIONS')
            return handler(req, res);
        res.setHeader('CowTech-Response-Id', models_1.globalState.currentRequest.toString());
        res.setHeader('CowTech-Response-Time', `${favo_1.durationInMs(process.hrtime()).toFixed(6)} ms`);
        return micro_1.send(res, http_status_codes_1.NO_CONTENT, '');
    });
    wrapped.route = handler.route;
    wrapped.routes = handler.routes;
    return wrapped;
}
exports.enableCors = enableCors;

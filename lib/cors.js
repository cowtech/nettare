"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const micro_cors_1 = __importDefault(require("micro-cors"));
function enableCors(handler, options) {
    const wrapper = micro_cors_1.default(options);
    const wrapped = wrapper(handler);
    if (handler.route)
        wrapped.route = handler.route;
    if (handler.routes)
        wrapped.routes = handler.routes;
    return wrapped;
}
exports.enableCors = enableCors;

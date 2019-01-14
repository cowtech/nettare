/// <reference types="node" />
import { HTTPMethod, Route } from '@cowtech/favo';
import { FindResult, HTTPVersion } from 'find-my-way';
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import { ParsedUrlQuery } from 'querystring';
export declare type GlobalState = {
    [key: string]: any;
};
export declare type BodyParser = (req: IncomingMessage, info?: {
    limit?: string | number;
    encoding?: string;
}) => Promise<any>;
export declare type RawHandler = ((req: IncomingMessage, res: ServerResponse) => any | Promise<any>) & {
    route?: Route;
    routes?: Array<Route>;
    corsEnabled?: boolean;
};
export declare type Handler = (req: Request, res: ServerResponse) => Promise<any>;
export interface Request {
    method: string;
    path: string;
    headers: IncomingHttpHeaders;
    params: {
        [key: string]: string | undefined;
    };
    query: ParsedUrlQuery;
    body: any;
    id: string;
    req: IncomingMessage;
}
export interface Router {
    find(method: string, path: string): FindResult<HTTPVersion.V1> | null;
    on(method: HTTPMethod | Array<HTTPMethod>, path: string, handler: unknown): void;
}
export declare const environment: string;
export declare const globalState: GlobalState;

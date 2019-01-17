import { Route } from '@cowtech/favo';
import { BodyParser, Handler, RawHandler, Request, Router } from './models';
export declare const bodyParsers: {
    [key: string]: BodyParser;
};
export declare function parseRequestPayload(request: Request, router: Router | null): Promise<void>;
export declare function handleFullRequest(handler: Handler, route?: Route): RawHandler;

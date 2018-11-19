import { Route } from '@cowtech/favo';
import { Handler, RawHandler, Request, Router } from './models';
export declare function parseRequestPayload(request: Request, router: Router | null): Promise<void>;
export declare function handleFullRequest(handler: Handler, route?: Route): RawHandler;

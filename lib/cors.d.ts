import { HTTPMethod } from '@cowtech/favo';
import { RawHandler } from './models';
export interface CorsOptions {
    allowMethods?: Array<HTTPMethod>;
    allowHeaders?: Array<string>;
    allowCredentials?: boolean;
    exposeHeaders: Array<string>;
    maxAge?: number;
    origin?: string;
}
export declare function enableCors(handler: RawHandler, options?: CorsOptions): RawHandler;

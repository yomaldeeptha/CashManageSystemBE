import type { IncomingMessage, ServerResponse } from 'http';
import { createNestApp } from '../src/bootstrap';

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

    let cachedHandlerPromise: Promise<RequestHandler> | null = null;

    function getHandler(): Promise<RequestHandler> {
      if (!cachedHandlerPromise) {
        cachedHandlerPromise = (async () => {
          const app = await createNestApp();
          await app.init();
          return app.getHttpAdapter().getInstance() as RequestHandler;
        })().catch((err) => {
          cachedHandlerPromise = null;
          throw err;
        });
      }
      return cachedHandlerPromise;
    }

    export default async function handler(req: IncomingMessage, res: ServerResponse) {
      const expressApp = await getHandler();
      return expressApp(req, res);
    }

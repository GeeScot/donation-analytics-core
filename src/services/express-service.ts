import express from 'express';
import cors from 'cors';
import dynamic from '../utils/dynamic';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

const middleware = async (_request: express.Request, _response: express.Response, next: express.NextFunction) => {
  // do something in middleware
  await next();
}

const createExpressService = () => {
  const app = express();
  app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001', /gee\.dev$/] }));
  app.use(express.json());
  app.use(middleware);
  
  dynamic('../api', app);

  app.listen(3000, () => {
    log('listening on port 3000');
  });
}

export default createExpressService;

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

  const port = process.env.PORT ?? 3000;
  app.listen(port, () => {
    log(`listening on port ${port}`);
  });
}

export default createExpressService;

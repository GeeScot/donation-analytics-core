import * as dotenv from 'dotenv';
dotenv.config();

import { connect } from './db/mongodb';
import createExpressService from './services/express-service';

async function main(): Promise<void> {
  try {
    await connect();
    createExpressService();
  } catch (err: any) {
    console.log(err);
  }
}

main();

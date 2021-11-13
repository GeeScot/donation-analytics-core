import { MongoClient, Collection } from 'mongodb';
import config from '../config';

const mongoClient = new MongoClient(config.ConnectionString, { useUnifiedTopology: true });

async function connect(): Promise<MongoClient> {
  return await mongoClient.connect();
}

function collection<TModel>(dbName: string, collectionName: string): Collection<TModel> {
  return mongoClient.db(dbName).collection<TModel>(collectionName);
}

export { connect, collection }

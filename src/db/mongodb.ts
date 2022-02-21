import { MongoClient, Collection } from 'mongodb';
import config from '../config';

const mongoClient = new MongoClient(config.ConnectionString, { useUnifiedTopology: true });

async function connect(): Promise<MongoClient> {
  return await mongoClient.connect();
}

function getCollection<TModel>(collectionName: string): Collection<TModel> {
  return mongoClient.db(config.DatabaseName).collection<TModel>(collectionName);
}

async function removeCollection(collectionName: string): Promise<void> {
  await mongoClient.db(config.DatabaseName).dropCollection(collectionName);
}

async function hasCollection(collectionName: string): Promise<boolean> {
  const result = await mongoClient
    .db(config.DatabaseName)
    .listCollections({ name: collectionName }, { nameOnly: true })
    .toArray();
  return result.length !== 0;
}

export { connect, getCollection, removeCollection, hasCollection }

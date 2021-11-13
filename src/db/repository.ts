import { Db, FilterQuery, Collection, ObjectID, OptionalId, UpdateQuery, SortOptionObject } from "mongodb";
import config from '../config';
import { collection } from '../db/mongodb';

export default class Repository<TModel> {
  private collection: Collection<TModel>;

  constructor(collectionName: string) {
    this.collection = collection<TModel>(config.DatabaseName, collectionName);
  }

  async all(filter: FilterQuery<TModel>, sort: SortOptionObject<TModel> = {}, limit = 0): Promise<TModel[]> {
    return await this.collection
      .find(filter)
      .limit(limit)
      .sort(sort)
      .toArray();
  }

  async get(query: FilterQuery<TModel>): Promise<TModel | null> {
    return await this.collection.findOne(query);
  }

  async insert(objs: TModel[]): Promise<void> {
    await this.collection.insertMany(objs.map(obj => <OptionalId<TModel>>(obj)));
  }

  async update(filter: FilterQuery<TModel>, updateQuery: UpdateQuery<TModel>): Promise<void> {
    await this.collection.updateOne(filter, updateQuery);
  }

  async remove(filter: FilterQuery<TModel>): Promise<void> {
    await this.collection.deleteMany(filter);
  }

  getCollection(): Collection<TModel> {
    return this.collection;
  }
}

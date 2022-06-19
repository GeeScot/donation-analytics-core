import { Filter, Collection, UpdateFilter, Sort, Document, WithId, OptionalUnlessRequiredId } from "mongodb";
import * as mongo from '../db/mongodb';

export default class Repository<TModel extends Document> {
  private collection: Collection<TModel>;

  constructor(collectionName: string) {
    this.collection = mongo.getCollection<TModel>(collectionName);
  }

  async all(filter: Filter<TModel>, sort: Sort = {}, limit = 0): Promise<WithId<TModel>[]> {
    return await this.collection
      .find(filter)
      .limit(limit)
      .sort(sort)
      .toArray();
  }

  async get(query: Filter<TModel>): Promise<WithId<TModel> | null> {
    return await this.collection.findOne(query);
  }

  async insert(...objs: TModel[]): Promise<void> {
    await this.collection.insertMany(objs.map(obj => <OptionalUnlessRequiredId<TModel>>(obj)));
  }

  async update(filter: Filter<TModel>, updateQuery: UpdateFilter<TModel>): Promise<void> {
    await this.collection.updateOne(filter, updateQuery);
  }

  async remove(filter: Filter<TModel>): Promise<void> {
    await this.collection.deleteMany(filter);
  }

  async removeCollection(): Promise<void> {
    await mongo.removeCollection(this.collection.collectionName);
  }

  getCollection(): Collection<TModel> {
    return this.collection;
  }
}

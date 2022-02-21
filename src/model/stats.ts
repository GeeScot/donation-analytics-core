import { ObjectId } from 'mongodb';

export type Stats = {
  _id: ObjectId;
  key: string;
  data: any;
}

import { ObjectId } from 'mongodb';

export type Analytics = {
  _id: ObjectId;
  key: string;
  data: any;
}

import { ObjectId } from 'mongodb';

export type Analytics = {
  _id: ObjectId;
  key: string;
  date: Date;
  data: any;
}

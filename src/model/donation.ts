import { ObjectId } from 'mongodb';

export type Donation = {
  _id: ObjectId;
  id: number;
  amount: number;
  name: string;
  comment: string;
  completedAt: Date;
  updatedAt: Date;
  sustained: boolean;
}

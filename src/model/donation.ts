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

export function anonymiseDonation(donation: Donation) {
  return {
    completedAt: new Date(donation.completedAt),
    amount: donation.amount 
  };
}

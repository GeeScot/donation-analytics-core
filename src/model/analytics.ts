import { ObjectId } from 'mongodb';
import { CampaignAnalytics } from '../utils/analytics';

export type Analytics = {
  _id?: ObjectId;
  key: string;
  date: Date;
  data: CampaignAnalytics;
}

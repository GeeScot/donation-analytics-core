import { Router, Request, Response, Express } from "express";
import { hasCollection } from "../db/mongodb";
import Repository from "../db/repository";
import { Donation } from "../model/donation";
import { Analytics } from "../model/analytics";
import { getCampaignDetails, createCollectionKey } from "../utils/request";


async function GetAll(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);
  
  const collectionExists = await hasCollection(campaignCollectionKey);
  if (!collectionExists) {
    res.sendStatus(500);
    return;
  }

  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  const donations = await donationsRepo.all({}, { completedAt: 1 });

  res.json(donations);
}

async function GetStats(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  const repo = new Repository<Analytics>('analytics');
  const stats = await repo.get({ key: campaignCollectionKey });

  res.json(stats);
}

export default function (app: Express) {
  const router = Router({ mergeParams: true });
  router.get("/:userId/:campaignSlug/analytics", GetStats);
  router.get("/:userId/:campaignSlug", GetAll);

  app.use("/donations", router);
}

import { Router, Request, Response, Express } from "express";
import { hasCollection } from "../db/mongodb";
import Repository from "../db/repository";
import { Donation } from "../model/donation";
import { Analytics } from "../model/analytics";
import createTiltifyService from "../services/tiltify-service";
import { getCampaignDetails, createCollectionKey } from "../utils/request";
import createCampaignAnalyticsUtility from "../utils/analytics";



// const campaignUrlRegex = /(https:\/\/tiltify.com\/)@([A-Za-z]+)\/([A-Za-z0-9-]+)/g;
const tiltify = createTiltifyService();

async function ResetStats(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  // Remove Donations Collection
  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  await donationsRepo.removeCollection();

  // Remove Stored Stats
  const statsRepo = new Repository<Analytics>('analytics');
  await statsRepo.remove({ key: campaignCollectionKey });

  res.status(200);
}

async function GetCampaign(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);
  const campaign = await tiltify.getCampaign(userId, campaignSlug);

  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);
  const collectionExists = await hasCollection(campaignCollectionKey);

  res.json({
    isCached: collectionExists,
    campaign: campaign.data
  });
}

async function CacheDonations(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  const collectionExists = await hasCollection(campaignCollectionKey);
  if (collectionExists) {
    res.sendStatus(200);
    return;
  }
  
  try {
    const allDonations = await tiltify.getDonations(userId, campaignSlug);

    const donationsRepo = new Repository<Donation>(campaignCollectionKey);
    await donationsRepo.insert(...allDonations);
  } catch (e) {
    res.status(400).send(e);
    return;
  }

  res.sendStatus(200);
}

// Calculate the stats once and store in db use code from donations.ts
async function CalculateStats(req: Request, res: Response) {
  const { userId, campaignSlug } = getCampaignDetails(req);

  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  // Already calculated these stats
  const statsRepo = new Repository<Analytics>('analytics');
  const storedStats = await statsRepo.get({ key: campaignCollectionKey });
  if (storedStats) {
    res.sendStatus(200);
    return;
  }

  // Calculate the stats
  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  const collection = donationsRepo.getCollection();

  const analyticsUtility = createCampaignAnalyticsUtility(collection);
  const campaignAnalytics = await analyticsUtility.getCampaignAnalytics();
  if (!campaignAnalytics) {
    res.sendStatus(400);
    return;
  }

  const analytics: Analytics = {
    key: campaignCollectionKey,
    date: new Date(),
    data: campaignAnalytics
  };

  await statsRepo.insert(analytics)

  res.sendStatus(200);
}

export default function (app: Express) {
  const router = Router({ mergeParams: true });
  router.get("/:userId/:campaignSlug/cache", CacheDonations);
  router.get("/:userId/:campaignSlug/calculate", CalculateStats);
  router.get("/:userId/:campaignSlug/reset", ResetStats);
  router.get("/:userId/:campaignSlug", GetCampaign);

  app.use("/campaign", router);
}

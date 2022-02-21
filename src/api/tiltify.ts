import { Router, Request, Response, Express } from "express";
import Repository from "../db/repository";
import { Donation } from "../model/donation";
import config from "../config";
import axios from "axios";
import { Stats } from "../model/stats";
import { createCollectionKey } from "../utils/collection.utilities";
import { hasCollection } from "../db/mongodb";

const client = axios.create({
  baseURL: "https://tiltify.com",
  headers: {
    'Authorization': `Bearer ${config.TiltifyAppToken}`
  }
});

// const campaignUrlRegex = /(https:\/\/tiltify.com\/)@([A-Za-z]+)\/([A-Za-z0-9-]+)/g;

async function ResetStats(req: Request, res: Response) {
  const userId = req.params.userId;
  const campaignSlug = req.params.campaignSlug.replace("@", "");
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  // Remove Donations Collection
  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  await donationsRepo.removeCollection();

  // Remove Stored Stats
  const statsRepo = new Repository<Stats>('stats');
  await statsRepo.remove({ key: campaignCollectionKey });

  res.status(200);
}

async function GetCampaign(req: Request, res: Response) {
  const userId = req.params.userId;
  const campaignSlug = req.params.campaignSlug.replace("@", "");

  const targetUrl = `/api/v3/users/${userId}/campaigns/${campaignSlug}`;
  const { data: campaign } = await client.get(targetUrl);

  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);
  const collectionExists = await hasCollection(campaignCollectionKey);

  res.json({
    isCached: collectionExists,
    campaign: campaign.data
  });
}

async function CacheDonations(req: Request, res: Response) {
  const userId = req.params.userId;
  const campaignSlug = req.params.campaignSlug.replace("@", "");
  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);

  const collectionExists = await hasCollection(campaignCollectionKey);
  if (collectionExists) {
    res.sendStatus(200);
    return;
  }

  const targetUrl = `/api/v3/users/${userId}/campaigns/${campaignSlug}`;
  const { data: campaign } = await client.get(targetUrl);

  // if campaign has not ended then stop here?
  const campaignEndDate = new Date(campaign.data.endsAt);
  if (campaignEndDate > new Date()) {
    res.sendStatus(500);
    return;
  }

  let donationsTargetUrl = `/api/v3/campaigns/${campaign.data.id}/donations?count=100`;
  let allDonations: Donation[] = [];
  let donationCount = 0;

  do {
    const { data: donations } = await client.get(donationsTargetUrl);
    donationsTargetUrl = donations.prev;

    donationCount = donations.data.length;
    allDonations.push(...donations.data);
  } while(donationCount === 100);

  allDonations = allDonations.map((donation) => {
    return {
      ...donation,
      completedAt: new Date(donation.completedAt),
      updatedAt: new Date(donation.updatedAt)
    }
  })

  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  await donationsRepo.insert(...allDonations);

  res.sendStatus(200);
}

// Calculate the stats once and store in db use code from donations.ts
async function CalculateStats(req: Request, res: Response) {
  const userId = req.params.userId;
  const campaignSlug = req.params.campaignSlug.replace("@", "");

  const campaignCollectionKey = createCollectionKey('donations', userId, campaignSlug);
  const donationsRepo = new Repository<Donation>(campaignCollectionKey);
  const collection = donationsRepo.getCollection();

  const stats = <any>await collection
    .aggregate([
      { $sort: { completedAt: -1 } },
      {
        $group: {
          _id: "",
          amount: { $sum: "$amount" },
          average: { $avg: "$amount" },
          numberOfDonations: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          total: "$amount",
          average: "$average",
          count: "$numberOfDonations",
        },
      },
    ])
    .toArray();

  const group1Donations = <any>await collection
    .find({
      $and: [{ amount: { $gte: 1 } }, { amount: { $lte: 10 } }],
    })
    .toArray();
  const group2Donations = <any>await collection
    .find({
      $and: [{ amount: { $gt: 10 } }, { amount: { $lte: 50 } }],
    })
    .toArray();
  const group3Donations = <any>await collection
    .find({
      $and: [{ amount: { $gt: 50 } }, { amount: { $lte: 200 } }],
    })
    .toArray();
  const group4Donations = <any>await collection
    .find({
      $and: [{ amount: { $gt: 200 } }, { amount: { $lte: 500 } }],
    })
    .toArray();
  const group5Donations = <any>await collection
    .find({
      $and: [{ amount: { $gt: 500 } }],
    })
    .toArray();

  const hourlyDonations = await collection
    .aggregate([
      { $sort: { completedAt: 1 } },
      {
        $project: {
          hour: {
            $dateToString: {
              date: "$completedAt",
              format: "%Y-%m-%dT%H:00:00.000Z",
            },
          },
          amount: 1,
        },
      },
      {
        $group: {
          // _id: { year: "$y", month: "$m", day: "$d", hour: "$h" },
          _id: "$hour",
          average: { $avg: "$amount" },
          standardDeviation: { $stdDevPop: "$amount" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const hourlyBalance = [];
  for (let i = 0; i < hourlyDonations.length; i++) {
    const donos = hourlyDonations
      .slice(0, i + 1)
      .map((hourly: any) => hourly.total);
    hourlyBalance.push({
      hour: hourlyDonations[i]._id,
      balance: parseFloat(donos.reduce((a, v) => a + v).toFixed(2)),
    });
  }

  const result = {
    total: stats[0].total,
    average: parseFloat(stats[0].average.toFixed(2)),
    count: stats[0].count,
    hourlyDonations: hourlyDonations.map((hourlyGroup: any) => {
      return {
        hour: hourlyGroup._id,
        average: parseFloat(hourlyGroup.average.toFixed(2)),
        standardDeviation: parseFloat(hourlyGroup.standardDeviation.toFixed(2)),
        total: parseFloat(hourlyGroup.total.toFixed(2)),
        count: hourlyGroup.count,
      };
    }),
    hourlyBalance: hourlyBalance,
    group: [
      {
        key: "$1 - $10",
        count: group1Donations.length,
      },
      {
        key: "$10.01 - $50",
        count: group2Donations.length,
      },
      {
        key: "$50.01 - $200",
        count: group3Donations.length,
      },
      {
        key: "$200.01 - $500",
        count: group4Donations.length,
      },
      {
        key: "Over $500",
        count: group5Donations.length,
      },
    ],
  };

  const statsRepo = new Repository<Stats>('stats');
  await statsRepo.insert({
    key: campaignCollectionKey,
    data: result
  } as Stats)

  res.sendStatus(200);
}

export default function (app: Express) {
  const router = Router({ mergeParams: true });
  router.get("/:userId/:campaignSlug/cache", CacheDonations);
  router.get("/:userId/:campaignSlug/calculate", CalculateStats);
  router.get("/:userId/:campaignSlug/reset", ResetStats);
  router.get("/:userId/:campaignSlug", GetCampaign);

  app.use("/tiltify", router);
}

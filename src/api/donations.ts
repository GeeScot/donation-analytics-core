import { Router, Request, Response, NextFunction, Express } from "express";
import Repository from "../db/repository";
import { formatDonation, Donation } from "../model/donation";

declare global {
  namespace Express {
    export interface Request {
      donations: Repository<Donation>;
    }
  }
}

async function middleware(
  req: Request,
  _: Response,
  next: NextFunction
): Promise<void> {
  req.donations = new Repository<Donation>("donations");
  await next();
}

async function GetAll(req: Request, res: Response) {
  const donations = await req.donations.all({}, { completedAt: 1 });
  res.json(donations);
}

async function GetStats(req: Request, res: Response) {
  const collection = req.donations.getCollection();

  const latestDonations = await req.donations.all({}, { completedAt: -1 }, 5);
  const topDonations = await req.donations.all({}, { amount: -1 }, 5);
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

  const group1Donations = <any>await collection.find({
    $and: [
      { amount: { $gte: 1 } },
      { amount: { $lt: 10 } }
    ]
  }).toArray();
  const group2Donations = <any>await collection.find({
    $and: [
      { amount: { $gte: 10 } },
      { amount: { $lt: 50 } }
    ]
  }).toArray();
  const group3Donations = <any>await collection.find({
    $and: [
      { amount: { $gte: 50 } },
      { amount: { $lt: 200 } }
    ]
  }).toArray();
  const group4Donations = <any>await collection.find({
    $and: [
      { amount: { $gte: 200 } },
      { amount: { $lt: 500 } }
    ]
  }).toArray();
  const group5Donations = <any>await collection.find({
    $and: [
      { amount: { $gte: 500 } }
    ]
  }).toArray();

  const hourlyDonations = await collection.aggregate([
    { $sort: { completedAt: 1 } },
    {
      $project: {
        hour: { $dateToString: { date: "$completedAt", format: "%Y-%m-%dT%H:00:00.000Z" } },
        amount: 1
      }
    },
    {
      $group: {
        // _id: { year: "$y", month: "$m", day: "$d", hour: "$h" },
        _id: "$hour",
        average: { $avg: "$amount" },
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();

  const hourlyBalance = [];
  for (let i = 0; i < hourlyDonations.length; i++) {
    const donos = hourlyDonations.slice(0, i + 1).map((hourly: any) => hourly.total);
    hourlyBalance.push({
      hour: hourlyDonations[i]._id,
      balance: parseFloat(donos.reduce((a, v) => a + v).toFixed(2))
    });
  }

  const result = {
    total: stats[0].total,
    average: parseFloat(stats[0].average.toFixed(2)),
    count: stats[0].count,
    latestDonations: latestDonations.map(formatDonation),
    topDonations: topDonations.map(formatDonation),
    hourlyDonations: hourlyDonations.map((hourlyGroup: any) => {
      return {
        hour: hourlyGroup._id,
        average: parseFloat(hourlyGroup.average.toFixed(2)),
        total: parseFloat(hourlyGroup.total.toFixed(2)),
        count: hourlyGroup.count
      }
    }),
    hourlyBalance: hourlyBalance,
    group: [
      {
        key: '$1 - $9.99',
        count: group1Donations.length
      },
      {
        key: '$10 - $49.99',
        count: group2Donations.length
      },
      {
        key: '$50 - $199.99',
        count: group3Donations.length
      },
      {
        key: '$200 - $499.99',
        count: group4Donations.length
      },
      {
        key: 'Over $500',
        count: group5Donations.length
      }
    ]
  };

  res.json(result);
}

export default function (app: Express) {
  const router = Router();
  router.use(middleware);
  router.get("/", GetAll);
  router.get("/stats", GetStats);

  app.use("/donations", router);
}

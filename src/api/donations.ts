import { Router, Request, Response, Express } from "express";
import Repository from "../db/repository";
import { Donation } from "../model/donation";

async function GetAllWithModify(req: Request, res: Response) {
  const repo = new Repository<Donation>(req.params.eventName);
  const collection = repo.getCollection();
  const documentCount = await collection.countDocuments({});

  if (documentCount === 0) {
    res.sendStatus(500);
    return;
  }

  const donations = await repo.all({}, { completedAt: 1 });

  for (let i = 0; i < donations.length; i++) {
    await repo.update({
      _id: donations[i]._id
    }, {
      $set: {
        completedAt: new Date(donations[i].completedAt),
        updatedAt: new Date(donations[i].updatedAt)
      }
    })
  }

  res.json(donations);
}

async function GetAll(req: Request, res: Response) {
  const repo = new Repository<Donation>(req.params.eventName);
  const collection = repo.getCollection();
  const documentCount = await collection.countDocuments({});

  if (documentCount === 0) {
    res.sendStatus(500);
    return;
  }

  const donations = await repo.all({}, { completedAt: 1 });

  // for (let i = 0; i < donations.length; i++) {
  //   await repo.update({
  //     _id: donations[i]._id
  //   }, {
  //     $set: {
  //       completedAt: new Date(donations[i].completedAt),
  //       updatedAt: new Date(donations[i].updatedAt)
  //     }
  //   })
  // }

  res.json(donations);
}

async function GetStats(req: Request, res: Response) {
  const repo = new Repository<Donation>(req.params.eventName);
  const collection = repo.getCollection();
  const documentCount = await collection.countDocuments({});
  
  if (documentCount === 0) {
    res.sendStatus(500);
    return;
  }

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
      { amount: { $lte: 10 } }
    ]
  }).toArray();
  const group2Donations = <any>await collection.find({
    $and: [
      { amount: { $gt: 10 } },
      { amount: { $lte: 50 } }
    ]
  }).toArray();
  const group3Donations = <any>await collection.find({
    $and: [
      { amount: { $gt: 50 } },
      { amount: { $lte: 200 } }
    ]
  }).toArray();
  const group4Donations = <any>await collection.find({
    $and: [
      { amount: { $gt: 200 } },
      { amount: { $lte: 500 } }
    ]
  }).toArray();
  const group5Donations = <any>await collection.find({
    $and: [
      { amount: { $gt: 500 } }
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
        standardDeviation: { $stdDevPop: "$amount" },
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
    hourlyDonations: hourlyDonations.map((hourlyGroup: any) => {
      return {
        hour: hourlyGroup._id,
        average: parseFloat(hourlyGroup.average.toFixed(2)),
        standardDeviation: parseFloat(hourlyGroup.standardDeviation.toFixed(2)),
        total: parseFloat(hourlyGroup.total.toFixed(2)),
        count: hourlyGroup.count
      }
    }),
    hourlyBalance: hourlyBalance,
    group: [
      {
        key: '$1 - $10',
        count: group1Donations.length
      },
      {
        key: '$10.01 - $50',
        count: group2Donations.length
      },
      {
        key: '$50.01 - $200',
        count: group3Donations.length
      },
      {
        key: '$200.01 - $500',
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
  const router = Router({ mergeParams: true });
  router.get("/:eventName", GetAll);
  router.get("/:eventName/fix", GetAllWithModify);
  router.get("/:eventName/stats", GetStats);

  app.use("/donations", router);
}

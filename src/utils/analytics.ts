import { Collection } from "mongodb";
import { Donation } from "../model/donation";

type Analytics = {
  total: number;
  average: number;
  count: number;
};

type HourlyDonations = {
  hour: number;
  average: number;
  standardDeviation: number;
  total: number;
  count: number;
};

type HourlyBalance = {
  hour: number;
  balance: number;
}

type DonationGroup = {
  key: string;
  count: number;
}

export type CampaignAnalytics = {
  analytics: Analytics;
  hourlyDonations: HourlyDonations[];
  hourlyBalance: HourlyBalance[];
  groups: DonationGroup[];
}

const createCampaignAnalyticsUtility = (collection: Collection<Donation>) => {
  const getAnalytics = async (): Promise<Analytics | null> => {
    const results = <any>await collection
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

    if (results.length < 1) {
      return null;
    }

    return {
      total: results[0].total,
      average: parseFloat(results[0].average.toFixed(2)),
      count: results[0].count,
    };
  };

  const getDonationGroups = async (): Promise<DonationGroup[]> => {
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

    return [
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
    ];
  };

  const getHourlyDonations = async (): Promise<HourlyDonations[]> => {
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

    return hourlyDonations.map((hourlyGroup: any) => {
      return {
        hour: hourlyGroup._id,
        average: parseFloat(hourlyGroup.average.toFixed(2)),
        standardDeviation: parseFloat(hourlyGroup.standardDeviation.toFixed(2)),
        total: parseFloat(hourlyGroup.total.toFixed(2)),
        count: hourlyGroup.count,
      };
    });
  };

  const getHourlyBalance = async (hourlyDonations: HourlyDonations[]): Promise<HourlyBalance[]> => {
    const hourlyBalance = [];
    for (let i = 0; i < hourlyDonations.length; i++) {
      const donos = hourlyDonations
        .slice(0, i + 1)
        .map((hourly: any) => hourly.total);

      hourlyBalance.push({
        hour: hourlyDonations[i].hour,
        balance: parseFloat(donos.reduce((a, v) => a + v).toFixed(2)),
      });
    }

    return hourlyBalance;
  };

  const getCampaignAnalytics = async (): Promise<CampaignAnalytics | null> => {
    const analytics = await getAnalytics();
    if (!analytics) {
      return null;
    }

    const hourlyDonations = await getHourlyDonations();
    const hourlyBalance = await getHourlyBalance(hourlyDonations);
    const groups = await getDonationGroups();

    return {
      analytics,
      hourlyDonations,
      hourlyBalance,
      groups
    }
  }

  return { getCampaignAnalytics }
};

export default createCampaignAnalyticsUtility;

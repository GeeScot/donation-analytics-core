import config from "../config";
import axios from "axios";
import { Donation } from "../model/donation";

const createTiltifyService = () => {
  const client = axios.create({
    baseURL: "https://tiltify.com",
    headers: {
      Authorization: `Bearer ${config.TiltifyAppToken}`,
    },
  });

  const getCampaign = async (userId: string, campaignSlug: string): Promise<any> => {
    const targetUrl = `/api/v3/users/${userId}/campaigns/${campaignSlug}`;
    const { data: campaign } = await client.get(targetUrl);

    return campaign;
  };

  const getDonations = async (userId: string, campaignSlug: string): Promise<Donation[]> => {
    const targetUrl = `/api/v3/users/${userId}/campaigns/${campaignSlug}`;
    const { data: campaign } = await client.get(targetUrl);

    const campaignEndDate = new Date(campaign.data.endsAt);
    if (campaignEndDate > new Date()) {
      throw `Campaign ${campaign.name} hasn't ended yet`;
    }
    
    // TODO check if it's a team campaign and loop the below through all supporting campaigns and team campaign

    let donationsTargetUrl = `/api/v3/campaigns/${campaign.data.id}/donations?count=100`;
    let allDonations: Donation[] = [];
    let donationCount = 0;

    do {
      const { data: donations } = await client.get(donationsTargetUrl);
      donationsTargetUrl = donations.prev;

      donationCount = donations.data.length;
      allDonations.push(...donations.data);
    } while (donationCount === 100);

    allDonations = allDonations.map((donation) => {
      return {
        ...donation,
        completedAt: new Date(donation.completedAt),
        updatedAt: new Date(donation.updatedAt),
      };
    });

    return allDonations;
  };

  return {
    getCampaign,
    getDonations,
  };
};

export default createTiltifyService;

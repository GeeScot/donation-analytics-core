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
    const targetSubRoute = userId.startsWith('+') ? 'teams' : 'users';
    const targetUserId = userId.startsWith('+') ? userId.substring(1) : userId;

    const targetUrl = `/api/v3/${targetSubRoute}/${targetUserId}/campaigns/${campaignSlug}`;
    const { data: campaign } = await client.get(targetUrl);

    return campaign;
  };

  const getDonations = async (userId: string, campaignSlug: string): Promise<Donation[]> => {
    const campaign = await getCampaign(userId, campaignSlug);
    if (!campaign.data.endsAt) {
      throw `Campaign ${campaign.name} hasn't ended yet`;
    }

    const campaignEndDate = new Date(campaign.data.endsAt);
    if (campaignEndDate > new Date()) {
      throw `Campaign ${campaign.name} hasn't ended yet`;
    }
    
    const supportingCampaigns = await getSupportingCampaigns(campaign.data.id);
    const supportingCampaignIds = supportingCampaigns.data.map((supportingCampaign: any): number => supportingCampaign.id);
    supportingCampaignIds.push(campaign.data.id);

    let allDonations: Donation[] = [];
    for (const supportingCampaignId of supportingCampaignIds) {
      let donationsTargetUrl = `/api/v3/campaigns/${supportingCampaignId}/donations?count=100`;
      let donationCount = 0;

      do {
        const { data: donations } = await client.get(donationsTargetUrl);
        donationsTargetUrl = donations.links.prev;

        donationCount = donations.data.length;
        allDonations.push(...donations.data);
      } while (donationCount === 100);
    }

    allDonations = allDonations.map((donation) => {
      return {
        ...donation,
        completedAt: new Date(donation.completedAt),
        updatedAt: new Date(donation.updatedAt),
      };
    });

    return allDonations;
  };

  const getSupportingCampaigns = async (campaignId: number): Promise<any> => {
    const targetUrl = `/api/v3/campaigns/${campaignId}/supporting-campaigns`;
    const { data: supportingCampaigns } = await client.get(targetUrl);

    return supportingCampaigns;
  }

  return {
    getCampaign,
    getDonations,
  };
};

export default createTiltifyService;

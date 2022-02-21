import { Request } from "express";

export function getCampaignDetails(req: Request) {
  return {
    userId: req.params.userId.replace('@', ''),
    campaignSlug: req.params.campaignSlug
  };
}

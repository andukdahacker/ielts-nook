import { BillingService } from "./billing.service.js";

export class BillingController {
  constructor(private readonly service: BillingService) {}

  async getTiers(centerId: string) {
    const data = await this.service.getTierComparison(centerId);
    return { data, message: "Tier comparison retrieved" };
  }

  async getBillingOverview(centerId: string) {
    const data = await this.service.getBillingInfo(centerId);
    return { data, message: "Billing overview retrieved" };
  }

  async getPaymentHistory(centerId: string, page: number, limit: number) {
    const data = await this.service.getPaymentHistory(centerId, page, limit);
    return { data, message: "Payment history retrieved" };
  }

  async getUsageHistory(centerId: string) {
    const data = await this.service.getUsageHistory(centerId);
    return { data, message: "Usage history retrieved" };
  }

  async createCheckout(centerId: string, ownerEmail: string, tier: string) {
    const data = await this.service.createCheckoutSession(centerId, ownerEmail, tier);
    return { data, message: "Checkout session created" };
  }
}

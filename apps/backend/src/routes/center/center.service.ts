import { PrismaClient } from "@prisma/client";

class CenterService {
  constructor(private readonly prisma: PrismaClient) {}

  async findCenterById(id: string) {
    const center = await this.prisma.center.findUnique({
      where: {
        id,
      },
    });

    return center;
  }

  async findCenterByEmail(email: string) {
    const center = await this.prisma.center.findUnique({
      where: {
        email,
      },
    });

    return center;
  }

  async createCenter(email: string, name: string) {
    const center = await this.prisma.center.create({
      data: {
        email,
        name,
      },
    });

    return center;
  }
}

export default CenterService;

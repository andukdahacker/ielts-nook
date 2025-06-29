import { Auth } from "firebase-admin/auth";
import { AppJwtPayload } from "../../middlewares/auth.middleware";
import JwtService from "../../services/jwt.service";
import CenterService from "./center.service";
import { GetCenterResponse } from "./dto/get_center.response";
import { RegisterCenterInput } from "./dto/register_center.input";
import { RegisterCenterResponse } from "./dto/register_center.response";
import { SignInCenterInput } from "./dto/sign_in_center.input";
import { SignInCenterResponse } from "./dto/sign_in_center.response";

class CenterController {
  constructor(
    private readonly centerService: CenterService,
    private readonly firebaseAuth: Auth,
    private readonly jwtService: JwtService,
  ) {}

  async getCurrentCenter(id: string): Promise<GetCenterResponse> {
    const center = await this.centerService.findCenterById(id);

    if (!center) {
      throw new Error("Cannot find center");
    }

    return {
      data: {
        center,
      },
      message: "Get current center successfully",
    };
  }

  async register(input: RegisterCenterInput): Promise<RegisterCenterResponse> {
    const { email, name } = input;

    const existedAccount = await this.centerService.findCenterByEmail(email);

    if (existedAccount) {
      throw new Error("An account has already used this email address");
    }

    const center = await this.centerService.createCenter(email, name);

    return {
      data: {
        center,
      },
      message: "Registered center successfully",
    };
  }

  async signIn(input: SignInCenterInput): Promise<SignInCenterResponse> {
    const decodedToken = await this.firebaseAuth.verifyIdToken(
      input.idToken,
      true,
    );

    const email = decodedToken.email;

    if (!email) {
      throw new Error("Invalid token");
    }

    const center = await this.centerService.findCenterByEmail(email);

    if (!center) {
      throw new Error("Cannot find center");
    }

    const token = await this.jwtService.sign<AppJwtPayload>({
      id: center.id,
      email: center.email,
      isCenter: true,
      role: "ADMIN",
      centerId: center.id,
    });

    return {
      data: {
        token: token,
        center,
      },
      message: "Sign center in successfully",
    };
  }
}

export default CenterController;

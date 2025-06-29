import jwt from "jsonwebtoken";

class JwtService {
  constructor(private readonly secret: string) {}

  async sign<T extends object>(payload: T, options?: jwt.SignOptions) {
    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        this.secret,
        {
          ...options,
          expiresIn: "1y",
        },
        (err: Error | null, token: string | undefined) => {
          if (err) {
            reject(err);
          }

          if (token) {
            resolve(token);
          }

          reject();
        },
      );
    });
  }

  async verify<T>(token: string) {
    return new Promise<T>((resolve, reject) => {
      jwt.verify(token, this.secret, (err: Error | null, decoded: any) => {
        if (err) reject(err);
        resolve(decoded as T);
      });
    });
  }
}

export default JwtService;

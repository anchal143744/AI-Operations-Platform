import { Injectable, OnModuleInit } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id; numeric form avoids ambient const-enum emission.
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash: string | undefined;

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash("not-a-user-password");
  }

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(password: string, passwordHash?: string): Promise<boolean> {
    const candidateHash = passwordHash ?? this.dummyHash;
    if (!candidateHash) {
      throw new Error(
        "PasswordService must be initialized before verification.",
      );
    }

    try {
      const matches = await verify(candidateHash, password);
      return passwordHash ? matches : false;
    } catch {
      return false;
    }
  }
}

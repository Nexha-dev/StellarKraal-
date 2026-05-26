import { Keypair } from "@stellar/stellar-sdk";
import request from "supertest";
import app from "../index";

// Suppress logger noise
jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

jest.mock("@stellar/stellar-sdk", () => {
  const actual = jest.requireActual("@stellar/stellar-sdk");
  return {
    ...actual,
    Networks: { TESTNET: "Test SDF Network ; September 2015", PUBLIC: "Public Global Stellar Network ; September 2015" },
    BASE_FEE: "100",
    Contract: jest.fn().mockImplementation(() => ({ call: jest.fn().mockReturnValue({}) })),
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ toXDR: () => "mock_xdr" }),
    })),
    Address: jest.fn().mockImplementation(() => ({ toScVal: jest.fn().mockReturnValue({}) })),
    nativeToScVal: jest.fn().mockReturnValue({}),
    // Keep real Keypair for signature tests
    Keypair: actual.Keypair,
    SorobanRpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({ id: "GABC", sequence: "1" }),
        prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => "prepared_xdr" }),
        simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: {} } }),
        getHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
      })),
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getChallenge(): Promise<string> {
  const res = await request(app).get("/api/auth/challenge");
  expect(res.status).toBe(200);
  return res.body.challenge as string;
}

async function login(kp: Keypair): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const challenge = await getChallenge();
  const signature = kp.sign(Buffer.from(challenge, "hex")).toString("hex");
  const res = await request(app).post("/api/auth/login").send({
    publicKey: kp.publicKey(),
    signature,
    challenge,
  });
  expect(res.status).toBe(200);
  return res.body;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("JWT Authentication", () => {
  const kp = Keypair.random();

  describe("GET /api/auth/challenge", () => {
    it("returns a hex challenge string", async () => {
      const res = await request(app).get("/api/auth/challenge");
      expect(res.status).toBe(200);
      expect(typeof res.body.challenge).toBe("string");
      expect(res.body.challenge).toMatch(/^[0-9a-f]{64}$/);
    });

    it("each call returns a unique challenge", async () => {
      const a = await getChallenge();
      const b = await getChallenge();
      expect(a).not.toBe(b);
    });
  });

  describe("POST /api/auth/login", () => {
    it("returns accessToken and refreshToken for valid signature", async () => {
      const tokens = await login(kp);
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
      expect(tokens.expiresIn).toBe(900); // 15 min
    });

    it("rejects missing fields with 400", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
    });

    it("rejects invalid signature with 401", async () => {
      const challenge = await getChallenge();
      const res = await request(app).post("/api/auth/login").send({
        publicKey: kp.publicKey(),
        signature: "deadbeef".repeat(8), // wrong sig
        challenge,
      });
      expect(res.status).toBe(401);
    });

    it("rejects unknown challenge with 401", async () => {
      const fakeSig = kp.sign(Buffer.from("a".repeat(64), "hex")).toString("hex");
      const res = await request(app).post("/api/auth/login").send({
        publicKey: kp.publicKey(),
        signature: fakeSig,
        challenge: "a".repeat(64),
      });
      expect(res.status).toBe(401);
    });

    it("challenge is single-use — reuse returns 401", async () => {
      const challenge = await getChallenge();
      const signature = kp.sign(Buffer.from(challenge, "hex")).toString("hex");
      const body = { publicKey: kp.publicKey(), signature, challenge };

      const first = await request(app).post("/api/auth/login").send(body);
      expect(first.status).toBe(200);

      const second = await request(app).post("/api/auth/login").send(body);
      expect(second.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("returns new tokens for valid refresh token", async () => {
      const { refreshToken } = await login(kp);
      const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
      expect(res.status).toBe(200);
      expect(typeof res.body.accessToken).toBe("string");
      expect(typeof res.body.refreshToken).toBe("string");
    });

    it("refresh token is rotated — old token rejected", async () => {
      const { refreshToken } = await login(kp);
      await request(app).post("/api/auth/refresh").send({ refreshToken });
      const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
      expect(res.status).toBe(401);
    });

    it("rejects missing refreshToken with 400", async () => {
      const res = await request(app).post("/api/auth/refresh").send({});
      expect(res.status).toBe(400);
    });

    it("rejects invalid refresh token with 401", async () => {
      const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "bogus" });
      expect(res.status).toBe(401);
    });
  });

  describe("JWT middleware — protected routes", () => {
    it("POST without token returns 401", async () => {
      const res = await request(app).post("/api/collateral/register").send({
        owner: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        animal_type: "cattle",
        count: 5,
        appraised_value: 1_000_000,
      });
      expect(res.status).toBe(401);
    });

    it("POST with valid token succeeds", async () => {
      const { accessToken } = await login(kp);
      const res = await request(app)
        .post("/api/collateral/register")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          owner: kp.publicKey(),
          animal_type: "cattle",
          count: 5,
          appraised_value: 1_000_000,
        });
      expect(res.status).toBe(200);
    });

    it("POST with tampered token returns 401", async () => {
      const { accessToken } = await login(kp);
      const tampered = accessToken.slice(0, -4) + "xxxx";
      const res = await request(app)
        .post("/api/collateral/register")
        .set("Authorization", `Bearer ${tampered}`)
        .send({});
      expect(res.status).toBe(401);
    });

    it("GET routes are not protected", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });
  });
});

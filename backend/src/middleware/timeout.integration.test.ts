import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { timeoutMiddleware } from "../middleware/timeout";

describe("Request Timeout Integration", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it("should timeout global requests after 30 seconds", async () => {
    app.use(timeoutMiddleware(30000));
    app.get("/slow", async (req: Request, res: Response) => {
      await new Promise((resolve) => setTimeout(resolve, 35000));
      if (!res.headersSent) {
        res.json({ success: true });
      }
    });

    const response = await request(app).get("/slow").timeout(31000);

    expect(response.status).toBe(504);
    expect(response.body).toEqual({ error: "Request timeout" });
  }, 35000);

  it("should timeout write endpoints after 15 seconds", async () => {
    app.post(
      "/write",
      timeoutMiddleware(15000),
      async (req: Request, res: Response) => {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        if (!res.headersSent) {
          res.json({ success: true });
        }
      }
    );

    const response = await request(app).post("/write").timeout(16000);

    expect(response.status).toBe(504);
    expect(response.body).toEqual({ error: "Request timeout" });
  }, 21000);

  it("should complete fast requests successfully", async () => {
    app.use(timeoutMiddleware(5000));
    app.get("/fast", (req: Request, res: Response) => {
      res.json({ success: true });
    });

    const response = await request(app).get("/fast");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("should allow different timeouts per route", async () => {
    app.get(
      "/strict",
      timeoutMiddleware(1000),
      async (req: Request, res: Response) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (!res.headersSent) {
          res.json({ success: true });
        }
      }
    );

    app.get(
      "/lenient",
      timeoutMiddleware(5000),
      async (req: Request, res: Response) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        res.json({ success: true });
      }
    );

    const strictResponse = await request(app).get("/strict").timeout(2000);
    expect(strictResponse.status).toBe(504);

    const lenientResponse = await request(app).get("/lenient");
    expect(lenientResponse.status).toBe(200);
  }, 10000);

  it("should not interfere with successful responses", async () => {
    app.use(timeoutMiddleware(10000));
    app.post("/data", (req: Request, res: Response) => {
      res.status(201).json({ id: 123, created: true });
    });

    const response = await request(app).post("/data").send({ name: "test" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 123, created: true });
  });

  it("should handle multiple concurrent requests with timeouts", async () => {
    app.use(timeoutMiddleware(2000));
    app.get("/concurrent/:delay", async (req: Request, res: Response) => {
      const delay = parseInt(req.params.delay, 10);
      await new Promise((resolve) => setTimeout(resolve, delay));
      res.json({ delay });
    });

    const requests = [
      request(app).get("/concurrent/500"),
      request(app).get("/concurrent/3000").timeout(3000),
      request(app).get("/concurrent/1000"),
    ];

    const responses = await Promise.all(requests);

    expect(responses[0].status).toBe(200);
    expect(responses[1].status).toBe(504);
    expect(responses[2].status).toBe(200);
  }, 10000);
});

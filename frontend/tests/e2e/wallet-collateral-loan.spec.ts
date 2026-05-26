import { test, expect } from "@playwright/test";

const WALLET_ADDRESS = "GTESTWALLETADDRESS1234567890ABCDEFGH1234567890";
const COLLATERAL_ID = "101";
const LOAN_ID = "1";

type LoanRow = {
  id: string;
  borrower: string;
  amount: number;
  status: string;
  createdAt: string;
};

test.describe("critical borrowing journey", () => {
  test("connects a mocked Freighter wallet, registers collateral, requests a loan, and shows it on the loans page", async ({ page }) => {
    const loans: LoanRow[] = [];

    await page.addInitScript(
      ({ walletAddress }) => {
        const state = {
          submissions: 0,
        };

        window.__STELLARKRAAL_E2E__ = {
          async isConnected() {
            return { isConnected: true };
          },
          async isAllowed() {
            return { isAllowed: true };
          },
          async setAllowed() {
            return { isAllowed: true };
          },
          async getAddress() {
            return { address: walletAddress };
          },
          async signTransaction(xdr: string) {
            return { signedTxXdr: `${xdr}-signed` };
          },
          async submitSignedXdr() {
            state.submissions += 1;
            return state.submissions === 1 ? "101" : "1";
          },
        };
      },
      { walletAddress: WALLET_ADDRESS }
    );

    await page.route("**/api/v1/collateral/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ xdr: "mock-collateral-xdr" }),
      });
    });

    await page.route("**/api/loan/request", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ xdr: "mock-loan-xdr" }),
      });
    });

    await page.route("**/api/loans", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(loans),
      });
    });

    await page.route("**/api/transactions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route("**/api/health/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ health_factor: 1.5 }),
      });
    });

    await page.goto("/borrow");

    await expect(page.getByRole("button", { name: /connect freighter wallet/i })).toBeVisible();
    await page.getByRole("button", { name: /connect freighter wallet/i }).click();
    await expect(page.getByText(WALLET_ADDRESS.slice(0, 8))).toBeVisible();

    await page.getByLabel(/animal type/i).selectOption("cattle");
    await page.getByPlaceholder("Number of animals").fill("5");
    await page.getByPlaceholder("Average weight per animal").fill("250");
    await page.getByLabel(/health status/i).selectOption("good");
    await page.getByPlaceholder("Farm or region name").fill("Kaduna");
    await page.getByPlaceholder("Total value in stroops").fill("1200000");
    await page.getByRole("button", { name: /register collateral/i }).click();

    await page.getByRole("button", { name: /register$/i }).click();
    await expect(page.getByText(/Collateral registered successfully!/i)).toContainText(COLLATERAL_ID);

    await expect(page.getByRole("heading", { name: /2\. request loan/i })).toBeVisible();
    await page.getByPlaceholder("Loan amount (stroops)").fill("200000");
    await page.getByRole("button", { name: /request loan/i }).click();
    await expect(page.getByText(/Loan disbursed!/i)).toContainText(LOAN_ID);

    loans.push({
      id: LOAN_ID,
      borrower: WALLET_ADDRESS,
      amount: 200000,
      status: "active",
      createdAt: new Date("2026-05-26T00:00:00Z").toISOString(),
    });

    await page.goto("/loans");
    await expect(page.getByText(`Loan #${LOAN_ID}`)).toBeVisible();
    await expect(page.getByText(WALLET_ADDRESS)).toBeVisible();
    await expect(page.getByText("active")).toBeVisible();
  });
});

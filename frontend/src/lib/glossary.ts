export const glossaryTerms = {
  healthFactor: {
    id: "health-factor",
    term: "Health Factor",
    definition: "A numeric representation of your loan's safety. A value below 1.0 means your collateral can be liquidated."
  },
  collateralizationRatio: {
    id: "collateralization-ratio",
    term: "Collateralization Ratio",
    definition: "The ratio between the value of your collateral and your outstanding loan. Higher ratios mean a safer loan."
  },
  liquidationThreshold: {
    id: "liquidation-threshold",
    term: "Liquidation Threshold",
    definition: "The minimum collateral value required to keep your loan safe. If your collateral value falls below this point, liquidation can occur."
  },
  ltv: {
    id: "ltv",
    term: "LTV (Loan-to-Value)",
    definition: "The maximum amount you can borrow against your collateral. For example, a 70% LTV means you can borrow up to 70% of the collateral's value."
  },
  apr: {
    id: "apr",
    term: "APR (Annual Percentage Rate)",
    definition: "The annualized cost of borrowing, expressed as a percentage. It represents the yearly interest rate you pay on your loan."
  }
};

export const glossaryArray = Object.values(glossaryTerms);

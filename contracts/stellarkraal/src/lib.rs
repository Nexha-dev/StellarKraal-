//! # StellarKraal Smart Contract
//!
//! Livestock-backed micro-lending protocol on Stellar/Soroban.
//! Borrowers register livestock as on-chain collateral and receive
//! token loans up to a configured loan-to-value (LTV) ratio.
//!
//! ## Security
//! - All state-mutating functions require `require_auth()` from the relevant party.
//! - Admin-only functions verify the caller against the stored admin address.
//! - The contract can be paused (with optional auto-expiry) to halt new operations
//!   while still allowing repayments.
#![warn(missing_docs)]
#![no_std]
#[cfg(test)]
mod tests;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
    Vec,
};

// ── Storage keys ────────────────────────────────────────────────────────────
const ADMIN: Symbol = symbol_short!("ADMIN");
const ORACLE: Symbol = symbol_short!("ORACLE");
const TOKEN: Symbol = symbol_short!("TOKEN");
const LTV: Symbol = symbol_short!("LTV");        // loan-to-value bps  e.g. 6000 = 60%
const LIQ_THR: Symbol = symbol_short!("LIQTHR"); // liquidation threshold bps e.g. 8000
const TREASURY: Symbol = symbol_short!("TREASURY");
const ORIG_FEE: Symbol = symbol_short!("ORIGFEE"); // origination fee bps e.g. 50 = 0.5%
const INT_FEE: Symbol = symbol_short!("INTFEE");   // interest fee bps e.g. 1000 = 10%
const CLOSE_FACTOR: Symbol = symbol_short!("CLSFACT"); // close factor bps e.g. 5000 = 50%
const PAUSED: Symbol = symbol_short!("PAUSED");
const PAUSE_EXP: Symbol = symbol_short!("PAUSEEXP");
const PAUSE_DUR: Symbol = symbol_short!("PAUSEDUR");
// Oracle validation config
const PRICE_MIN: Symbol = symbol_short!("PRICEMIN");  // minimum valid price
const PRICE_MAX: Symbol = symbol_short!("PRICEMAX");  // maximum valid price
const STALE_THR: Symbol = symbol_short!("STALETHR");  // staleness threshold in seconds (default 3600)
const DEV_BPS: Symbol = symbol_short!("DEVBPS");      // max deviation in bps (default 2000 = 20%)


// ── Errors ───────────────────────────────────────────────────────────────────

/// Contract-level errors returned by all public functions.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Contract has not been initialised yet.
    NotInitialized = 1,
    /// `initialize` was called on an already-initialised contract.
    AlreadyInitialized = 2,
    /// Caller is not authorised to perform the operation.
    Unauthorized = 3,
    /// Requested loan amount exceeds the maximum allowed by the LTV ratio.
    InsufficientCollateral = 4,
    /// No loan record exists for the given loan ID.
    LoanNotFound = 5,
    /// No collateral record exists for the given collateral ID.
    CollateralNotFound = 6,
    /// Liquidation attempted on a loan whose health factor is ≥ 1 (safe).
    HealthFactorSafe = 7,
    /// A numeric argument is zero, negative, or would cause overflow.
    InvalidAmount = 8,
    /// Operation requires an active loan but the loan is already closed.
    LoanAlreadyClosed = 9,
    /// Fee rate exceeds the protocol maximum (500 bps / 5 %).
    InvalidFeeRate = 10,
    /// Repay amount in liquidation exceeds the close-factor cap.
    ExceedsCloseFactor = 11,
    /// Close factor must be between 1 and 10 000 bps.
    InvalidCloseFactor = 12,
    /// Contract is currently paused; write operations are blocked.
    ContractPaused = 13,
    /// Operation is already in progress (reentrancy detected).
    AlreadyInProgress = 14,
    /// Contract is not paused.
    NotPaused = 15,
    /// Contract is already paused.
    AlreadyPaused = 16,
    /// Oracle price is below the configured minimum bound.
    PriceBelowMin = 17,
    /// Oracle price is above the configured maximum bound.
    PriceAboveMax = 18,
    /// Oracle price update is older than the staleness threshold.
    PriceStale = 19,
    /// Oracle price deviates more than the allowed percentage from the last price.
    PriceDeviationExceeded = 20,
}

// ── Types ────────────────────────────────────────────────────────────────────

/// Lifecycle state of a loan.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum LoanStatus {
    /// Loan is open and outstanding balance is > 0.
    Active,
    /// Loan was fully repaid by the borrower.
    Repaid,
    /// Loan was closed via liquidation.
    Liquidated,
}

/// On-chain record for a single piece of livestock collateral.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CollateralRecord {
    /// Stellar address of the collateral owner.
    pub owner: Address,
    /// Animal type symbol (e.g. `cattle`, `goat`, `sheep`).
    pub animal_type: Symbol,
    /// Number of animals registered.
    pub count: u32,
    /// Oracle-appraised total value in the protocol token's base unit.
    pub appraised_value: i128,
    /// ID of the loan this collateral is locked to; `0` means unlocked.
    pub loan_id: u64,
}

/// On-chain record for a loan.
#[contracttype]
#[derive(Clone, Debug)]
pub struct LoanRecord {
    /// Unique loan identifier.
    pub id: u64,
    /// Stellar address of the borrower.
    pub borrower: Address,
    /// IDs of all collateral records backing this loan.
    pub collateral_ids: Vec<u64>,
    /// Sum of appraised values of all collaterals at origination time.
    pub total_collateral_value: i128,
    /// Original disbursed principal (before fees).
    pub principal: i128,
    /// Remaining outstanding balance.
    pub outstanding: i128,
    /// Current lifecycle status.
    pub status: LoanStatus,
}

/// Protocol fee configuration.
#[contracttype]
#[derive(Clone, Debug)]
pub struct FeeConfig {
    /// Origination fee in basis points (e.g. 50 = 0.5 %).
    pub origination_fee_bps: u32,
    /// Interest fee in basis points applied to the interest portion of repayments.
    pub interest_fee_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct InterestRateModel {
    pub base_rate_bps: u32,      // base interest rate in basis points
    pub slope1_bps: u32,         // slope below kink in basis points
    pub slope2_bps: u32,         // slope above kink in basis points
    pub kink_bps: u32,           // utilization kink point in basis points
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TWAPData {
    pub current_price: i128,     // current spot price
    pub twap_price: i128,        // time-weighted average price
    pub last_update: u64,        // timestamp of last price update
}

/// Oracle validation configuration.
#[contracttype]
#[derive(Clone, Debug)]
pub struct OracleConfig {
    /// Minimum acceptable price (inclusive). 0 means no lower bound.
    pub price_min: i128,
    /// Maximum acceptable price (inclusive). 0 means no upper bound.
    pub price_max: i128,
    /// Maximum age of a price update in seconds before it is considered stale.
    pub staleness_threshold: u64,
    /// Maximum allowed deviation from the previous price in basis points (e.g. 2000 = 20%).
    pub max_deviation_bps: u32,
}

// ── Storage helpers ──────────────────────────────────────────────────────────

/// Persistent storage keys used by the contract.
#[contracttype]
pub enum DataKey {
    /// Loan record keyed by loan ID.
    Loan(u64),
    /// Collateral record keyed by collateral ID.
    Collateral(u64),
    /// Monotonically increasing counter for loan IDs.
    LoanCounter,
    /// Monotonically increasing counter for collateral IDs.
    CollateralCounter,
    /// Reentrancy guard lock.
    Guard,
}

// ── Contract ─────────────────────────────────────────────────────────────────

/// StellarKraal lending contract.
#[contract]
pub struct StellarKraal;


/// RAII guard to prevent reentrancy.
///
/// Sets a temporary storage flag on creation and removes it on drop.
pub struct ReentrancyGuard {
    env: Env,
}

impl ReentrancyGuard {
    /// Create a new guard, returning [`Error::AlreadyInProgress`] if already set.
    pub fn new(env: &Env) -> Result<Self, Error> {
        if env.storage().temporary().has(&DataKey::Guard) {
            return Err(Error::AlreadyInProgress);
        }
        env.storage().temporary().set(&DataKey::Guard, &());
        Ok(Self { env: env.clone() })
    }
}

impl Drop for ReentrancyGuard {
    fn drop(&mut self) {
        self.env.storage().temporary().remove(&DataKey::Guard);
    }
}

#[contractimpl]
impl StellarKraal {
    // ── initialize ────────────────────────────────────────────────────────
    /// Initialise the contract with protocol parameters.
    ///
    /// # Parameters
    /// - `admin`: Address that will have admin privileges (fee updates, pause).
    /// - `oracle`: Address of the price oracle (reserved for future use).
    /// - `token`: SAC token address used for loan disbursements and repayments.
    /// - `treasury`: Address that receives origination and interest fees.
    /// - `ltv_bps`: Loan-to-value ratio in basis points (e.g. 6000 = 60 %).
    /// - `liquidation_threshold_bps`: Health-factor threshold below which
    ///   liquidation is permitted (e.g. 8000 = 80 %).
    ///
    /// # Errors
    /// - [`Error::AlreadyInitialized`] if called more than once.
    ///
    /// # Security
    /// Requires auth from `admin`. Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        oracle: Address,
        token: Address,
        treasury: Address,
        ltv_bps: u32,
        liquidation_threshold_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&ADMIN) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&ORACLE, &oracle);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&TREASURY, &treasury);
        env.storage().instance().set(&LTV, &ltv_bps);
        env.storage().instance().set(&LIQ_THR, &liquidation_threshold_bps);
        env.storage().instance().set(&ORIG_FEE, &50u32); // 0.5%
        env.storage().instance().set(&INT_FEE, &1000u32); // 10%
        env.storage().instance().set(&CLOSE_FACTOR, &5000u32); // 50%
        
        // Initialize interest rate model (Compound-like jump rate model)
        // base_rate: 2%, slope1: 5%, slope2: 45%, kink: 80%
        env.storage().instance().set(&BASE_RATE, &200u32);
        env.storage().instance().set(&SLOPE1, &500u32);
        env.storage().instance().set(&SLOPE2, &4500u32);
        env.storage().instance().set(&KINK, &8000u32);
        
        // Initialize liquidity tracking
        env.storage().instance().set(&TOTAL_BORROWED, &0i128);
        env.storage().instance().set(&TOTAL_LIQUIDITY, &0i128);
        
        // Initialize TWAP (1 hour window = 3600 seconds)
        env.storage().instance().set(&TWAP_WINDOW, &3600u64);
        env.storage().instance().set(&LAST_PRICE, &0i128);
        env.storage().instance().set(&LAST_PRICE_TIME, &0u64);
        env.storage().instance().set(&TWAP_PRICE, &0i128);
        env.storage().instance().set(&TWAP_SUM, &0i128);
        env.storage().instance().set(&TWAP_COUNT, &0u32);
        // Initialize oracle validation config (defaults: no bounds, 1h staleness, 20% deviation)
        env.storage().instance().set(&PRICE_MIN, &0i128);
        env.storage().instance().set(&PRICE_MAX, &0i128);
        env.storage().instance().set(&STALE_THR, &3600u64);
        env.storage().instance().set(&DEV_BPS, &2000u32);
        Ok(())
    }

    // ── is_paused ─────────────────────────────────────────────────────────
    /// Returns `true` if the contract is currently paused.
    ///
    /// Pause state auto-expires once the stored expiry ledger timestamp is
    /// reached, so this may return `false` even if `pause` was called earlier.
    pub fn is_paused(env: Env) -> bool {
        Self::is_paused_raw(&env)
    }

    // ── pause ─────────────────────────────────────────────────────────────
    /// Pause the contract, blocking new loans and liquidations.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();

        if Self::is_paused_raw(&env) {
            return Err(Error::AlreadyPaused);
        }

        let duration: u64 = env.storage().instance().get(&PAUSE_DUR).unwrap_or(24 * 3600); // Default 1 day
        let expires_at = env.ledger().timestamp().checked_add(duration).ok_or(Error::ArithmeticOverflow)?;

        env.storage().instance().set(&PAUSED, &true);
        env.storage().instance().set(&PAUSE_EXP, &expires_at);
        env.events().publish((symbol_short!("Pause"),), expires_at);
        Ok(())
    }

    // ── unpause ───────────────────────────────────────────────────────────
    /// Unpause the contract.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();

        if !Self::is_paused_raw(&env) {
            return Err(Error::NotPaused);
        }

        env.storage().instance().set(&PAUSED, &false);
        env.storage().instance().set(&PAUSE_EXP, &0u64);
        env.events().publish((symbol_short!("Unpause"),), env.ledger().timestamp());
        Ok(())
    }

    // ── set_pause_duration ────────────────────────────────────────────────
    /// Set the default duration for a pause.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn set_pause_duration(env: Env, admin: Address, duration: u64) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        env.storage().instance().set(&PAUSE_DUR, &duration);
        Ok(())
    }

    // ── update_oracle ─────────────────────────────────────────────────────
    /// Update the oracle address.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn update_oracle(env: Env, admin: Address, new_oracle: Address) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        env.storage().instance().set(&ORACLE, &new_oracle);
        env.events().publish((symbol_short!("Admin"), symbol_short!("OracleUpd")), new_oracle);
        Ok(())
    }

    // ── set_liquidation_threshold ─────────────────────────────────────────
    /// Update the liquidation threshold in basis points.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn set_liquidation_threshold(env: Env, admin: Address, threshold_bps: u32) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        if threshold_bps == 0 || threshold_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }
        env.storage().instance().set(&LIQ_THR, &threshold_bps);
        env.events().publish((symbol_short!("Admin"), symbol_short!("LiqThrUpd")), threshold_bps);
        Ok(())
    }

    // ── propose_new_admin ─────────────────────────────────────────────────
    /// Propose a new admin address (Step 1 of transfer).
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn propose_new_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        env.storage().instance().set(&PENDING_ADMIN, &new_admin);
        env.events().publish((symbol_short!("Admin"), symbol_short!("PropNewAd")), new_admin);
        Ok(())
    }

    // ── accept_admin_role ─────────────────────────────────────────────────
    /// Accept the admin role (Step 2 of transfer).
    ///
    /// # Security
    /// Only the pending admin can call this.
    pub fn accept_admin_role(env: Env, new_admin: Address) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        let pending: Address = env.storage().instance().get(&PENDING_ADMIN).ok_or(Error::Unauthorized)?;
        if new_admin != pending {
            return Err(Error::Unauthorized);
        }
        new_admin.require_auth();
        
        env.storage().instance().set(&ADMIN, &new_admin);
        env.storage().instance().remove(&PENDING_ADMIN);
        env.events().publish((symbol_short!("Admin"), symbol_short!("AdminUpd")), new_admin);
        Ok(())
    }

    // ── register_livestock ────────────────────────────────────────────────
    /// Register livestock as on-chain collateral.
    ///
    /// # Parameters
    /// - `owner`: Stellar address of the animal owner.
    /// - `animal_type`: Short symbol identifying the species (e.g. `cattle`).
    /// - `count`: Number of animals being registered (must be > 0).
    /// - `appraised_value`: Oracle-appraised total value in token base units (must be > 0).
    ///
    /// # Returns
    /// The newly assigned collateral ID.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] if the contract has not been initialised.
    /// - [`Error::ContractPaused`] if the contract is paused.
    /// - [`Error::InvalidAmount`] if `count` or `appraised_value` is zero.
    ///
    /// # Security
    /// Requires auth from `owner`.
    pub fn register_livestock(
        env: Env,
        owner: Address,
        animal_type: Symbol,
        count: u32,
        appraised_value: i128,
    ) -> Result<u64, Error> {
        Self::assert_initialized(&env)?;
        Self::assert_not_paused(&env)?;
        if appraised_value <= 0 || count == 0 {
            return Err(Error::InvalidAmount);
        }
        owner.require_auth();

        let id = Self::next_id(&env, DataKey::CollateralCounter);
        let record = CollateralRecord {
            owner,
            animal_type,
            count,
            appraised_value,
            loan_id: 0,
        };
        env.storage().persistent().set(&DataKey::Collateral(id), &record);

        // Emit livestock_registered event
        env.events().publish(
            (symbol_short!("livestock"), symbol_short!("registered")),
            (id, record.owner.clone(), record.animal_type.clone(), record.count, record.appraised_value),
        );

        Ok(id)
    }

    // ── request_loan ──────────────────────────────────────────────────────
    /// Request a new loan against one or more collateral records.
    ///
    /// Validates that the requested `amount` does not exceed
    /// `total_collateral_value * ltv_bps / 10_000`. An origination fee is
    /// deducted from the disbursement and sent to the treasury.
    ///
    /// # Parameters
    /// - `borrower`: Address receiving the loan.
    /// - `collateral_ids`: Non-empty list of collateral IDs owned by `borrower`.
    /// - `amount`: Gross loan amount in token base units (before origination fee).
    ///
    /// # Returns
    /// The newly assigned loan ID.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] / [`Error::ContractPaused`]
    /// - [`Error::InvalidAmount`] if `amount` ≤ 0 or arithmetic overflows.
    /// - [`Error::CollateralNotFound`] if any collateral ID is invalid or the list is empty.
    /// - [`Error::Unauthorized`] if any collateral is not owned by `borrower`.
    /// - [`Error::InsufficientCollateral`] if `amount` exceeds the LTV-capped maximum.
    ///
    /// # Security
    /// Requires auth from `borrower`. Collateral ownership is verified on-chain.
    pub fn request_loan(
        env: Env,
        borrower: Address,
        collateral_ids: Vec<u64>,
        amount: i128,
    ) -> Result<u64, Error> {
        let _guard = ReentrancyGuard::new(&env)?;
        Self::assert_initialized(&env)?;
        Self::assert_not_paused(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if collateral_ids.is_empty() {
            return Err(Error::CollateralNotFound);
        }
        borrower.require_auth();

        // Sum appraised values across all collaterals, verify ownership
        let mut total_collateral_value: i128 = 0;
        for col_id in collateral_ids.iter() {
            let collateral: CollateralRecord = env
                .storage()
                .persistent()
                .get(&DataKey::Collateral(col_id))
                .ok_or(Error::CollateralNotFound)?;
            if collateral.owner != borrower {
                return Err(Error::Unauthorized);
            }
            total_collateral_value = total_collateral_value
                .checked_add(collateral.appraised_value)
                .ok_or(Error::InvalidAmount)?;
        }

        let ltv: u32 = env.storage().instance().get(&LTV).unwrap();
        let max_loan = total_collateral_value
            .checked_mul(ltv as i128)
            .ok_or(Error::InvalidAmount)?
            / 10_000;

        if amount > max_loan {
            return Err(Error::InsufficientCollateral);
        }

        // Calculate origination fee
        let orig_fee_bps: u32 = env.storage().instance().get(&ORIG_FEE).unwrap();
        let fee = amount.checked_mul(orig_fee_bps as i128).ok_or(Error::InvalidAmount)? / 10_000;
        let disbursement = amount.checked_sub(fee).ok_or(Error::InvalidAmount)?;

        let loan_id = Self::next_id(&env, DataKey::LoanCounter);
        let loan = LoanRecord {
            id: loan_id,
            borrower: borrower.clone(),
            collateral_ids: collateral_ids.clone(),
            total_collateral_value,
            principal: amount,
            outstanding: amount,
            status: LoanStatus::Active,
        };
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Mark all collaterals as locked to this loan
        for col_id in collateral_ids.iter() {
            let mut col: CollateralRecord = env
                .storage()
                .persistent()
                .get(&DataKey::Collateral(col_id))
                .unwrap();
            col.loan_id = loan_id;
            env.storage().persistent().set(&DataKey::Collateral(col_id), &col);
        }

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_addr);

        // Transfer fee to treasury
        if fee > 0 {
            let treasury: Address = env.storage().instance().get(&TREASURY).unwrap();
            token_client.transfer(&env.current_contract_address(), &treasury, &fee);
            env.events().publish((symbol_short!("FeeCol"), loan_id), (symbol_short!("originate"), fee));
        }

        // Disburse net amount to borrower
        token_client.transfer(&env.current_contract_address(), &borrower, &disbursement);

        // Emit loan_requested event
        env.events().publish(
            (symbol_short!("loan"), symbol_short!("requested")),
            (loan_id, borrower.clone(), amount, disbursement, total_collateral_value),
        );

        Ok(loan_id)
    }

    // ── repay_loan ────────────────────────────────────────────────────────
    /// Repay part or all of an active loan.
    ///
    /// Repayment is intentionally **not** blocked when the contract is paused,
    /// so borrowers can always reduce their exposure.
    /// If `amount` exceeds the outstanding balance the excess is ignored and
    /// only the outstanding amount is collected.
    ///
    /// # Parameters
    /// - `borrower`: Address making the repayment (must match loan's borrower).
    /// - `loan_id`: ID of the loan to repay.
    /// - `amount`: Amount to repay in token base units (must be > 0).
    ///
    /// # Errors
    /// - [`Error::NotInitialized`]
    /// - [`Error::InvalidAmount`] if `amount` ≤ 0.
    /// - [`Error::LoanNotFound`] if `loan_id` does not exist.
    /// - [`Error::Unauthorized`] if `borrower` does not match the loan record.
    /// - [`Error::LoanAlreadyClosed`] if the loan is not in `Active` status.
    ///
    /// # Security
    /// Requires auth from `borrower`. Token transfer is initiated from `borrower`.
    pub fn repay_loan(env: Env, borrower: Address, loan_id: u64, amount: i128) -> Result<(), Error> {
        let _guard = ReentrancyGuard::new(&env)?;
        Self::assert_initialized(&env)?;
        // NOTE: repayment intentionally NOT blocked by pause
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        borrower.require_auth();

        let mut loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .ok_or(Error::LoanNotFound)?;

        if loan.borrower != borrower {
            return Err(Error::Unauthorized);
        }
        if loan.status != LoanStatus::Active {
            return Err(Error::LoanAlreadyClosed);
        }

        let repay_amount = amount.min(loan.outstanding);
        
        // Calculate interest (amount above principal) and fee
        let principal_remaining = loan.outstanding.min(loan.principal);
        let interest_portion = if repay_amount > principal_remaining {
            repay_amount - principal_remaining
        } else {
            0
        };
        
        let int_fee_bps: u32 = env.storage().instance().get(&INT_FEE).unwrap();
        let interest_fee = interest_portion.checked_mul(int_fee_bps as i128).ok_or(Error::InvalidAmount)? / 10_000;

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&borrower, &env.current_contract_address(), &repay_amount);

        // Transfer interest fee to treasury
        if interest_fee > 0 {
            let treasury: Address = env.storage().instance().get(&TREASURY).unwrap();
            token_client.transfer(&env.current_contract_address(), &treasury, &interest_fee);
            env.events().publish((symbol_short!("FeeCol"), loan_id), (symbol_short!("interest"), interest_fee));
        }

        loan.outstanding = loan.outstanding.checked_sub(repay_amount).ok_or(Error::InvalidAmount)?;
        if loan.outstanding == 0 {
            loan.status = LoanStatus::Repaid;
        }
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Emit loan_repaid event
        env.events().publish(
            (symbol_short!("loan"), symbol_short!("repaid")),
            (loan_id, borrower.clone(), repay_amount, loan.outstanding, loan.status.clone()),
        );

        Ok(())
    }

    // ── liquidate ─────────────────────────────────────────────────────────
    /// Liquidate an undercollateralised loan position.
    ///
    /// The liquidator repays up to `close_factor` of the outstanding debt and
    /// receives collateral in return (collateral transfer is handled off-chain
    /// via the oracle/settlement layer).
    ///
    /// # Parameters
    /// - `liquidator`: Address performing the liquidation.
    /// - `loan_id`: ID of the loan to liquidate.
    /// - `repay_amount`: Amount of debt the liquidator wishes to repay (must be > 0
    ///   and ≤ `outstanding * close_factor / 10_000`).
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] / [`Error::ContractPaused`]
    /// - [`Error::InvalidAmount`] if `repay_amount` ≤ 0.
    /// - [`Error::LoanNotFound`] / [`Error::LoanAlreadyClosed`]
    /// - [`Error::HealthFactorSafe`] if health factor ≥ 10 000 (loan is healthy).
    /// - [`Error::ExceedsCloseFactor`] if `repay_amount` exceeds the close-factor cap.
    ///
    /// # Security
    /// Requires auth from `liquidator`. Only callable when health factor < 1.
    pub fn liquidate(env: Env, liquidator: Address, loan_id: u64, repay_amount: i128) -> Result<(), Error> {
        let _guard = ReentrancyGuard::new(&env)?;
        Self::assert_initialized(&env)?;
        Self::assert_not_paused(&env)?;
        if repay_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        liquidator.require_auth();

        let mut loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .ok_or(Error::LoanNotFound)?;

        if loan.status != LoanStatus::Active {
            return Err(Error::LoanAlreadyClosed);
        }

        // Batch both instance reads before the health-factor check to avoid
        // a second round-trip into instance storage inside the helper.
        let liq_thr: u32 = env.storage().instance().get(&LIQ_THR).unwrap();
        let close_factor: u32 = env.storage().instance().get(&CLOSE_FACTOR).unwrap();

        let hf = Self::compute_health_factor_with_thr(&loan, liq_thr)?;
        if hf >= 10_000 {
            return Err(Error::HealthFactorSafe);
        }

        // Enforce close factor cap
        let max_repay = loan.outstanding
            .checked_mul(close_factor as i128)
            .ok_or(Error::InvalidAmount)?
            / 10_000;
        if repay_amount > max_repay {
            return Err(Error::ExceedsCloseFactor);
        }

        let token_addr: Address = env.storage().instance().get(&TOKEN).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&liquidator, &env.current_contract_address(), &repay_amount);

        loan.outstanding = loan.outstanding.checked_sub(repay_amount).ok_or(Error::InvalidAmount)?;
        if loan.outstanding == 0 {
            loan.status = LoanStatus::Liquidated;
        }
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Emit loan_liquidated event
        env.events().publish(
            (symbol_short!("loan"), symbol_short!("liquidated")),
            (loan_id, liquidator.clone(), repay_amount, loan.outstanding, loan.status.clone()),
        );

        Ok(())
    }

    // ── set_close_factor ──────────────────────────────────────────────────
    /// Update the close factor used to cap liquidation repayments.
    ///
    /// # Parameters
    /// - `admin`: Must match the stored admin address.
    /// - `close_factor_bps`: New close factor in basis points (1–10 000).
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] / [`Error::Unauthorized`]
    /// - [`Error::InvalidCloseFactor`] if value is 0 or > 10 000.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn set_close_factor(env: Env, admin: Address, close_factor_bps: u32) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        // Must be between 1 bps and 100% (10_000 bps)
        if close_factor_bps == 0 || close_factor_bps > 10_000 {
            return Err(Error::InvalidCloseFactor);
        }
        env.storage().instance().set(&CLOSE_FACTOR, &close_factor_bps);
        Ok(())
    }

    // ── get_close_factor ──────────────────────────────────────────────────
    /// Returns the current close factor in basis points.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`]
    pub fn get_close_factor(env: Env) -> Result<u32, Error> {
        Self::assert_initialized(&env)?;
        Ok(env.storage().instance().get(&CLOSE_FACTOR).unwrap())
    }

    // ── health_factor ─────────────────────────────────────────────────────
    /// Compute the health factor for a loan (scaled by 10 000).
    ///
    /// `health = (collateral_value * liquidation_threshold_bps) / (outstanding * 10_000) * 10_000`
    ///
    /// A value ≥ 10 000 means the position is healthy; < 10 000 means it is
    /// eligible for liquidation.  Returns `i128::MAX` when outstanding is 0.
    ///
    /// # Optimization notes
    /// - `assert_initialized` is omitted: a loan record in persistent storage can only
    ///   exist if `initialize` was called, so the loan fetch already implies initialization.
    ///   This removes one instance-storage `has()` call from the hot path.
    /// - `LIQ_THR` is read once here and forwarded to `compute_health_factor` as a plain
    ///   `u32`, avoiding a second instance-storage read inside the helper.
    ///
    /// # Errors
    /// - [`Error::LoanNotFound`] if `loan_id` does not exist (also covers uninitialized state).
    pub fn health_factor(env: Env, loan_id: u64) -> Result<i128, Error> {
        // Single persistent read for the loan record.
        let loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .ok_or(Error::LoanNotFound)?;
        // Single instance read for the threshold, passed directly to avoid re-reading inside helper.
        let liq_thr: u32 = env.storage().instance().get(&LIQ_THR).unwrap();
        Self::compute_health_factor_with_thr(&loan, liq_thr)
    }

    // ── get_loan ──────────────────────────────────────────────────────────
    /// Fetch a loan record by ID.
    ///
    /// # Errors
    /// - [`Error::LoanNotFound`] if the ID does not exist.
    pub fn get_loan(env: Env, loan_id: u64) -> Result<LoanRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .ok_or(Error::LoanNotFound)
    }

    // ── get_collateral ────────────────────────────────────────────────────
    /// Fetch a collateral record by ID.
    ///
    /// # Errors
    /// - [`Error::CollateralNotFound`] if the ID does not exist.
    pub fn get_collateral(env: Env, collateral_id: u64) -> Result<CollateralRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Collateral(collateral_id))
            .ok_or(Error::CollateralNotFound)
    }

    // ── get_loan_collaterals ──────────────────────────────────────────────
    /// Return all collateral records associated with a loan.
    ///
    /// # Errors
    /// - [`Error::LoanNotFound`] if `loan_id` does not exist.
    /// - [`Error::CollateralNotFound`] if any linked collateral record is missing.
    pub fn get_loan_collaterals(env: Env, loan_id: u64) -> Result<Vec<CollateralRecord>, Error> {
        let loan: LoanRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(loan_id))
            .ok_or(Error::LoanNotFound)?;
        let mut records: Vec<CollateralRecord> = Vec::new(&env);
        for col_id in loan.collateral_ids.iter() {
            let col: CollateralRecord = env
                .storage()
                .persistent()
                .get(&DataKey::Collateral(col_id))
                .ok_or(Error::CollateralNotFound)?;
            records.push_back(col);
        }
        Ok(records)
    }

    // ── update_fee_config ─────────────────────────────────────────────────
    /// Update origination and interest fee rates.
    ///
    /// Both rates are capped at 500 bps (5 %) to protect borrowers.
    ///
    /// # Parameters
    /// - `admin`: Must match the stored admin address.
    /// - `origination_fee_bps`: New origination fee (0–500 bps).
    /// - `interest_fee_bps`: New interest fee (0–500 bps).
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] / [`Error::Unauthorized`]
    /// - [`Error::InvalidFeeRate`] if either rate exceeds 500 bps.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn update_fee_config(
        env: Env,
        admin: Address,
        origination_fee_bps: u32,
        interest_fee_bps: u32,
    ) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        let stored_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        if origination_fee_bps > 500 || interest_fee_bps > 500 {
            return Err(Error::InvalidFeeRate);
        }

        env.storage().instance().set(&ORIG_FEE, &origination_fee_bps);
        env.storage().instance().set(&INT_FEE, &interest_fee_bps);
        Ok(())
    }

    // ── get_fee_config ────────────────────────────────────────────────────
    /// Return the current fee configuration.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`]
    pub fn get_fee_config(env: Env) -> Result<FeeConfig, Error> {
        Self::assert_initialized(&env)?;
        let orig: u32 = env.storage().instance().get(&ORIG_FEE).unwrap();
        let int: u32 = env.storage().instance().get(&INT_FEE).unwrap();
        Ok(FeeConfig {
            origination_fee_bps: orig,
            interest_fee_bps: int,
        })
    }

    // ── set_interest_rate_model ───────────────────────────────────────────
    pub fn set_interest_rate_model(
        env: Env,
        admin: Address,
        base_rate_bps: u32,
        slope1_bps: u32,
        slope2_bps: u32,
        kink_bps: u32,
    ) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        
        // Validate parameters
        if kink_bps == 0 || kink_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }
        
        env.storage().instance().set(&BASE_RATE, &base_rate_bps);
        env.storage().instance().set(&SLOPE1, &slope1_bps);
        env.storage().instance().set(&SLOPE2, &slope2_bps);
        env.storage().instance().set(&KINK, &kink_bps);
        Ok(())
    }

    // ── get_interest_rate_model ───────────────────────────────────────────
    pub fn get_interest_rate_model(env: Env) -> Result<InterestRateModel, Error> {
        Self::assert_initialized(&env)?;
        let base: u32 = env.storage().instance().get(&BASE_RATE).unwrap_or(200);
        let slope1: u32 = env.storage().instance().get(&SLOPE1).unwrap_or(500);
        let slope2: u32 = env.storage().instance().get(&SLOPE2).unwrap_or(4500);
        let kink: u32 = env.storage().instance().get(&KINK).unwrap_or(8000);
        Ok(InterestRateModel {
            base_rate_bps: base,
            slope1_bps: slope1,
            slope2_bps: slope2,
            kink_bps: kink,
        })
    }

    // ── get_current_interest_rate ─────────────────────────────────────────
    /// Returns the current interest rate in basis points based on utilization
    pub fn get_current_interest_rate(env: Env) -> Result<u32, Error> {
        Self::assert_initialized(&env)?;
        let utilization = Self::calculate_utilization(&env)?;
        Ok(Self::calculate_interest_rate(&env, utilization)?)
    }

    // ── set_oracle_config ─────────────────────────────────────────────────
    /// Update oracle price validation parameters.
    ///
    /// # Parameters
    /// - `price_min`: Minimum valid price (0 = no lower bound).
    /// - `price_max`: Maximum valid price (0 = no upper bound).
    /// - `staleness_threshold`: Max age of a price update in seconds.
    /// - `max_deviation_bps`: Max allowed deviation from last price in bps (e.g. 2000 = 20%).
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] / [`Error::Unauthorized`]
    /// - [`Error::InvalidAmount`] if `price_min` > `price_max` (when both non-zero),
    ///   `staleness_threshold` is 0, or `max_deviation_bps` > 10_000.
    ///
    /// # Security
    /// Admin-only. Requires auth from `admin`.
    pub fn set_oracle_config(
        env: Env,
        admin: Address,
        price_min: i128,
        price_max: i128,
        staleness_threshold: u64,
        max_deviation_bps: u32,
    ) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        if staleness_threshold == 0 || max_deviation_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }
        if price_min > 0 && price_max > 0 && price_min > price_max {
            return Err(Error::InvalidAmount);
        }
        env.storage().instance().set(&PRICE_MIN, &price_min);
        env.storage().instance().set(&PRICE_MAX, &price_max);
        env.storage().instance().set(&STALE_THR, &staleness_threshold);
        env.storage().instance().set(&DEV_BPS, &max_deviation_bps);
        Ok(())
    }

    // ── get_oracle_config ─────────────────────────────────────────────────
    /// Return the current oracle validation configuration.
    pub fn get_oracle_config(env: Env) -> Result<OracleConfig, Error> {
        Self::assert_initialized(&env)?;
        Ok(OracleConfig {
            price_min: env.storage().instance().get(&PRICE_MIN).unwrap_or(0),
            price_max: env.storage().instance().get(&PRICE_MAX).unwrap_or(0),
            staleness_threshold: env.storage().instance().get(&STALE_THR).unwrap_or(3600),
            max_deviation_bps: env.storage().instance().get(&DEV_BPS).unwrap_or(2000),
        })
    }

    // ── submit_price ──────────────────────────────────────────────────────
    /// Oracle submits a new price for collateral valuation.
    ///
    /// Validates:
    /// 1. Price is positive.
    /// 2. Price is within configured min/max bounds (if set).
    /// 3. The update timestamp is not older than the staleness threshold.
    /// 4. Price does not deviate more than `max_deviation_bps` from the last accepted price.
    ///
    /// Updates TWAP after all checks pass.
    ///
    /// # Parameters
    /// - `oracle`: Must match the stored oracle address.
    /// - `price`: New price value (must be > 0).
    /// - `price_timestamp`: The timestamp at which the oracle observed this price.
    ///
    /// # Errors
    /// - [`Error::Unauthorized`] if caller is not the stored oracle.
    /// - [`Error::InvalidAmount`] if `price` ≤ 0.
    /// - [`Error::PriceBelowMin`] if `price` < configured minimum.
    /// - [`Error::PriceAboveMax`] if `price` > configured maximum.
    /// - [`Error::PriceStale`] if `price_timestamp` is older than `staleness_threshold` seconds ago.
    /// - [`Error::PriceDeviationExceeded`] if price deviates > `max_deviation_bps` from last price.
    pub fn submit_price(env: Env, oracle: Address, price: i128, price_timestamp: u64) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        if price <= 0 {
            return Err(Error::InvalidAmount);
        }
        oracle.require_auth();

        let stored_oracle: Address = env.storage().instance().get(&ORACLE).unwrap();
        if oracle != stored_oracle {
            return Err(Error::Unauthorized);
        }

        let now = env.ledger().timestamp();

        // ── 1. Staleness check ────────────────────────────────────────────
        let stale_thr: u64 = env.storage().instance().get(&STALE_THR).unwrap_or(3600);
        if price_timestamp < now.saturating_sub(stale_thr) {
            return Err(Error::PriceStale);
        }

        // ── 2. Bounds check ───────────────────────────────────────────────
        let price_min: i128 = env.storage().instance().get(&PRICE_MIN).unwrap_or(0);
        let price_max: i128 = env.storage().instance().get(&PRICE_MAX).unwrap_or(0);
        if price_min > 0 && price < price_min {
            return Err(Error::PriceBelowMin);
        }
        if price_max > 0 && price > price_max {
            return Err(Error::PriceAboveMax);
        }

        // ── 3. Deviation check ────────────────────────────────────────────
        let last_price: i128 = env.storage().instance().get(&LAST_PRICE).unwrap_or(0);
        if last_price > 0 {
            let dev_bps: u32 = env.storage().instance().get(&DEV_BPS).unwrap_or(2000);
            // deviation = |price - last_price| * 10_000 / last_price
            let diff = if price > last_price { price - last_price } else { last_price - price };
            let deviation_bps = diff
                .checked_mul(10_000)
                .unwrap_or(i128::MAX)
                / last_price;
            if deviation_bps > dev_bps as i128 {
                return Err(Error::PriceDeviationExceeded);
            }
        }

        // ── Update TWAP ───────────────────────────────────────────────────
        let window: u64 = env.storage().instance().get(&TWAP_WINDOW).unwrap_or(3600);
        let last_time: u64 = env.storage().instance().get(&LAST_PRICE_TIME).unwrap_or(0);

        let mut twap_sum: i128 = env.storage().instance().get(&TWAP_SUM).unwrap_or(0);
        let mut twap_count: u32 = env.storage().instance().get(&TWAP_COUNT).unwrap_or(0);

        if now.saturating_sub(last_time) >= window {
            twap_sum = price;
            twap_count = 1;
        } else {
            twap_sum = twap_sum.checked_add(price).unwrap_or(i128::MAX);
            twap_count = twap_count.saturating_add(1);
        }

        let new_twap = twap_sum / (twap_count as i128);

        env.storage().instance().set(&LAST_PRICE, &price);
        env.storage().instance().set(&LAST_PRICE_TIME, &now);
        env.storage().instance().set(&TWAP_PRICE, &new_twap);
        env.storage().instance().set(&TWAP_SUM, &twap_sum);
        env.storage().instance().set(&TWAP_COUNT, &twap_count);

        Ok(())
    }

    // ── get_twap_data ─────────────────────────────────────────────────────
    pub fn get_twap_data(env: Env) -> Result<TWAPData, Error> {
        Self::assert_initialized(&env)?;
        let current: i128 = env.storage().instance().get(&LAST_PRICE).unwrap_or(0);
        let twap: i128 = env.storage().instance().get(&TWAP_PRICE).unwrap_or(0);
        let last_update: u64 = env.storage().instance().get(&LAST_PRICE_TIME).unwrap_or(0);
        Ok(TWAPData {
            current_price: current,
            twap_price: twap,
            last_update,
        })
    }

    // ── set_twap_window ───────────────────────────────────────────────────
    pub fn set_twap_window(env: Env, admin: Address, window_seconds: u64) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_admin(&env, &admin)?;
        admin.require_auth();
        
        if window_seconds == 0 {
            return Err(Error::InvalidAmount);
        }
        
        env.storage().instance().set(&TWAP_WINDOW, &window_seconds);
        Ok(())
    }

    // ── internal helpers ──────────────────────────────────────────────────
    fn assert_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&ADMIN) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn assert_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if *caller != admin {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn is_paused_raw(env: &Env) -> bool {
        let paused: bool = env.storage().instance().get(&PAUSED).unwrap_or(false);
        if !paused {
            return false;
        }
        // Check auto-expiry
        let expires_at: u64 = env.storage().instance().get(&PAUSE_EXP).unwrap_or(0);
        let now = env.ledger().timestamp();
        now < expires_at
    }

    fn assert_not_paused(env: &Env) -> Result<(), Error> {
        if Self::is_paused_raw(env) {
            return Err(Error::ContractPaused);
        }
        Ok(())
    }

    fn next_id(env: &Env, key: DataKey) -> Result<u64, Error> {
        let id: u64 = env.storage().instance().get(&key).unwrap_or(0u64);
        let next = id.checked_add(1).ok_or(Error::ArithmeticOverflow)?;
        env.storage().instance().set(&key, &next);
        Ok(next)
    }

    /// Pure arithmetic health-factor computation.
    ///
    /// Accepts `liq_thr` as a parameter so callers can read `LIQ_THR` from storage
    /// once and reuse it, rather than paying for an instance-storage read on every
    /// invocation.  No storage access occurs inside this function.
    ///
    /// Formula (unchanged): `(collateral * liq_thr) / (outstanding * 10_000) * 10_000`
    fn compute_health_factor_with_thr(loan: &LoanRecord, liq_thr: u32) -> Result<i128, Error> {
        if loan.outstanding == 0 {
            return Ok(i128::MAX);
        }
        let numerator = loan
            .total_collateral_value
            .checked_mul(liq_thr as i128)
            .ok_or(Error::InvalidAmount)?;
        let denominator = loan.outstanding.checked_mul(10_000).ok_or(Error::InvalidAmount)?;
        Ok(numerator / denominator * 10_000)
    }

    fn calculate_utilization(env: &Env) -> Result<u32, Error> {
        let total_borrowed: i128 = env.storage().instance().get(&TOTAL_BORROWED).unwrap_or(0);
        let total_liquidity: i128 = env.storage().instance().get(&TOTAL_LIQUIDITY).unwrap_or(1);
        
        if total_liquidity <= 0 {
            return Ok(0);
        }
        
        // utilization = (total_borrowed / total_liquidity) * 10_000
        let utilization = (total_borrowed * 10_000 / total_liquidity) as u32;
        Ok(utilization.min(10_000))
    }

    fn calculate_interest_rate(env: &Env, utilization_bps: u32) -> Result<u32, Error> {
        let base: u32 = env.storage().instance().get(&BASE_RATE).unwrap_or(200);
        let slope1: u32 = env.storage().instance().get(&SLOPE1).unwrap_or(500);
        let slope2: u32 = env.storage().instance().get(&SLOPE2).unwrap_or(4500);
        let kink: u32 = env.storage().instance().get(&KINK).unwrap_or(8000);
        
        // Jump rate model:
        // if utilization <= kink:
        //   rate = base + (slope1 * utilization / 10_000)
        // else:
        //   rate = base + (slope1 * kink / 10_000) + (slope2 * (utilization - kink) / 10_000)
        
        let rate = if utilization_bps <= kink {
            let slope1_component = (slope1 as u64)
                .checked_mul(utilization_bps as u64)
                .unwrap_or(u64::MAX)
                / 10_000;
            base.checked_add(slope1_component as u32).unwrap_or(u32::MAX)
        } else {
            let slope1_component = (slope1 as u64)
                .checked_mul(kink as u64)
                .unwrap_or(u64::MAX)
                / 10_000;
            let excess_util = utilization_bps.saturating_sub(kink);
            let slope2_component = (slope2 as u64)
                .checked_mul(excess_util as u64)
                .unwrap_or(u64::MAX)
                / 10_000;
            base
                .checked_add(slope1_component as u32)
                .and_then(|r| r.checked_add(slope2_component as u32))
                .unwrap_or(u32::MAX)
        };
        
        Ok(rate)
    }
}

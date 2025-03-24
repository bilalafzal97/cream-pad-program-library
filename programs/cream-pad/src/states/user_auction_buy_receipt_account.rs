use crate::states::{AuctionRoundStatus, AuctionStatus, DecayModelType, ProgramStatus};
use anchor_lang::prelude::*;

pub const USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: &str = "UABRAP";

#[account]
pub struct UserAuctionBuyReceiptAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub buy_amount: u64,

    pub payment: u64,

    pub round: u16,

    pub index: u64,
}

impl UserAuctionBuyReceiptAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // buy_amount

            + 8 // payment

            + 2 // round

            + 8 // index
    }
}

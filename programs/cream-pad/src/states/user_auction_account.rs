use crate::states::UserAuctionStatus;
use anchor_lang::prelude::*;

pub const USER_AUCTION_ACCOUNT_PREFIX: &str = "UAAP";

#[account]
pub struct UserAuctionAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub user: Pubkey,

    pub total_buy_count: u64,

    pub total_buy_amount: u64,

    pub total_payment: u64,

    pub status: UserAuctionStatus,
}

impl UserAuctionAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 32 // user

            + 8 // total_buy_count

            + 8 // total_buy_amount

            + 8 // total_payment

            + 1 // status
    }
}

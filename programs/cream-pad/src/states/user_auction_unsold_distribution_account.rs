use anchor_lang::prelude::*;

pub const USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: &str = "UAUDAP";

#[account]
pub struct UserAuctionUnsoldDistributionAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub amount: u64,
}

impl UserAuctionUnsoldDistributionAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // amount
    }
}

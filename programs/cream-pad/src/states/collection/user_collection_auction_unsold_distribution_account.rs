use anchor_lang::prelude::*;

pub const USER_COLLECTION_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: &str = "UCAUDAP";

#[account]
pub struct UserCollectionAuctionUnsoldDistributionAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub amount: u64,

    pub amount_filled: u64,
}

impl UserCollectionAuctionUnsoldDistributionAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // amount

            + 8 // amount_filled
    }
}

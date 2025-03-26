use anchor_lang::prelude::*;

pub const USER_AUCTION_ROUND_ACCOUNT_PREFIX: &str = "UARAP";

#[account]
pub struct UserAuctionRoundAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub total_buy_count: u64,

    pub total_buy_amount: u64,

    pub total_payment: u64,

    pub round: u16,
}

impl UserAuctionRoundAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // total_buy_count

            + 8 // total_buy_amount

            + 8 // total_payment

            + 2 // round
    }
}

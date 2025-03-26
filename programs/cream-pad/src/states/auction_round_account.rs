use crate::states::AuctionRoundStatus;
use anchor_lang::prelude::*;

pub const AUCTION_ROUND_ACCOUNT_PREFIX: &str = "ARAP";

#[account]
pub struct AuctionRoundAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub round_start_at: i64,

    pub round_end_at: i64,

    pub total_supply_sold: u64,

    pub total_user_buy_count: u64,

    pub total_user_count: u64,

    pub boost: u64,

    pub price: u64,

    pub status: AuctionRoundStatus,

    pub total_payment: u64,

    pub total_fee: u64,

    pub round: u16,

    pub round_ended_at: i64,
}

impl AuctionRoundAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // round_start_at

            + 8 // round_end_at

            + 8 // total_supply_sold

            + 8 // total_user_buy_count

            + 8 // total_user_count

            + 8 // boost

            + 8 // price

            + 1 // status

            + 8 // total_payment

            + 8 // total_fee

            + 2 // round

            + 8 // round_ended_at
    }
}

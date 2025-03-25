use crate::states::{AuctionStatus, DecayModelType, ProgramStatus};
use anchor_lang::prelude::*;

pub const AUCTION_ACCOUNT_PREFIX: &str = "AAP";
pub const AUCTION_VAULT_PREFIX: &str = "AAP";

#[account]
pub struct AuctionAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub creator: Pubkey,

    pub mint: Pubkey,

    pub payment_mint: Pubkey,

    pub payment_receiver: Pubkey,

    pub status: AuctionStatus,

    pub p0: u64,

    pub ptmax: u64,

    pub tmax: u16,

    pub omega: u64,

    pub alpha: u64,

    // TODO: test this with u16 same as tmax
    pub time_shift_max: u64,

    pub current_price: u64,

    pub current_round: u16,

    pub boost_history: Vec<u64>,

    pub decay_model: DecayModelType,

    pub total_supply: u64,

    pub total_supply_sold: u64,

    pub total_user_buy_count: u64,

    pub total_user_count: u64,

    pub total_unsold_supply_locked: u64,

    pub unsold_supply_locked_at: i64,

    pub unsold_supply_can_unlock_at: i64,

    pub unsold_supply_unlocked_at: i64,

    pub total_unsold_supply_distribution: u64,

    pub total_unsold_supply_distribution_claimed: u64,

    pub total_unsold_supply_distribution_claimed_count: u64,

    pub total_payment: u64,

    pub total_fee: u64,
}

impl AuctionAccount {
    pub fn space(limit: u16) -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 32 // creator

            + 32 // mint

            + 32 // payment_mint

            + 32 // payment_receiver

            + 1 // status

            + 8 // p0

            + 8 // ptmax

            + 2 // tmax

            + 8 // omega

            + 8 // alpha

            + 8 // time_shift_max

            + 8 // current_price

            + 2 // current_round

            + (4 + (limit * 8) as usize) // boost_history

            + 1 // decay_model

            + 8 // total_supply

            + 8 // total_supply_sold

             + 8 // total_user_buy_count

             + 8 // total_user_count

             + 8 // total_unsold_supply_locked

             + 8 // unsold_supply_locked_at

             + 8 // unsold_supply_can_unlock_at

             + 8 // unsold_supply_unlocked_at

             + 8 // total_unsold_supply_distribution

             + 8 // total_unsold_supply_distribution_claimed

             + 8 // total_unsold_supply_distribution_claimed_count

             + 8 // total_payment

             + 8 // total_fee
    }
}

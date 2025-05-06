use crate::states::{AuctionStatus, DecayModelType};
use anchor_lang::prelude::*;
use crate::states::collection::AssetCreator;

pub const COLLECTION_AUCTION_ACCOUNT_PREFIX: &str = "CAAP";

#[account]
pub struct CollectionAuctionAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub creator: Pubkey,

    pub collection_mint: Pubkey,

    pub collection_update_authority: Pubkey,

    pub payment_mint: Pubkey,

    pub payment_receiver: Pubkey,

    pub status: AuctionStatus,

    pub p0: u64,

    pub ptmax: u64,

    pub tmax: u16,

    pub omega: u64,

    pub alpha: u64,

    pub time_shift_max: u64,

    pub current_price: u64,

    pub current_round: u16,

    pub boost_history: Vec<f64>,

    pub decay_model: DecayModelType,

    pub seller_fee_basis_points: u16,

    pub asset_creators: Vec<AssetCreator>,

    pub total_supply: u64,

    pub total_supply_sold: u64,

    pub total_supply_sold_filled: u64,

    pub total_user_buy_count: u64,

    pub total_user_count: u64,

    pub starting_index: u64,

    pub ending_index: u64,

    pub current_index: u64,

    pub total_unsold_supply_to_treasury: u64,

    pub total_unsold_supply_to_treasury_filled: u64,

    pub total_unsold_supply_distribution: u64,

    pub total_unsold_supply_distribution_claimed: u64,

    pub total_unsold_supply_distribution_claimed_count: u64,

    pub total_unsold_supply_distribution_claimed_filled: u64,

    pub total_payment: u64,

    pub total_fee: u64,

    pub total_minting_fee: u64,

    pub asset_name: String,

    pub asset_symbol: String,

    pub asset_url: String,

    pub asset_url_suffix: String,

    pub have_collection_update_authority: bool,
}

impl CollectionAuctionAccount {
    pub fn space(limit: u16, creator_len: usize) -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 32 // creator

            + 32 // collection_mint

            + 32 // collection_update_authority

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

            + 2 // seller_fee_basis_points

            + (4 + (AssetCreator::space() * creator_len)) // asset_creators

            + 8 // total_supply

            + 8 // total_supply_sold

            + 8 // total_supply_sold_filled

            + 8 // total_user_buy_count

            + 8 // total_user_count

            + 8 // starting_index

            + 8 // ending_index

            + 8 // current_index

            + 8 // total_unsold_supply_to_treasury

            + 8 // total_unsold_supply_to_treasury_filled

            + 8 // total_unsold_supply_distribution

            + 8 // total_unsold_supply_distribution_claimed

            + 8 // total_unsold_supply_distribution_claimed_count

            + 8 // total_unsold_supply_distribution_claimed_filled

            + 8 // total_payment

            + 8 // total_fee

            + 8 // total_minting_fee

            + 20 // asset_name

            + 20 // asset_symbol

            + 100 // asset_uri

            + 10 // asset_uri_suffix

            + 1 // have_collection_update_authority
    }
}

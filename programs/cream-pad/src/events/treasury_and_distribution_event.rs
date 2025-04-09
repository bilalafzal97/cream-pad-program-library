use anchor_lang::prelude::*;

#[event]
pub struct TreasuryAndDistributionEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub treasury_supply: u64,

    pub distribution_supply: u64,
}
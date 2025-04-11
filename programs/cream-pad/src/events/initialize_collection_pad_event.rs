use anchor_lang::prelude::*;

#[event]
pub struct InitializeCollectionPadEvent {
    pub timestamp: i64,

    pub creator: Pubkey,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub payment_receiver: Pubkey,

    pub round_duration: i64,

    pub p0: u64,

    pub ptmax: u64,

    pub tmax: u16,

    pub omega: u64,

    pub alpha: u64,

    pub time_shift_max: u64,

    pub have_buy_limit: bool,

    pub buy_limit: u64,

    pub starting_index: u64,

    pub ending_index: u64,
}

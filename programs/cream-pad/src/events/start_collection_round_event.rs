use anchor_lang::prelude::*;

#[event]
pub struct StartCollectionRoundEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub previous_round_index: String,

    pub next_round_index: String,

    pub next_round_duration: i64,

    pub current_price: u64,

    pub next_have_buy_limit: bool,

    pub next_buy_limit: u64,
}
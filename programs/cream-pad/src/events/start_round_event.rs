use anchor_lang::prelude::*;

#[event]
pub struct StartRoundEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub previous_round_index: String,

    pub next_round_index: String,

    pub next_round_duration: i64,

    pub current_price: u64,
}
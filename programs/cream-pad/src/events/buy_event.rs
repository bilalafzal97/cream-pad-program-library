use anchor_lang::prelude::*;

#[event]
pub struct BuyEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub user: Pubkey,

    pub amount: u64,

    pub fee: u64,

    pub price: u64,

    pub current_round: String,

    pub user_buy_index: String,

    pub total_price: u64,

    pub is_ended_and_sold_out: bool,
}
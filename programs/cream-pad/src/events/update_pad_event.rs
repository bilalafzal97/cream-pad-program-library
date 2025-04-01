use anchor_lang::prelude::*;

#[event]
pub struct UpdatePadEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub payment_receiver: Pubkey,
}
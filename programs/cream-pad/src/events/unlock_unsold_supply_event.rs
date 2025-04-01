use anchor_lang::prelude::*;

#[event]
pub struct UnlockUnsoldSupplyEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String
}
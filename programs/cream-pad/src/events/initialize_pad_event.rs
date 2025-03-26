use anchor_lang::prelude::*;

#[event]
pub struct InitializePadEvent {
    pub timestamp: i64,

    pub creator: Pubkey,

    pub mint: Pubkey,

    pub pad_name: String,
}

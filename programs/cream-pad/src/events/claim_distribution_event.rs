use anchor_lang::prelude::*;

#[event]
pub struct ClaimDistributionEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub user: Pubkey,

    pub amount: u64,
}
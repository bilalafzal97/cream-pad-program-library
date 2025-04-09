use anchor_lang::prelude::*;

#[event]
pub struct CollectionClaimDistributionEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub user: Pubkey,

    pub amount: u64,
}
use anchor_lang::prelude::*;

#[event]
pub struct TakeCollectionUpdateAuthorityEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String
}
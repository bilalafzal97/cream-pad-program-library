use anchor_lang::prelude::*;

#[event]
pub struct GiveCollectionUpdateAuthorityEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub new_collection_update_authority: Pubkey,
}
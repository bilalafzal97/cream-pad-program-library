use anchor_lang::prelude::*;

#[event]
pub struct UpdateCollectionPadEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub payment_receiver: Pubkey,
}
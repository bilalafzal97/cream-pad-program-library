use anchor_lang::prelude::*;

#[event]
pub struct FillBoughtCollectionAssetEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub asset_uuid: String,

    pub asset_index: u64,

    pub buy_index: u64,

    pub user: Pubkey,
}
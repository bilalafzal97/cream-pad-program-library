use anchor_lang::prelude::*;

#[event]
pub struct EndCollectionRoundEvent {
    pub timestamp: i64,

    pub collection_mint: Pubkey,

    pub pad_name: String,

    pub round_index: String,

    pub boost: f64,
}
use anchor_lang::prelude::*;

#[event]
pub struct EndRoundEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub round_index: String,

    pub boost: u64,
}
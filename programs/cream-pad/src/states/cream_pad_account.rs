use anchor_lang::prelude::*;
use crate::states::ProgramStatus;

pub const CREAM_PAD_ACCOUNT_PREFIX: &str = "CPAP";

#[account]
pub struct CreamPadAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub signing_authority: Pubkey,

    pub  back_authority: Pubkey,

    pub is_back_authority_required: bool,

    pub program_status: ProgramStatus,

    pub is_fee_required: bool,

    pub fee_base_point: u16,

    pub fee_receiver: Pubkey,

    pub round_limit: u16,

    pub distribution_base_point: u16,

    pub lock_base_point: u16,

    pub lock_duration: i64,
}

impl CreamPadAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp
            + 32 // signing_authority
            + 32 // back_authority
            + 1 // is_back_authority_required
            + 1 // program_status
            + 1 // is_fee_required
            + 2 // fee_base_point
            + 32 // fee_receiver
            + 2 // round_limit
            + 2 // distribution_base_point
            + 2 // lock_base_point
            + 8 // lock_duration
    }
}

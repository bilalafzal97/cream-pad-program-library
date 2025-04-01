use anchor_lang::prelude::*;

#[event]
pub struct LockAndDistributionEvent {
    pub timestamp: i64,

    pub mint: Pubkey,

    pub pad_name: String,

    pub total_unsold_supply_locked: u64,

    pub unsold_supply_can_unlock_at: i64,

    pub total_unsold_supply_distribution: u64,
}
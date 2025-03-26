use anchor_lang::prelude::*;

pub mod meta;

use instructions::creator::*;
use instructions::manager::*;
use instructions::user::*;

mod error;

mod events;
mod instructions;
mod states;

mod utils;

declare_id!("5sqESwK18j9eH8wk58bZocg2eytvQgJvtJgBq3f1MXEs");

#[program]
pub mod cream_pad {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeInputAccounts>,
        params: InitializeInputParams,
    ) -> Result<()> {
        handle_initialize(ctx, &params)
    }

    pub fn update_config(
        ctx: Context<UpdateConfigInputAccounts>,
        params: UpdateConfigInputParams,
    ) -> Result<()> {
        handle_update_config(ctx, &params)
    }

    pub fn initialize_pad(
        ctx: Context<InitializePadInputAccounts>,
        params: InitializePadInputParams,
    ) -> Result<()> {
        handle_initialize_pad(ctx, &params)
    }

    pub fn update_pad<'info>(
        ctx: Context<'_, '_, 'info, 'info, UpdatePadInputAccounts<'info>>,
        params: UpdatePadInputParams,
    ) -> Result<()> {
        handle_update_pad(ctx, &params)
    }

    pub fn end_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, EndRoundInputAccounts<'info>>,
        params: EndRoundInputParams,
    ) -> Result<()> {
        handle_end_round(ctx, &params)
    }

    pub fn start_next_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, StartNextRoundInputAccounts<'info>>,
        params: StartNextRoundInputParams,
    ) -> Result<()> {
        handle_start_next_round(ctx, &params)
    }

    pub fn buy<'info>(
        ctx: Context<'_, '_, 'info, 'info, BuyInputAccounts<'info>>,
        params: BuyParams,
    ) -> Result<()> {
        handle_buy(ctx, &params)
    }

    pub fn lock_and_distribute<'info>(
        ctx: Context<'_, '_, 'info, 'info, LockAndDistributeInputAccounts<'info>>,
        params: LockAndDistributeInputParams,
    ) -> Result<()> {
        handle_lock_and_distribute(ctx, &params)
    }

    pub fn unlock_unsold_supply<'info>(
        ctx: Context<'_, '_, 'info, 'info, UnlockUnsoldSupplyInputAccounts<'info>>,
        params: UnlockUnsoldSupplyInputParams,
    ) -> Result<()> {
        handle_unlock_unsold_supply(ctx, &params)
    }

    pub fn claim_distribution<'info>(
        ctx: Context<'_, '_, 'info, 'info, ClaimDistributionInputAccounts<'info>>,
        params: ClaimDistributionParams,
    ) -> Result<()> {
        handle_claim_distribution(ctx, &params)
    }
}

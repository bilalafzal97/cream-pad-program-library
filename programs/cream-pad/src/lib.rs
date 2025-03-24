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

declare_id!("FrpyyxeooQ4ZvXNbuT1pfgh3imUEguGacM5zsMkZHt5s");

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
}

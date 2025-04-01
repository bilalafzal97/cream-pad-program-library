use anchor_lang::prelude::*;

use crate::states::{CreamPadAccount, ProgramStatus, CREAM_PAD_ACCOUNT_PREFIX};
use crate::utils::{
    check_distribution_and_lock_base_point, check_fee_base_point, check_value_is_zero,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeInputParams {
    pub back_authority: Pubkey,

    pub is_back_authority_required: bool,

    pub is_fee_required: bool,

    pub fee_base_point: u16,

    pub fee_receiver: Pubkey,

    pub round_limit: u16,

    pub distribution_base_point: u16,

    pub lock_base_point: u16,

    pub lock_duration: i64,
}

#[derive(Accounts)]
#[instruction(params: InitializeInputParams)]
pub struct InitializeInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub signing_authority: Signer<'info>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = CreamPadAccount::space(),
        seeds = [
        CREAM_PAD_ACCOUNT_PREFIX.as_ref(),
        ],
        bump,
    )]
    pub cream_pad_config: Box<Account<'info, CreamPadAccount>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_initialize(
    ctx: Context<InitializeInputAccounts>,
    params: &InitializeInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    // Checks
    check_value_is_zero(params.fee_base_point as usize)?;
    check_value_is_zero(params.round_limit as usize)?;
    check_value_is_zero(params.distribution_base_point as usize)?;
    check_value_is_zero(params.lock_base_point as usize)?;
    check_value_is_zero(params.lock_duration as usize)?;
    check_fee_base_point(params.fee_base_point)?;
    check_distribution_and_lock_base_point(
        params
            .distribution_base_point
            .checked_add(params.lock_base_point)
            .unwrap(),
    )?;

    // Set Values
    let cream_pad_config: &mut Box<Account<CreamPadAccount>> = &mut ctx.accounts.cream_pad_config;
    cream_pad_config.last_block_timestamp = timestamp;
    cream_pad_config.signing_authority = ctx.accounts.signing_authority.key();
    cream_pad_config.back_authority = params.back_authority;
    cream_pad_config.is_back_authority_required = params.is_back_authority_required;
    cream_pad_config.program_status = ProgramStatus::Normal;
    cream_pad_config.is_fee_required = params.is_fee_required;
    cream_pad_config.fee_receiver = params.fee_receiver;
    cream_pad_config.fee_base_point = params.fee_base_point;
    cream_pad_config.round_limit = params.round_limit;
    cream_pad_config.distribution_base_point = params.distribution_base_point;
    cream_pad_config.lock_base_point = params.lock_base_point;
    cream_pad_config.lock_duration = params.lock_duration;

    Ok(())
}

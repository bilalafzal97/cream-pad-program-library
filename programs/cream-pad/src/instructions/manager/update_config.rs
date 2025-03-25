use anchor_lang::prelude::*;

use crate::states::{CreamPadAccount, ProgramStatus, CREAM_PAD_ACCOUNT_PREFIX};
use crate::utils::{
    check_distribution_and_lock_base_point, check_fee_base_point, check_signing_authority,
    check_value_is_zero,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateConfigInputParams {
    pub back_authority: Pubkey,

    pub is_back_authority_required: bool,

    pub is_fee_required: bool,

    pub fee_base_point: u16,

    pub fee_receiver: Pubkey,

    pub round_limit: u16,

    pub program_status: ProgramStatus,

    pub distribution_base_point: u16,

    pub lock_base_point: u16,

    pub lock_duration: i64,

    // Bump
    pub cream_pad_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: UpdateConfigInputParams)]
pub struct UpdateConfigInputAccounts<'info> {
    pub signing_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
        CREAM_PAD_ACCOUNT_PREFIX.as_ref(),
        ],
        bump = params.cream_pad_config_bump,
    )]
    pub cream_pad_config: Box<Account<'info, CreamPadAccount>>,
}

pub fn handle_update_config(
    ctx: Context<UpdateConfigInputAccounts>,
    params: &UpdateConfigInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config: &Box<Account<CreamPadAccount>> = &ctx.accounts.cream_pad_config;

    // Checks
    check_signing_authority(
        cream_pad_config.signing_authority,
        ctx.accounts.signing_authority.key(),
    )?;

    check_value_is_zero(params.fee_base_point as usize)?;
    check_value_is_zero(params.round_limit as usize)?;
    check_value_is_zero(params.lock_base_point as usize)?;
    check_value_is_zero(params.lock_duration as usize)?;
    check_fee_base_point(params.fee_base_point)?;
    check_distribution_and_lock_base_point(
        params
            .distribution_base_point
            .saturating_add(params.lock_base_point),
    )?;

    // Set Values
    let cream_pad_config: &mut Box<Account<CreamPadAccount>> = &mut ctx.accounts.cream_pad_config;
    cream_pad_config.last_block_timestamp = timestamp;
    cream_pad_config.back_authority = params.back_authority;
    cream_pad_config.is_back_authority_required = params.is_back_authority_required;
    cream_pad_config.program_status = params.program_status.clone();
    cream_pad_config.is_fee_required = params.is_fee_required;
    cream_pad_config.fee_receiver = params.fee_receiver;
    cream_pad_config.fee_base_point = params.fee_base_point;
    cream_pad_config.round_limit = params.round_limit;
    cream_pad_config.distribution_base_point = params.distribution_base_point;
    cream_pad_config.lock_base_point = params.lock_base_point;
    cream_pad_config.lock_duration = params.lock_duration;

    Ok(())
}

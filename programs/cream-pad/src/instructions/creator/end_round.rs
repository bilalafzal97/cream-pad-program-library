use crate::states::{
    AuctionAccount, AuctionRoundAccount, AuctionRoundStatus, AuctionStatus, CreamPadAccount, AUCTION_ACCOUNT_PREFIX, AUCTION_ROUND_ACCOUNT_PREFIX,
};
use crate::utils::{
    calculate_boost, check_back_authority, check_current_round,
    check_is_auction_ended_or_sold_out, check_is_auction_round_ended,
    check_is_auction_round_still_have_time, check_is_program_working, check_program_id,
    check_round_ender, check_signer_exist, try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndRoundInputParams {
    pub pad_name: String,

    pub round_index: String,

    // Bumps
    pub auction_config_bump: u8,

    pub auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: EndRoundInputParams)]
pub struct EndRoundInputAccounts<'info> {
    pub ender: Signer<'info>,

    #[account(
        mut,
        seeds = [
        AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        token_mint_account.key().as_ref(),
        ],
        bump = params.auction_config_bump,
    )]
    pub auction_config: Box<Account<'info, AuctionAccount>>,

    #[account(
        mut,
        seeds = [
        AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        params.round_index.as_ref(),
        ],
        bump = params.auction_round_config_bump,
    )]
    pub auction_round_config: Box<Account<'info, AuctionRoundAccount>>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_end_round<'info>(
    ctx: Context<'_, '_, 'info, 'info, EndRoundInputAccounts<'info>>,
    params: &EndRoundInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let auction_config: &Box<Account<AuctionAccount>> = &ctx.accounts.auction_config;
    let auction_round_config: &Box<Account<AuctionRoundAccount>> =
        &ctx.accounts.auction_round_config;

    // Checks

    check_program_id(
        cream_pad_config_account_info.owner.key(),
        ctx.program_id.key(),
    )?;

    check_is_program_working(cream_pad_config.program_status.clone())?;

    if cream_pad_config.is_back_authority_required {
        let back_authority_account_info =
            try_get_remaining_account_info(ctx.remaining_accounts, 1)?;

        check_back_authority(
            cream_pad_config.back_authority,
            back_authority_account_info.key(),
        )?;

        let instruction_index =
            load_current_index_checked(&ctx.accounts.instructions_sysvar.to_account_info())?
                as usize;
        let instruction: Instruction =
            get_instruction_relative(instruction_index as i64, &ctx.accounts.instructions_sysvar)?;

        check_signer_exist(instruction, back_authority_account_info.key())?;
    };

    check_round_ender(
        auction_config.creator,
        cream_pad_config.back_authority,
        ctx.accounts.ender.key(),
    )?;

    let current_round_index: u16 = params.round_index.clone().parse().unwrap();

    check_current_round(auction_config.current_round, current_round_index)?;

    check_is_auction_round_ended(auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(auction_config.status.clone())?;

    check_is_auction_round_still_have_time(auction_round_config.round_end_at, timestamp)?;

    let boost: u64 = calculate_boost(
        auction_round_config.total_supply_sold,
        auction_config
            .total_supply
            .checked_div(auction_config.tmax as u64)
            .unwrap(),
        auction_config.omega,
        auction_config.alpha,
        auction_config.time_shift_max,
    );

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;

    if current_round_index == auction_config.tmax {
        auction_config.status = AuctionStatus::Ended;
    };

    auction_config.boost_history.push(boost);

    let auction_round_config: &mut Box<Account<AuctionRoundAccount>> =
        &mut ctx.accounts.auction_round_config;
    auction_round_config.last_block_timestamp = timestamp;
    auction_round_config.status = AuctionRoundStatus::Ended;
    auction_round_config.round_ended_at = timestamp;
    auction_round_config.boost = boost;

    Ok(())
}

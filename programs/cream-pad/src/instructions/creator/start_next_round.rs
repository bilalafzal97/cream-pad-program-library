use crate::states::{
    AuctionAccount, AuctionRoundAccount, AuctionRoundStatus, AuctionStatus, CreamPadAccount,
    DecayModelType, ProgramStatus, AUCTION_ACCOUNT_PREFIX, AUCTION_ROUND_ACCOUNT_PREFIX,
    CREAM_PAD_ACCOUNT_PREFIX,
};
use crate::utils::{
    calculate_boost, calculate_price, check_back_authority, check_current_round,
    check_fee_base_point, check_is_auction_ended_or_sold_out, check_is_auction_round_ended,
    check_is_auction_round_still_have_time, check_is_previous_auction_round_ended,
    check_is_program_working, check_next_round, check_previous_round, check_program_id,
    check_round_ender, check_round_limit, check_round_starter, check_signer_exist,
    check_signing_authority, check_value_is_zero, try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::instructions::creator::{UpdatePadInputAccounts, UpdatePadInputParams};
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartNextRoundInputParams {
    pub pad_name: String,

    pub previous_round_index: String,

    pub next_round_index: String,

    pub next_round_duration: i64,

    // Bumps
    pub auction_config_bump: u8,

    pub previous_auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: StartNextRoundInputParams)]
pub struct StartNextRoundInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub starter: Signer<'info>,

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
        seeds = [
        AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        params.previous_round_index.as_ref(),
        ],
        bump = params.previous_auction_round_config_bump,
    )]
    pub previous_auction_round_config: Box<Account<'info, AuctionRoundAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = AuctionRoundAccount::space(),
        seeds = [
        AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        params.next_round_index.as_ref(),
        ],
        bump,
    )]
    pub next_auction_round_config: Box<Account<'info, AuctionRoundAccount>>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_start_next_round<'info>(
    ctx: Context<'_, '_, 'info, 'info, StartNextRoundInputAccounts<'info>>,
    params: &StartNextRoundInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let auction_config: &Box<Account<AuctionAccount>> = &ctx.accounts.auction_config;
    let previous_auction_round_config: &Box<Account<AuctionRoundAccount>> =
        &ctx.accounts.previous_auction_round_config;

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

    check_round_starter(
        auction_config.creator,
        cream_pad_config.back_authority,
        ctx.accounts.starter.key(),
    )?;

    let previous_round_index: u16 = params.previous_round_index.clone().parse().unwrap();

    let next_round_index: u16 = params.next_round_index.clone().parse().unwrap();

    check_previous_round(auction_config.current_round, previous_round_index)?;

    check_next_round(
        auction_config.current_round.saturating_add(1),
        next_round_index,
    )?;

    check_is_previous_auction_round_ended(previous_auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(auction_config.status.clone())?;

    let current_price = calculate_price(
        auction_config.p0,
        auction_config.ptmax,
        auction_config.tmax as u64,
        auction_config.current_round as usize,
        &auction_config.boost_history,
        auction_config.decay_model.clone(),
        auction_config.time_shift_max,
    );

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;
    auction_config.current_round = auction_config.current_round.saturating_add(1);
    auction_config.current_price = current_price;

    let next_auction_round_config: &mut Box<Account<AuctionRoundAccount>> =
        &mut ctx.accounts.next_auction_round_config;
    next_auction_round_config.last_block_timestamp = timestamp;
    next_auction_round_config.round_start_at = timestamp;
    next_auction_round_config.round_end_at =
        timestamp.checked_add(params.next_round_duration).unwrap();
    next_auction_round_config.round = auction_config.current_round;
    next_auction_round_config.price = auction_config.current_price;
    next_auction_round_config.boost = 0;

    Ok(())
}

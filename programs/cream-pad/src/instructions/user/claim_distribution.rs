use crate::instructions::manager::{InitializeInputAccounts, InitializeInputParams};
use crate::states::{
    AuctionAccount, AuctionRoundAccount, AuctionRoundStatus, AuctionStatus, CreamPadAccount,
    DecayModelType, ProgramStatus, UserAuctionAccount, UserAuctionBuyReceiptAccount,
    UserAuctionRoundAccount, UserAuctionStatus, UserAuctionUnsoldDistributionAccount,
    AUCTION_ACCOUNT_PREFIX, AUCTION_ROUND_ACCOUNT_PREFIX, CREAM_PAD_ACCOUNT_PREFIX,
    USER_AUCTION_ACCOUNT_PREFIX, USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX,
    USER_AUCTION_ROUND_ACCOUNT_PREFIX, USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX,
};
use crate::utils::{
    adjust_amount, calculate_boost, calculate_total_price, check_back_authority, check_buy_index,
    check_current_round, check_fee_base_point, check_is_auction_ended_or_sold_out,
    check_is_auction_is_distribution, check_is_auction_round_ended,
    check_is_auction_round_still_have_time, check_is_auction_round_time_run_out,
    check_is_program_working, check_payment_fee_receiver, check_payment_mint_account,
    check_payment_receiver, check_remaining_supply, check_round_ender, check_round_limit,
    check_signer_exist, check_signing_authority, check_token_account_authority,
    check_value_is_zero, try_get_remaining_account_info, BASE_POINT,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::associated_token::{
    create as associated_token_create, AssociatedToken, Create as AssociatedTokenCreate,
};
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::instructions::creator::{UpdatePadInputAccounts, UpdatePadInputParams};
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ClaimDistributionParams {
    pub pad_name: String,

    // Bumps
    pub auction_config_bump: u8,

    pub user_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: ClaimDistributionParams)]
pub struct ClaimDistributionInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub user: Signer<'info>,

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
        USER_AUCTION_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        user.key().as_ref(),
        ],
        bump = params.user_auction_config_bump,
    )]
    pub user_auction_config: Box<Account<'info, UserAuctionAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = UserAuctionUnsoldDistributionAccount::space(),
        seeds = [
        USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX.as_ref(),
        user_auction_config.key().as_ref(),
        ],
        bump,
    )]
    pub user_auction_unsold_distribution_config:
        Box<Account<'info, UserAuctionUnsoldDistributionAccount>>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = token_mint_account,
        associated_token::authority = auction_config,
        associated_token::token_program = token_program,
    )]
    pub auction_config_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint_account,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_claim_distribution<'info>(
    ctx: Context<'_, '_, 'info, 'info, ClaimDistributionInputAccounts<'info>>,
    params: &ClaimDistributionParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let auction_config: &Box<Account<AuctionAccount>> = &ctx.accounts.auction_config;

    // Checks

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

    check_is_auction_is_distribution(auction_config.status.clone())?;

    let user_auction_config: &Box<Account<UserAuctionAccount>> = &ctx.accounts.user_auction_config;

    let user_share_base_point: u64 = user_auction_config
        .total_buy_amount
        .checked_mul(BASE_POINT as u64)
        .unwrap()
        .checked_div(auction_config.total_supply_sold)
        .unwrap();

    let user_share_amount = auction_config
        .total_unsold_supply_distribution
        .checked_mul(user_share_base_point)
        .unwrap()
        .checked_div(BASE_POINT as u64)
        .unwrap();

    check_remaining_supply(
        auction_config
            .total_unsold_supply_distribution_claimed
            .checked_add(user_share_amount)
            .unwrap(),
        auction_config.total_unsold_supply_distribution,
    )?;

    let adjusted_user_share_amount = adjust_amount(
        user_share_amount,
        9,
        ctx.accounts.token_mint_account.decimals,
    );

    // Transfers

    // transfer auction config to user
    let auction_config_bump_bytes = params.auction_config_bump.to_le_bytes();
    let token_mint_account_key = ctx.accounts.token_mint_account.key();

    let signer_seeds: &[&[&[u8]]] = &[&[
        AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        token_mint_account_key.as_ref(),
        auction_config_bump_bytes.as_ref(),
    ]];

    let transfer_token_to_user_cpi_accounts = TransferChecked {
        from: ctx.accounts.auction_config_token_account.to_account_info(),
        mint: ctx.accounts.token_mint_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.auction_config.to_account_info(),
    };

    let transfer_token_to_user_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        transfer_token_to_user_cpi_accounts,
        signer_seeds,
    );

    transfer_checked(
        transfer_token_to_user_cpi_ctx,
        adjusted_user_share_amount,
        ctx.accounts.token_mint_account.decimals,
    )?;

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;

    auction_config.total_unsold_supply_distribution_claimed = auction_config
        .total_unsold_supply_distribution_claimed
        .checked_add(user_share_amount)
        .unwrap();

    auction_config.total_unsold_supply_distribution_claimed_count = auction_config
        .total_unsold_supply_distribution_claimed_count
        .checked_add(1)
        .unwrap();

    let user_auction_unsold_distribution_config: &mut Box<
        Account<UserAuctionUnsoldDistributionAccount>,
    > = &mut ctx.accounts.user_auction_unsold_distribution_config;
    user_auction_unsold_distribution_config.last_block_timestamp = timestamp;
    user_auction_unsold_distribution_config.amount = user_share_amount;

    Ok(())
}

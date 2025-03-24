use crate::instructions::manager::{InitializeInputAccounts, InitializeInputParams};
use crate::states::{
    AuctionAccount, AuctionRoundAccount, AuctionRoundStatus, AuctionStatus, CreamPadAccount,
    DecayModelType, ProgramStatus, UserAuctionAccount, UserAuctionBuyReceiptAccount,
    UserAuctionRoundAccount, AUCTION_ACCOUNT_PREFIX, AUCTION_ROUND_ACCOUNT_PREFIX,
    CREAM_PAD_ACCOUNT_PREFIX, USER_AUCTION_ACCOUNT_PREFIX, USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX,
    USER_AUCTION_ROUND_ACCOUNT_PREFIX,
};
use crate::utils::{
    adjust_amount, calculate_boost, calculate_total_price, check_back_authority,
    check_current_round, check_fee_base_point, check_is_auction_ended_or_sold_out,
    check_is_auction_round_ended, check_is_auction_round_still_have_time,
    check_is_auction_round_time_run_out, check_is_program_working, check_payment_fee_receiver,
    check_payment_mint_account, check_payment_receiver, check_remaining_supply, check_round_ender,
    check_round_limit, check_signer_exist, check_signing_authority, check_token_account_authority,
    check_value_is_zero, try_get_remaining_account_info, BASE_POINT,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::associated_token::{
    create as associated_token_create, Create as AssociatedTokenCreate,
};
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use std::ops::{Div, Mul};

use crate::instructions::creator::{UpdatePadInputAccounts, UpdatePadInputParams};
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuyParams {
    pub pad_name: String,

    pub current_round_index: String,

    pub buy_index: String,

    pub amount: u64,

    // Bumps
    pub auction_config_bump: u8,

    pub auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: BuyParams)]
pub struct BuyInputAccounts<'info> {
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
        mut,
        seeds = [
        AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        params.current_round_index.as_ref(),
        ],
        bump = params.auction_round_config_bump,
    )]
    pub auction_round_config: Box<Account<'info, AuctionRoundAccount>>,

    #[account(
        init_if_needed,
        payer = fee_and_rent_payer,
        space = UserAuctionAccount::space(),
        seeds = [
        USER_AUCTION_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        user.key().as_ref(),
        ],
        bump,
    )]
    pub user_auction_config: Box<Account<'info, UserAuctionAccount>>,

    #[account(
        init_if_needed,
        payer = fee_and_rent_payer,
        space = UserAuctionRoundAccount::space(),
        seeds = [
        USER_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_round_config.key().as_ref(),
        user_auction_config.key().as_ref(),
        ],
        bump,
    )]
    pub user_auction_round_config: Box<Account<'info, UserAuctionRoundAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = UserAuctionRoundAccount::space(),
        seeds = [
        USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX.as_ref(),
        user_auction_config.key().as_ref(),
        params.buy_index.as_ref(),
        ],
        bump,
    )]
    pub user_auction_buy_receipt_config: Box<Account<'info, UserAuctionBuyReceiptAccount>>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub payment_token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_buy<'info>(
    ctx: Context<'_, '_, 'info, 'info, BuyInputAccounts<'info>>,
    params: &BuyParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let auction_config: &Box<Account<AuctionAccount>> = &ctx.accounts.auction_config;
    let auction_round_config: &Box<Account<AuctionRoundAccount>> =
        &ctx.accounts.auction_round_config;

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

    let token_program_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 2)?;
    let payment_token_program_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 3)?;
    let associated_token_program_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 4)?;

    let user_payment_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 5)?;
    let user_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 6)?;

    let auction_config_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 7)?;

    let payment_receiver_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 8)?;
    let payment_receiver_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 9)?;

    let fee_receiver_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 10)?;
    let fee_receiver_payment_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 11)?;

    let current_round_index: u16 = params.current_round_index.clone().parse().unwrap();

    check_current_round(auction_config.current_round, current_round_index)?;

    check_is_auction_round_ended(auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(auction_config.status.clone())?;

    check_is_auction_round_time_run_out(auction_round_config.round_end_at, timestamp)?;

    check_remaining_supply(
        auction_config
            .total_supply_sold
            .saturating_add(params.amount),
        auction_config.total_supply,
    )?;

    check_payment_mint_account(
        auction_config.payment_mint,
        ctx.accounts.payment_token_mint_account.key(),
    )?;

    check_payment_receiver(
        auction_config.payment_receiver,
        payment_receiver_account_info.key(),
    )?;

    check_payment_fee_receiver(
        cream_pad_config.fee_receiver,
        fee_receiver_account_info.key(),
    )?;

    // Get decimals dynamically from mint accounts
    let amount_decimals = ctx.accounts.token_mint_account.decimals;
    let price_decimals = ctx.accounts.payment_token_mint_account.decimals;

    // Convert amount for transfer
    let adjusted_amount = adjust_amount(params.amount, 9, amount_decimals);

    // Convert total price for transfer
    let total_price = calculate_total_price(
        params.amount,
        auction_config.current_price,
        9,              // From default 9 decimal
        price_decimals, // To payment token decimals
        price_decimals, // Output should match payment token decimals
    );

    // Transfers

    // handle fee transfer
    let mut fee_price: u64 = 0;
    if cream_pad_config.is_fee_required {
        fee_price = total_price
            .checked_mul(cream_pad_config.fee_base_point as u64)
            .unwrap()
            .checked_div(BASE_POINT as u64)
            .unwrap();

        if fee_receiver_payment_token_account_account_info.data_is_empty() {
            // Create fee receiver token account
            // let create_fee_receiver_ata_cpi_accounts = AssociatedTokenCreate {
            //     payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
            //     associated_token: fee_receiver_payment_token_account_account_info.clone(),
            //     authority: fee_receiver_account_info.to_account_info(),
            //     mint: ctx.accounts.payment_token_mint_account.to_account_info(),
            //     system_program: ctx.accounts.system_program.to_account_info(),
            //     token_program: payment_token_program_account_info.clone(),
            // };

            let create_fee_receiver_ata_cpi_accounts = AssociatedTokenCreate {
                payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
                associated_token: fee_receiver_payment_token_account_account_info.clone(),
                authority: fee_receiver_account_info.to_account_info(),
                mint: ctx.accounts.payment_token_mint_account.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: payment_token_program_account_info.clone(),
            };
            let create_fee_receiver_ata_cpi_ctx = CpiContext::new(
                associated_token_program_account_info.clone(),
                create_fee_receiver_ata_cpi_accounts,
            );

            associated_token_create(create_fee_receiver_ata_cpi_ctx)?;
        };

        // Check fee receiver token account authority
        let fee_receiver_token_account_unpacked: TokenAccount =
            TokenAccount::try_deserialize_unchecked(
                &mut &*fee_receiver_payment_token_account_account_info
                    .data
                    .borrow()
                    .as_ref(),
            )?;

        check_token_account_authority(
            fee_receiver_token_account_unpacked.owner,
            fee_receiver_account_info.key(),
        )?;

        // transfer fee payment to fee receiver
        let transfer_fee_payment_to_fee_receiver_cpi_accounts = TransferChecked {
            from: user_payment_token_account_account_info.to_account_info(),
            mint: ctx.accounts.payment_token_mint_account.to_account_info(),
            to: fee_receiver_payment_token_account_account_info.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let transfer_fee_payment_to_fee_receiver_cpi_ctx = CpiContext::new(
            payment_token_program_account_info.clone(),
            transfer_fee_payment_to_fee_receiver_cpi_accounts);

        transfer_checked(
            transfer_fee_payment_to_fee_receiver_cpi_ctx,
            fee_price,
            ctx.accounts.payment_token_mint_account.decimals,
        )?;
    };

    //

    // // Set Values
    // let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    // auction_config.last_block_timestamp = timestamp;
    //
    // if current_round_index == auction_config.tmax {
    //     auction_config.status = AuctionStatus::Ended;
    // };
    //
    // auction_config.boost_history.push(boot);
    //
    // let auction_round_config: &mut Box<Account<AuctionRoundAccount>> =
    //     &mut ctx.accounts.auction_round_config;
    // auction_round_config.last_block_timestamp = timestamp;
    // auction_round_config.status = AuctionRoundStatus::Ended;
    // auction_round_config.round_ended_at = timestamp;
    // auction_round_config.boost = boot;

    Ok(())
}

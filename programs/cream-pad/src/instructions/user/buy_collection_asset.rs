use crate::states::{
    AuctionRoundStatus, AuctionStatus,
    CollectionAuctionAccount, CollectionAuctionRoundAccount, CreamPadAccount, UserAuctionStatus,
    UserCollectionAuctionAccount, UserCollectionAuctionBuyReceiptAccount,
    UserCollectionAuctionRoundAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX,
    COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX, USER_COLLECTION_AUCTION_ACCOUNT_PREFIX,
    USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX,
    USER_COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX,
};
use crate::utils::{
    adjust_amount, calculate_boost, check_back_authority, check_buy_index,
    check_current_round, check_is_auction_ended_or_sold_out, check_is_auction_round_ended,
    check_is_auction_round_time_run_out, check_is_program_working, check_payment_fee_receiver,
    check_payment_mint_account, check_payment_receiver, check_remaining_supply,
    check_round_buy_limit, check_signer_exist, check_token_account_authority,
    try_get_remaining_account_info, BASE_POINT,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::associated_token::{
    create as associated_token_create, Create as AssociatedTokenCreate,
};
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TransferChecked};

use crate::events::BuyCollectionAssetEvent;
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BuyCollectionAssetParams {
    pub pad_name: String,

    pub current_round_index: String,

    pub buy_index: String,

    pub amount: u64,

    // Bumps
    pub collection_auction_config_bump: u8,

    pub collection_auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: BuyCollectionAssetParams)]
pub struct BuyCollectionAssetInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [
        COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        collection_mint_account.key().as_ref(),
        ],
        bump = params.collection_auction_config_bump,
    )]
    pub collection_auction_config: Box<Account<'info, CollectionAuctionAccount>>,

    #[account(
        mut,
        seeds = [
        COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        params.current_round_index.as_ref(),
        ],
        bump = params.collection_auction_round_config_bump,
    )]
    pub collection_auction_round_config: Box<Account<'info, CollectionAuctionRoundAccount>>,

    #[account(
        init_if_needed,
        payer = fee_and_rent_payer,
        space = UserCollectionAuctionAccount::space(),
        seeds = [
        USER_COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        user.key().as_ref(),
        ],
        bump,
    )]
    pub user_collection_auction_config: Box<Account<'info, UserCollectionAuctionAccount>>,

    #[account(
        init_if_needed,
        payer = fee_and_rent_payer,
        space = UserCollectionAuctionRoundAccount::space(),
        seeds = [
        USER_COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        collection_auction_round_config.key().as_ref(),
        user_collection_auction_config.key().as_ref(),
        ],
        bump,
    )]
    pub user_collection_auction_round_config:
        Box<Account<'info, UserCollectionAuctionRoundAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = UserCollectionAuctionBuyReceiptAccount::space(),
        seeds = [
        USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX.as_ref(),
        user_collection_auction_config.key().as_ref(),
        params.buy_index.as_ref(),
        ],
        bump,
    )]
    pub user_collection_auction_buy_receipt_config:
        Box<Account<'info, UserCollectionAuctionBuyReceiptAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub payment_token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_buy_collection_asset<'info>(
    ctx: Context<'_, '_, 'info, 'info, BuyCollectionAssetInputAccounts<'info>>,
    params: &BuyCollectionAssetParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let collection_auction_config: &Box<Account<CollectionAuctionAccount>> =
        &ctx.accounts.collection_auction_config;
    let collection_auction_round_config: &Box<Account<CollectionAuctionRoundAccount>> =
        &ctx.accounts.collection_auction_round_config;

    // Checks

    check_is_program_working(cream_pad_config.program_status.clone())?;

    let back_authority_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 1)?;

    if cream_pad_config.is_back_authority_required {
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

    let user_collection_auction_config: &Box<Account<UserCollectionAuctionAccount>> =
        &ctx.accounts.user_collection_auction_config;

    let user_collection_auction_round_config: &Box<Account<UserCollectionAuctionRoundAccount>> =
        &ctx.accounts.user_collection_auction_round_config;

    check_round_buy_limit(
        user_collection_auction_round_config
            .total_buy_amount
            .checked_add(params.amount)
            .unwrap(),
        collection_auction_round_config.buy_limit,
    )?;

    let buy_index: u64 = params.buy_index.clone().parse().unwrap();

    check_buy_index(
        buy_index,
        user_collection_auction_config
            .total_buy_count
            .checked_add(1)
            .unwrap(),
    )?;

    let payment_token_program_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 2)?;
    let associated_token_program_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 3)?;

    let user_payment_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 4)?;

    let payment_receiver_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 5)?;
    let payment_receiver_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 6)?;

    let fee_receiver_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 7)?;
    let fee_receiver_payment_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 8)?;

    let current_round_index: u16 = params.current_round_index.clone().parse().unwrap();

    check_current_round(collection_auction_config.current_round, current_round_index)?;

    check_is_auction_round_ended(collection_auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(collection_auction_config.status.clone())?;

    check_is_auction_round_time_run_out(collection_auction_round_config.round_end_at, timestamp)?;

    check_remaining_supply(
        collection_auction_config
            .total_supply_sold
            .saturating_add(params.amount),
        collection_auction_config.total_supply,
    )?;

    check_payment_mint_account(
        collection_auction_config.payment_mint,
        ctx.accounts.payment_token_mint_account.key(),
    )?;

    check_payment_receiver(
        collection_auction_config.payment_receiver,
        payment_receiver_account_info.key(),
    )?;

    check_payment_fee_receiver(
        cream_pad_config.fee_receiver,
        fee_receiver_account_info.key(),
    )?;

    // Convert total price for transfer
    let total_price = collection_auction_config
        .current_price
        .checked_mul(params.amount)
        .unwrap();

    // Transfers

    // transfer minting fee

    let total_minting_fee: u64 = cream_pad_config
        .minting_fee
        .checked_mul(params.amount)
        .unwrap();

    let transfer_minting_fee_ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.user.key(),
        &back_authority_account_info.key(),
        total_minting_fee,
    );

    anchor_lang::solana_program::program::invoke(
        &transfer_minting_fee_ix,
        &[
            ctx.accounts.user.to_account_info(),
            back_authority_account_info.to_account_info(),
        ],
    )?;

    // handle fee transfer
    let mut fee_price: u64 = 0;
    if cream_pad_config.is_fee_required {
        fee_price = total_price
            .checked_mul(cream_pad_config.fee_base_point as u64)
            .unwrap()
            .checked_div(BASE_POINT as u64)
            .unwrap();

        let adjusted_fee_price = adjust_amount(
            fee_price,
            9,
            ctx.accounts.payment_token_mint_account.decimals,
        );

        if fee_receiver_payment_token_account_account_info.data_is_empty() {
            // Create fee receiver token account
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
            transfer_fee_payment_to_fee_receiver_cpi_accounts,
        );

        transfer_checked(
            transfer_fee_payment_to_fee_receiver_cpi_ctx,
            adjusted_fee_price,
            ctx.accounts.payment_token_mint_account.decimals,
        )?;
    };

    // Handle payment transfer
    if payment_receiver_token_account_account_info.data_is_empty() {
        // Create payment receiver token account
        let create_payment_receiver_ata_cpi_accounts = AssociatedTokenCreate {
            payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
            associated_token: payment_receiver_token_account_account_info.clone(),
            authority: payment_receiver_account_info.to_account_info(),
            mint: ctx.accounts.payment_token_mint_account.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: payment_token_program_account_info.clone(),
        };

        let create_payment_receiver_ata_cpi_ctx = CpiContext::new(
            associated_token_program_account_info.clone(),
            create_payment_receiver_ata_cpi_accounts,
        );

        associated_token_create(create_payment_receiver_ata_cpi_ctx)?;
    };

    // Check payment receiver token account authority
    let payment_receiver_token_account_unpacked: TokenAccount =
        TokenAccount::try_deserialize_unchecked(
            &mut &*payment_receiver_token_account_account_info
                .data
                .borrow()
                .as_ref(),
        )?;

    check_token_account_authority(
        payment_receiver_token_account_unpacked.owner,
        payment_receiver_account_info.key(),
    )?;

    // transfer payment to payment receiver
    let transfer_payment_to_payment_receiver_cpi_accounts = TransferChecked {
        from: user_payment_token_account_account_info.to_account_info(),
        mint: ctx.accounts.payment_token_mint_account.to_account_info(),
        to: payment_receiver_token_account_account_info.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let transfer_payment_to_payment_receiver_cpi_ctx = CpiContext::new(
        payment_token_program_account_info.clone(),
        transfer_payment_to_payment_receiver_cpi_accounts,
    );

    let adjusted_total_price = adjust_amount(
        total_price.checked_sub(fee_price).unwrap(),
        9,
        ctx.accounts.payment_token_mint_account.decimals,
    );

    transfer_checked(
        transfer_payment_to_payment_receiver_cpi_ctx,
        adjusted_total_price,
        ctx.accounts.payment_token_mint_account.decimals,
    )?;

    // Set Values
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.total_user_buy_count = collection_auction_config
        .total_user_buy_count
        .checked_add(1)
        .unwrap();

    collection_auction_config.total_supply_sold = collection_auction_config
        .total_supply_sold
        .checked_add(params.amount)
        .unwrap();

    collection_auction_config.total_payment = collection_auction_config
        .total_payment
        .checked_add(total_price)
        .unwrap();

    collection_auction_config.total_fee = collection_auction_config
        .total_fee
        .checked_add(fee_price)
        .unwrap();

    collection_auction_config.total_minting_fee = collection_auction_config
        .total_minting_fee
        .checked_add(total_minting_fee)
        .unwrap();

    let collection_auction_round_config: &mut Box<Account<CollectionAuctionRoundAccount>> =
        &mut ctx.accounts.collection_auction_round_config;
    collection_auction_round_config.last_block_timestamp = timestamp;

    collection_auction_round_config.total_user_buy_count = collection_auction_round_config
        .total_user_buy_count
        .checked_add(1)
        .unwrap();

    collection_auction_round_config.total_supply_sold = collection_auction_round_config
        .total_supply_sold
        .checked_add(params.amount)
        .unwrap();

    collection_auction_round_config.total_payment = collection_auction_round_config
        .total_payment
        .checked_add(total_price)
        .unwrap();

    collection_auction_round_config.total_fee = collection_auction_round_config
        .total_fee
        .checked_add(fee_price)
        .unwrap();

    // check is over sold
    if collection_auction_config.total_supply_sold >= collection_auction_config.total_supply {
        let boost: u64 = calculate_boost(
            collection_auction_round_config.total_supply_sold,
            collection_auction_config
                .total_supply
                .checked_div(collection_auction_config.tmax as u64)
                .unwrap(),
            collection_auction_config.omega,
            collection_auction_config.alpha,
            collection_auction_config.time_shift_max,
        );

        collection_auction_config.boost_history.push(boost);
        collection_auction_config.status = AuctionStatus::SoldOut;

        collection_auction_round_config.status = AuctionRoundStatus::Ended;
        collection_auction_round_config.boost = boost;
    };

    let user_collection_auction_config: &mut Box<Account<UserCollectionAuctionAccount>> =
        &mut ctx.accounts.user_collection_auction_config;
    if user_collection_auction_config.last_block_timestamp == 0 {
        user_collection_auction_config.user = ctx.accounts.user.key();
        user_collection_auction_config.status = UserAuctionStatus::None;
        collection_auction_config.total_user_count = collection_auction_config
            .total_user_count
            .checked_add(1)
            .unwrap();
    };

    user_collection_auction_config.last_block_timestamp = timestamp;
    user_collection_auction_config.total_buy_count = user_collection_auction_config
        .total_buy_count
        .checked_add(1)
        .unwrap();

    user_collection_auction_config.total_buy_amount = user_collection_auction_config
        .total_buy_amount
        .checked_add(params.amount)
        .unwrap();

    user_collection_auction_config.total_payment = user_collection_auction_config
        .total_payment
        .checked_add(total_price)
        .unwrap();

    let user_collection_auction_round_config: &mut Box<Account<UserCollectionAuctionRoundAccount>> =
        &mut ctx.accounts.user_collection_auction_round_config;

    if user_collection_auction_round_config.last_block_timestamp == 0 {
        user_collection_auction_round_config.round = current_round_index;

        collection_auction_round_config.total_user_count = collection_auction_round_config
            .total_user_count
            .checked_add(1)
            .unwrap();
    };

    user_collection_auction_round_config.last_block_timestamp = timestamp;
    user_collection_auction_round_config.total_buy_count = user_collection_auction_round_config
        .total_buy_count
        .checked_add(1)
        .unwrap();

    user_collection_auction_round_config.total_buy_amount = user_collection_auction_round_config
        .total_buy_amount
        .checked_add(params.amount)
        .unwrap();

    user_collection_auction_round_config.total_payment = user_collection_auction_round_config
        .total_payment
        .checked_add(total_price)
        .unwrap();

    let user_collection_auction_buy_receipt_config: &mut Box<
        Account<UserCollectionAuctionBuyReceiptAccount>,
    > = &mut ctx.accounts.user_collection_auction_buy_receipt_config;
    user_collection_auction_buy_receipt_config.last_block_timestamp = timestamp;
    user_collection_auction_buy_receipt_config.buy_amount = params.amount;
    user_collection_auction_buy_receipt_config.payment = total_price;
    user_collection_auction_buy_receipt_config.round = current_round_index;
    user_collection_auction_buy_receipt_config.index = buy_index;
    user_collection_auction_buy_receipt_config.pad_name = params.pad_name.clone();
    user_collection_auction_buy_receipt_config.collection_mint =
        ctx.accounts.collection_mint_account.key();
    user_collection_auction_buy_receipt_config.user = ctx.accounts.user.key();

    // Event
    let event: BuyCollectionAssetEvent = BuyCollectionAssetEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        user: ctx.accounts.user.key(),
        amount: params.amount,
        price: collection_auction_config.current_price,
        fee: fee_price,
        minting_fee: total_minting_fee,
        total_price: total_price,
        current_round: params.current_round_index.clone(),
        user_buy_index: params.buy_index.clone(),
        is_ended_and_sold_out: collection_auction_config.status.eq(&AuctionStatus::SoldOut),
    };

    emit!(event);

    Ok(())
}

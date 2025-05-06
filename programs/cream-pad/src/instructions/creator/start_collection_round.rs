use crate::states::{
    CollectionAuctionAccount, CollectionAuctionRoundAccount, CreamPadAccount,
    COLLECTION_AUCTION_ACCOUNT_PREFIX, COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX,
};
use crate::utils::{
    calculate_price, check_back_authority, check_is_auction_ended_or_sold_out,
    check_is_previous_auction_round_ended, check_is_program_working, check_next_round,
    check_previous_round, check_program_id, check_round_starter, check_signer_exist,
    check_value_is_zero, try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use crate::events::StartCollectionRoundEvent;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StartNextCollectionRoundInputParams {
    pub pad_name: String,

    pub previous_round_index: String,

    pub next_round_index: String,

    pub next_round_duration: i64,

    pub next_have_buy_limit: bool,

    pub next_buy_limit: u64,

    // Bumps
    pub collection_auction_config_bump: u8,

    pub previous_collection_auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: StartNextCollectionRoundInputParams)]
pub struct StartNextCollectionRoundInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub starter: Signer<'info>,

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
        seeds = [
        COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        params.previous_round_index.as_ref(),
        ],
        bump = params.previous_collection_auction_round_config_bump,
    )]
    pub previous_collection_auction_round_config:
        Box<Account<'info, CollectionAuctionRoundAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = CollectionAuctionRoundAccount::space(),
        seeds = [
        COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        params.next_round_index.as_ref(),
        ],
        bump,
    )]
    pub next_collection_auction_round_config: Box<Account<'info, CollectionAuctionRoundAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_start_next_collection_round<'info>(
    ctx: Context<'_, '_, 'info, 'info, StartNextCollectionRoundInputAccounts<'info>>,
    params: &StartNextCollectionRoundInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let collection_auction_config: &Box<Account<CollectionAuctionAccount>> =
        &ctx.accounts.collection_auction_config;
    let previous_collection_auction_round_config: &Box<Account<CollectionAuctionRoundAccount>> =
        &ctx.accounts.previous_collection_auction_round_config;

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
            load_instruction_at_checked(instruction_index, &ctx.accounts.instructions_sysvar)?;

        check_signer_exist(instruction, back_authority_account_info.key())?;
    };

    check_round_starter(
        collection_auction_config.creator,
        cream_pad_config.back_authority,
        ctx.accounts.starter.key(),
    )?;

    let previous_round_index: u16 = params.previous_round_index.clone().parse().unwrap();

    let next_round_index: u16 = params.next_round_index.clone().parse().unwrap();

    check_previous_round(
        collection_auction_config.current_round,
        previous_round_index,
    )?;

    check_next_round(
        collection_auction_config
            .current_round
            .checked_add(1)
            .unwrap(),
        next_round_index,
    )?;

    check_is_previous_auction_round_ended(previous_collection_auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(collection_auction_config.status.clone())?;

    if params.next_have_buy_limit {
        check_value_is_zero(params.next_buy_limit as usize)?;
    };

    let current_price = calculate_price(
        collection_auction_config.p0,
        collection_auction_config.ptmax,
        collection_auction_config.tmax as u64,
        collection_auction_config.current_round as usize,
        &collection_auction_config.boost_history,
        collection_auction_config.decay_model.clone(),
        collection_auction_config.time_shift_max,
    );

    // Set Values
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.current_round = collection_auction_config
        .current_round
        .checked_add(1)
        .unwrap();
    collection_auction_config.current_price = current_price;

    let next_collection_auction_round_config: &mut Box<Account<CollectionAuctionRoundAccount>> =
        &mut ctx.accounts.next_collection_auction_round_config;
    next_collection_auction_round_config.last_block_timestamp = timestamp;
    next_collection_auction_round_config.round_start_at = timestamp;
    next_collection_auction_round_config.round_end_at =
        timestamp.checked_add(params.next_round_duration).unwrap();
    next_collection_auction_round_config.round = collection_auction_config.current_round;
    next_collection_auction_round_config.price = collection_auction_config.current_price;
    next_collection_auction_round_config.boost = 0.0;
    next_collection_auction_round_config.have_buy_limit = params.next_have_buy_limit;
    next_collection_auction_round_config.buy_limit = params.next_buy_limit;

    // Event
    let event: StartCollectionRoundEvent = StartCollectionRoundEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        previous_round_index: params.previous_round_index.clone(),
        next_round_index: params.next_round_index.clone(),
        next_round_duration: params.next_round_duration,
        current_price: current_price,
        next_have_buy_limit: params.next_have_buy_limit,
        next_buy_limit: params.next_buy_limit,
    };

    emit!(event);

    Ok(())
}

use crate::states::{
    AuctionRoundStatus, AuctionStatus, CollectionAuctionAccount, CollectionAuctionRoundAccount,
    CreamPadAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX, COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX,
};
use crate::utils::{
    calculate_boost, check_back_authority, check_current_round, check_is_auction_ended_or_sold_out,
    check_is_auction_round_ended, check_is_auction_round_still_have_time, check_is_program_working,
    check_program_id, check_round_ender, check_signer_exist, try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use crate::events::EndCollectionRoundEvent;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EndCollectionRoundInputParams {
    pub pad_name: String,

    pub round_index: String,

    // Bumps
    pub collection_auction_config_bump: u8,

    pub collection_auction_round_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: EndCollectionRoundInputParams)]
pub struct EndCollectionRoundInputAccounts<'info> {
    pub ender: Signer<'info>,

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
        params.round_index.as_ref(),
        ],
        bump = params.collection_auction_round_config_bump,
    )]
    pub collection_auction_round_config: Box<Account<'info, CollectionAuctionRoundAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_end_collection_round<'info>(
    ctx: Context<'_, '_, 'info, 'info, EndCollectionRoundInputAccounts<'info>>,
    params: &EndCollectionRoundInputParams,
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

    check_round_ender(
        collection_auction_config.creator,
        cream_pad_config.back_authority,
        ctx.accounts.ender.key(),
    )?;

    let current_round_index: u16 = params.round_index.clone().parse().unwrap();

    check_current_round(collection_auction_config.current_round, current_round_index)?;

    check_is_auction_round_ended(collection_auction_round_config.status.clone())?;

    check_is_auction_ended_or_sold_out(collection_auction_config.status.clone())?;

    check_is_auction_round_still_have_time(
        collection_auction_round_config.round_end_at,
        timestamp,
    )?;

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

    // Set Values
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;

    if current_round_index == collection_auction_config.tmax {
        collection_auction_config.status = AuctionStatus::Ended;
    };

    collection_auction_config.boost_history.push(boost);

    let collection_auction_round_config: &mut Box<Account<CollectionAuctionRoundAccount>> =
        &mut ctx.accounts.collection_auction_round_config;
    collection_auction_round_config.last_block_timestamp = timestamp;
    collection_auction_round_config.status = AuctionRoundStatus::Ended;
    collection_auction_round_config.round_ended_at = timestamp;
    collection_auction_round_config.boost = boost;

    // Event
    let event: EndCollectionRoundEvent = EndCollectionRoundEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        round_index: params.round_index.clone(),
        boost: boost,
    };

    emit!(event);

    Ok(())
}

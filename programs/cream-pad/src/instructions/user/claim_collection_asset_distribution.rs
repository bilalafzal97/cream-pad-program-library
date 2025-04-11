use crate::states::{
    CollectionAuctionAccount, CreamPadAccount, UserCollectionAuctionAccount,
    UserCollectionAuctionUnsoldDistributionAccount,
    COLLECTION_AUCTION_ACCOUNT_PREFIX,
    USER_COLLECTION_AUCTION_ACCOUNT_PREFIX,
    USER_COLLECTION_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX,
};
use crate::utils::{
    check_back_authority, check_eligible_for_collection_distribution, check_is_auction_is_distribution, check_is_program_working,
    check_remaining_supply, check_signer_exist, try_get_remaining_account_info, BASE_POINT,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use crate::events::CollectionClaimDistributionEvent;
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ClaimCollectionAssetDistributionParams {
    pub pad_name: String,

    // Bumps
    pub collection_auction_config_bump: u8,

    pub user_collection_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: ClaimCollectionAssetDistributionParams)]
pub struct ClaimCollectionAssetDistributionInputAccounts<'info> {
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
        USER_COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        user.key().as_ref(),
        ],
        bump = params.user_collection_auction_config_bump,
    )]
    pub user_collection_auction_config: Box<Account<'info, UserCollectionAuctionAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = UserCollectionAuctionUnsoldDistributionAccount::space(),
        seeds = [
        USER_COLLECTION_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX.as_ref(),
        user_collection_auction_config.key().as_ref(),
        ],
        bump,
    )]
    pub user_collection_auction_unsold_distribution_config:
        Box<Account<'info, UserCollectionAuctionUnsoldDistributionAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_claim_collection_asset_distribution<'info>(
    ctx: Context<'_, '_, 'info, 'info, ClaimCollectionAssetDistributionInputAccounts<'info>>,
    params: &ClaimCollectionAssetDistributionParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let collection_auction_config: &Box<Account<CollectionAuctionAccount>> =
        &ctx.accounts.collection_auction_config;

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

    check_is_auction_is_distribution(collection_auction_config.status.clone())?;

    let user_collection_auction_config: &Box<Account<UserCollectionAuctionAccount>> =
        &ctx.accounts.user_collection_auction_config;

    let user_share_base_point: u64 = user_collection_auction_config
        .total_buy_amount
        .checked_mul(BASE_POINT as u64)
        .unwrap()
        .checked_div(collection_auction_config.total_supply_sold)
        .unwrap();

    let user_share_amount: u64 = collection_auction_config
        .total_unsold_supply_distribution
        .checked_mul(user_share_base_point)
        .unwrap()
        .checked_div(BASE_POINT as u64)
        .unwrap();

    check_remaining_supply(
        collection_auction_config
            .total_unsold_supply_distribution_claimed
            .checked_add(user_share_amount)
            .unwrap(),
        collection_auction_config.total_unsold_supply_distribution,
    )?;

    check_eligible_for_collection_distribution(user_share_amount)?;

    // transfer minting fee

    let total_minting_fee: u64 = cream_pad_config
        .minting_fee
        .checked_mul(user_share_amount)
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

    // Set Values
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;

    collection_auction_config.total_unsold_supply_distribution_claimed = collection_auction_config
        .total_unsold_supply_distribution_claimed
        .checked_add(user_share_amount)
        .unwrap();

    collection_auction_config.total_unsold_supply_distribution_claimed_count =
        collection_auction_config
            .total_unsold_supply_distribution_claimed_count
            .checked_add(1)
            .unwrap();

    collection_auction_config.total_minting_fee = collection_auction_config
        .total_minting_fee
        .checked_add(total_minting_fee)
        .unwrap();

    let user_collection_auction_unsold_distribution_config: &mut Box<
        Account<UserCollectionAuctionUnsoldDistributionAccount>,
    > = &mut ctx.accounts.user_collection_auction_unsold_distribution_config;
    user_collection_auction_unsold_distribution_config.last_block_timestamp = timestamp;
    user_collection_auction_unsold_distribution_config.amount = user_share_amount;

    // Event
    let event: CollectionClaimDistributionEvent = CollectionClaimDistributionEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        user: ctx.accounts.user.key(),
        amount: user_share_amount,
    };

    emit!(event);

    Ok(())
}

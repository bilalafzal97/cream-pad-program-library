use crate::states::{
    AuctionStatus, CollectionAuctionAccount, CreamPadAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX,
};
use crate::utils::{
    check_back_authority, check_is_auction_ended, check_is_program_working,
    check_program_id, check_signer_exist, check_supply_locker, try_get_remaining_account_info,
    BASE_POINT,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use crate::events::TreasuryAndDistributionEvent;

use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TreasuryAndDistributeInputParams {
    pub pad_name: String,

    // Bumps
    pub collection_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: TreasuryAndDistributeInputParams)]
pub struct TreasuryAndDistributeInputAccounts<'info> {
    pub supply_distributor: Signer<'info>,

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

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_treasury_and_distribute<'info>(
    ctx: Context<'_, '_, 'info, 'info, TreasuryAndDistributeInputAccounts<'info>>,
    params: &TreasuryAndDistributeInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let collection_auction_config: &Box<Account<CollectionAuctionAccount>> =
        &ctx.accounts.collection_auction_config;

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

    check_supply_locker(
        collection_auction_config.creator,
        cream_pad_config.back_authority,
        ctx.accounts.supply_distributor.key(),
    )?;

    check_is_auction_ended(collection_auction_config.status.clone())?;

    let total_unsold_supply: u64 = collection_auction_config
        .total_supply
        .checked_sub(collection_auction_config.total_supply_sold)
        .unwrap();

    let mut treasury_supply: u64 = total_unsold_supply
        .checked_mul(cream_pad_config.lock_base_point as u64)
        .unwrap()
        .checked_div(BASE_POINT as u64)
        .unwrap();

    let distribution_supply: u64 = total_unsold_supply
        .checked_mul(cream_pad_config.distribution_base_point as u64)
        .unwrap()
        .checked_div(BASE_POINT as u64)
        .unwrap();

    if (treasury_supply.checked_add(distribution_supply).unwrap()) != total_unsold_supply {
        treasury_supply = treasury_supply.checked_add(1).unwrap();
    };

    // Set Values
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.status = AuctionStatus::UnsoldLockedAndDistributionOpen;
    collection_auction_config.total_unsold_supply_distribution = distribution_supply;
    collection_auction_config.total_unsold_supply_to_treasury = treasury_supply;

    // Event
    let event: TreasuryAndDistributionEvent = TreasuryAndDistributionEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        treasury_supply,
        distribution_supply,
    };

    emit!(event);

    Ok(())
}

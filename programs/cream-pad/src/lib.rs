use anchor_lang::prelude::*;

pub mod meta;

use instructions::creator::*;
use instructions::manager::*;
use instructions::user::*;

mod error;

mod events;
mod instructions;
mod states;

mod utils;

declare_id!("G2SuCkF4a1YJjuTrqNydNcLx99f9dnpbM5Civ58PAwSU");

#[program]
pub mod cream_pad {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeInputAccounts>,
        params: InitializeInputParams,
    ) -> Result<()> {
        handle_initialize(ctx, &params)
    }

    pub fn update_config(
        ctx: Context<UpdateConfigInputAccounts>,
        params: UpdateConfigInputParams,
    ) -> Result<()> {
        handle_update_config(ctx, &params)
    }

    pub fn initialize_pad(
        ctx: Context<InitializePadInputAccounts>,
        params: InitializePadInputParams,
    ) -> Result<()> {
        handle_initialize_pad(ctx, &params)
    }

    pub fn update_pad<'info>(
        ctx: Context<'_, '_, 'info, 'info, UpdatePadInputAccounts<'info>>,
        params: UpdatePadInputParams,
    ) -> Result<()> {
        handle_update_pad(ctx, &params)
    }

    pub fn end_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, EndRoundInputAccounts<'info>>,
        params: EndRoundInputParams,
    ) -> Result<()> {
        handle_end_round(ctx, &params)
    }

    pub fn start_next_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, StartNextRoundInputAccounts<'info>>,
        params: StartNextRoundInputParams,
    ) -> Result<()> {
        handle_start_next_round(ctx, &params)
    }

    pub fn buy<'info>(
        ctx: Context<'_, '_, 'info, 'info, BuyInputAccounts<'info>>,
        params: BuyParams,
    ) -> Result<()> {
        handle_buy(ctx, &params)
    }

    pub fn lock_and_distribute<'info>(
        ctx: Context<'_, '_, 'info, 'info, LockAndDistributeInputAccounts<'info>>,
        params: LockAndDistributeInputParams,
    ) -> Result<()> {
        handle_lock_and_distribute(ctx, &params)
    }

    pub fn unlock_unsold_supply<'info>(
        ctx: Context<'_, '_, 'info, 'info, UnlockUnsoldSupplyInputAccounts<'info>>,
        params: UnlockUnsoldSupplyInputParams,
    ) -> Result<()> {
        handle_unlock_unsold_supply(ctx, &params)
    }

    pub fn claim_distribution<'info>(
        ctx: Context<'_, '_, 'info, 'info, ClaimDistributionInputAccounts<'info>>,
        params: ClaimDistributionParams,
    ) -> Result<()> {
        handle_claim_distribution(ctx, &params)
    }

    pub fn initialize_collection_pad<'info>(
        ctx: Context<'_, '_, 'info, 'info, InitializeCollectionPadInputAccounts<'info>>,
        params: InitializeCollectionPadInputParams,
    ) -> Result<()> {
        handle_initialize_collection_pad(ctx, &params)
    }

    pub fn update_collection_pad<'info>(
        ctx: Context<'_, '_, 'info, 'info, UpdateCollectionPadInputAccounts<'info>>,
        params: UpdateCollectionPadInputParams,
    ) -> Result<()> {
        handle_update_collection_pad(ctx, &params)
    }

    pub fn end_collection_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, EndCollectionRoundInputAccounts<'info>>,
        params: EndCollectionRoundInputParams,
    ) -> Result<()> {
        handle_end_collection_round(ctx, &params)
    }

    pub fn start_next_collection_round<'info>(
        ctx: Context<'_, '_, 'info, 'info, StartNextCollectionRoundInputAccounts<'info>>,
        params: StartNextCollectionRoundInputParams,
    ) -> Result<()> {
        handle_start_next_collection_round(ctx, &params)
    }

    pub fn take_collection_update_authority<'info>(
        ctx: Context<'_, '_, 'info, 'info, TakeCollectionUpdateAuthorityInputAccounts<'info>>,
        params: TakeCollectionUpdateAuthorityInputParams,
    ) -> Result<()> {
        handle_take_collection_update_authority(ctx, &params)
    }

    pub fn give_collection_update_authority<'info>(
        ctx: Context<'_, '_, 'info, 'info, GiveCollectionUpdateAuthorityInputAccounts<'info>>,
        params: GiveCollectionUpdateAuthorityInputParams,
    ) -> Result<()> {
        handle_give_collection_update_authority(ctx, &params)
    }

    pub fn treasury_and_distribute<'info>(
        ctx: Context<'_, '_, 'info, 'info, TreasuryAndDistributeInputAccounts<'info>>,
        params: TreasuryAndDistributeInputParams,
    ) -> Result<()> {
        handle_treasury_and_distribute(ctx, &params)
    }

    pub fn mint_treasury_asset<'info>(
        ctx: Context<'_, '_, 'info, 'info, MintTreasuryAssetInputAccounts<'info>>,
        params: MintTreasuryAssetInputParams,
    ) -> Result<()> {
        handle_mint_treasury_asset(ctx, &params)
    }

    pub fn buy_collection_asset<'info>(
        ctx: Context<'_, '_, 'info, 'info, BuyCollectionAssetInputAccounts<'info>>,
        params: BuyCollectionAssetParams,
    ) -> Result<()> {
        handle_buy_collection_asset(ctx, &params)
    }

    pub fn fill_bought_collection_asset<'info>(
        ctx: Context<'_, '_, 'info, 'info, FillBoughtCollectionAssetInputAccounts<'info>>,
        params: FillBoughtCollectionAssetInputParams,
    ) -> Result<()> {
        handle_fill_bought_collection_asset(ctx, &params)
    }

    pub fn claim_collection_asset_distribution<'info>(
        ctx: Context<'_, '_, 'info, 'info, ClaimCollectionAssetDistributionInputAccounts<'info>>,
        params: ClaimCollectionAssetDistributionParams,
    ) -> Result<()> {
        handle_claim_collection_asset_distribution(ctx, &params)
    }

    pub fn fill_claimed_collection_asset_distribution<'info>(
        ctx: Context<
            '_,
            '_,
            'info,
            'info,
            FillClaimedCollectionAssetDistributionInputAccounts<'info>,
        >,
        params: FillClaimedCollectionAssetDistributionInputParams,
    ) -> Result<()> {
        handle_fill_claimed_collection_asset_distribution(ctx, &params)
    }
}

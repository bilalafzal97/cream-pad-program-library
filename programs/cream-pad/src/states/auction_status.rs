use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum AuctionStatus {
    Started,
    Ended,
    SoldOut,
    UnsoldLockedAndDistributionOpen,
    UnsoldUnlocked,
}
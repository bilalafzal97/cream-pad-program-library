use anchor_lang::prelude::*;

pub const USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: &str = "UCABRAP";

#[account]
pub struct UserCollectionAuctionBuyReceiptAccount {
    /// timestamp when account updated
    pub last_block_timestamp: i64,

    pub buy_amount: u64,

    pub buy_amount_filled: u64,

    pub payment: u64,

    pub round: u16,

    pub index: u64,

    pub pad_name: String,

    pub collection_mint: Pubkey,

    pub user: Pubkey,
}

impl UserCollectionAuctionBuyReceiptAccount {
    pub fn space() -> usize {
        8 // default
            + 8 // last_block_timestamp

            + 8 // buy_amount

            + 8 // buy_amount_filled

            + 8 // payment

            + 2 // round

            + 8 // index

            + 50 // pad_name

            + 32 // collection_mint

            + 32 // user
    }
}

use anchor_lang::prelude::*;

#[repr(C)]
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct AssetCreator {
    pub address: Pubkey,

    pub share: u8,
}

impl AssetCreator {
    pub fn space() -> usize {
        32 // address
            + 1 // share
    }
}

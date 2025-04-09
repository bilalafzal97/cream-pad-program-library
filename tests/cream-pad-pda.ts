/// Prefix
import {PublicKey} from "@solana/web3.js";

export const CREAM_PAD_ACCOUNT_PREFIX: string = "CPAP";

export const AUCTION_ACCOUNT_PREFIX: string = "AAP";
export const AUCTION_VAULT_PREFIX: string = "AVP";
export const AUCTION_ROUND_ACCOUNT_PREFIX: string = "ARAP";

export const USER_AUCTION_ACCOUNT_PREFIX: string = "UAAP";
export const USER_AUCTION_ROUND_ACCOUNT_PREFIX: string = "UARAP";
export const USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: string = "UABRAP";
export const USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: string = "UAUDAP";

export const COLLECTION_AUCTION_ACCOUNT_PREFIX: string = "CAAP";
export const COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX: string = "CARAP";


////// PDAs

export function getMetadataPda(programAddress: PublicKey, mint: PublicKey): PublicKey {
    const [metadataPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            programAddress.toBuffer(),
            mint.toBuffer(),
        ], programAddress);

    return metadataPda;
}

export function getMasterEditionPda(programAddress: PublicKey,mint: PublicKey): PublicKey {
    const [masterEditionPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            programAddress.toBuffer(),
            mint.toBuffer(),
            Buffer.from('edition')
        ],
        programAddress
    );

    return masterEditionPda;
}

export function getCreamPadAccountPdaAndBump(programAddress: PublicKey, prefix: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(prefix)],
        programAddress
    )
}

export function getAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, padName: string, tokenMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            Buffer.from(padName),
            tokenMintAccount.toBuffer()
        ],
        programAddress
    )
}

export function getAuctionVaultAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}


export function getUserAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            user.toBuffer(),
        ],
        programAddress
    )
}

export function getUserAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionRoundConfig: PublicKey, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionRoundConfig.toBuffer(),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getUserAuctionBuyReceiptAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey, userBuyIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
            Buffer.from(userBuyIndex),
        ],
        programAddress
    )
}

export function getUserAuctionUnsoldDistributionAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getCollectionAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, padName: string, tokenMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            Buffer.from(padName),
            tokenMintAccount.toBuffer()
        ],
        programAddress
    )
}

export function getCollectionAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, collectionAuctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            collectionAuctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}

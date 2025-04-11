/// Prefix
import {PublicKey} from "@solana/web3.js";

const CREAM_PAD_ACCOUNT_PREFIX: string = "CPAP";

const AUCTION_ACCOUNT_PREFIX: string = "AAP";
const AUCTION_VAULT_PREFIX: string = "AVP";
const AUCTION_ROUND_ACCOUNT_PREFIX: string = "ARAP";

const USER_AUCTION_ACCOUNT_PREFIX: string = "UAAP";
const USER_AUCTION_ROUND_ACCOUNT_PREFIX: string = "UARAP";
const USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: string = "UABRAP";
const USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: string = "UAUDAP";

const COLLECTION_AUCTION_ACCOUNT_PREFIX: string = "CAAP";
const COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX: string = "CARAP";

const USER_COLLECTION_AUCTION_ACCOUNT_PREFIX: string = "UCAAP";

const USER_COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX: string = "UCARAP";

const USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: string = "UCABRAP";

const USER_COLLECTION_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: string = "UCAUDAP";


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

export function getMasterEditionPda(programAddress: PublicKey, mint: PublicKey): PublicKey {
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

export function getCreamPadAccountPdaAndBump(programAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(CREAM_PAD_ACCOUNT_PREFIX)],
        programAddress
    )
}

export function getAuctionAccountPdaAndBump(programAddress: PublicKey, padName: string, tokenMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(AUCTION_ACCOUNT_PREFIX),
            Buffer.from(padName),
            tokenMintAccount.toBuffer()
        ],
        programAddress
    )
}

export function getAuctionVaultAccountPdaAndBump(programAddress: PublicKey, auctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(AUCTION_VAULT_PREFIX),
            auctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getAuctionRoundAccountPdaAndBump(programAddress: PublicKey, auctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(AUCTION_ROUND_ACCOUNT_PREFIX),
            auctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}


export function getUserAuctionAccountPdaAndBump(programAddress: PublicKey, auctionConfig: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_AUCTION_ACCOUNT_PREFIX),
            auctionConfig.toBuffer(),
            user.toBuffer(),
        ],
        programAddress
    )
}

export function getUserAuctionRoundAccountPdaAndBump(programAddress: PublicKey, auctionRoundConfig: PublicKey, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_AUCTION_ROUND_ACCOUNT_PREFIX),
            auctionRoundConfig.toBuffer(),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getUserAuctionBuyReceiptAccountPdaAndBump(programAddress: PublicKey, userAuctionConfig: PublicKey, userBuyIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX),
            userAuctionConfig.toBuffer(),
            Buffer.from(userBuyIndex),
        ],
        programAddress
    )
}

export function getUserAuctionUnsoldDistributionAccountPdaAndBump(programAddress: PublicKey, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getCollectionAuctionAccountPdaAndBump(programAddress: PublicKey, padName: string, collectionMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(COLLECTION_AUCTION_ACCOUNT_PREFIX),
            Buffer.from(padName),
            collectionMintAccount.toBuffer()
        ],
        programAddress
    )
}

export function getCollectionAuctionRoundAccountPdaAndBump(programAddress: PublicKey, collectionAuctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX),
            collectionAuctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}

export function getUserCollectionAuctionAccountPdaAndBump(programAddress: PublicKey, collectionAuctionConfig: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_COLLECTION_AUCTION_ACCOUNT_PREFIX),
            collectionAuctionConfig.toBuffer(),
            user.toBuffer(),
        ],
        programAddress
    )
}

export function getUserCollectionAuctionRoundAccountPdaAndBump(programAddress: PublicKey, collectionAuctionRoundConfig: PublicKey, userCollectionAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX),
            collectionAuctionRoundConfig.toBuffer(),
            userCollectionAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getUserCollectionAuctionBuyReceiptAccountPdaAndBump(programAddress: PublicKey, userCollectionAuctionConfig: PublicKey, userBuyIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX),
            userCollectionAuctionConfig.toBuffer(),
            Buffer.from(userBuyIndex),
        ],
        programAddress
    )
}

export function getUserCollectionAuctionUnsoldDistributionAccountPdaAndBump(programAddress: PublicKey, userCollectionAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(USER_COLLECTION_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX),
            userCollectionAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

export function getCollectionAssetPdaAndBump(programAddress: PublicKey, collectionAuctionConfig: PublicKey, assetUuid: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            collectionAuctionConfig.toBuffer(),
            Buffer.from(assetUuid)
        ],
        programAddress
    )
}

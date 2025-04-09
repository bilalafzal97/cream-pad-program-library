import * as anchor from "@coral-xyz/anchor";
import {BN, Program} from "@coral-xyz/anchor";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Connection,
    Transaction,
    TransactionMessage
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccount,
    createMint,
    getAssociatedTokenAddress,
    mintToChecked,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToCheckedInstruction,
    getMint, getMinimumBalanceForRentExemptMint, MINT_SIZE
} from '@solana/spl-token';
import {
    PROGRAM_ID as MPL_TOKEN_METADATA_PROGRAM_ID, DataV2, Metadata, createCreateMetadataAccountV3Instruction,
    createCreateMasterEditionV3Instruction, createVerifyCollectionInstruction
} from "@metaplex-foundation/mpl-token-metadata";
import {assert} from "chai";
import {CreamPad} from "../target/types/cream_pad";
import {
    BuyEventName, ClaimDistributionEventName,
    EndRoundEventName, handleBuyEvent, handleClaimDistributionEvent,
    handleEndRoundEvent,
    handleInitializePadEvent,
    handleLockAndDistributionEvent,
    handleStartRoundEvent,
    handleUnlockUnsoldSupplyEvent,
    handleUpdatePadEvent,
    InitializePadEventName,
    LockAndDistributionEventName,
    StartRoundEventName,
    UnlockUnsoldSupplyEventName,
    UpdatePadEventName
} from "./cream-pad-event-types";
import {
    AuctionRoundStatus, AuctionRoundStatusType,
    AuctionStatus, AuctionStatusType,
    DecayModel, DecayModelType,
    ProgramStatus,
    ProgramStatusType,
    UserAuctionStatus, UserAuctionStatusType
} from "./cream-pad-enum";
import {tokensToLamports} from "./cream-pad-math";
import {
    getAuctionAccountPdaAndBump,
    getAuctionRoundAccountPdaAndBump,
    getAuctionVaultAccountPdaAndBump, getCollectionAuctionAccountPdaAndBump, getCollectionAuctionRoundAccountPdaAndBump,
    getCreamPadAccountPdaAndBump, getMasterEditionPda, getMetadataPda,
    getUserAuctionAccountPdaAndBump,
    getUserAuctionBuyReceiptAccountPdaAndBump,
    getUserAuctionRoundAccountPdaAndBump,
    getUserAuctionUnsoldDistributionAccountPdaAndBump,
} from "./cream-pad-pda";
import {
    assertAuctionAccount,
    assertAuctionRoundAccount, assertCollectionAuctionAccount, assertCollectionAuctionRoundAccount,
    assertCreamPadAccount,
    assertTokenBalance,
    assertUserAuctionAccount,
    assertUserAuctionBuyReceiptAccount,
    assertUserAuctionRoundAccount,
    assertUserAuctionUnsoldDistributionAccount
} from "./cream-pad-assert";


// Wallet Accounts
const mainSigningAuthorityPubKey: PublicKey = anchor.AnchorProvider.env().wallet.publicKey;
const feeAndRentPayerKeypair: Keypair = Keypair.generate();
const signingAuthorityKeypair: Keypair = Keypair.generate();
const backAuthorityKeypair: Keypair = Keypair.generate();
const mintAuthorityKeypair: Keypair = Keypair.generate();
const creatorKeypair: Keypair = Keypair.generate();
const feeReceiverKeypair: Keypair = Keypair.generate();
const paymentReceiverKeypair: Keypair = Keypair.generate();
const userAKeypair: Keypair = Keypair.generate();
const userBKeypair: Keypair = Keypair.generate();
const userCKeypair: Keypair = Keypair.generate();
const collectionUpdateAuthorityKeypair: Keypair = Keypair.generate();
const treasuryKeypair: Keypair = Keypair.generate();

const sellingTokenDecimal = 8;
const paymentTokenDecimal = 6;

let sellingTokenMintAccount: PublicKey;
let paymentTokenMintAccount: PublicKey;
let collectionMintAccount: PublicKey;

const collectionTokenProgramAccount: PublicKey = TOKEN_PROGRAM_ID;
const sellingTokenProgramAccount: PublicKey = TOKEN_PROGRAM_ID;
const paymentTokenProgramAccount: PublicKey = TOKEN_2022_PROGRAM_ID;

const padName = "one";
const collectionPadName = "collection";

const collectionName: string = "Cream Pad Asset Collection";
const collectionSymbol: string = "CPAC";
const collectionUrl: string = "https://creampad.com/my-collection.json";

const assetName: string = "Cream Pad Asset #";
const assetSymbol: string = "CPA";
const assetUrl: string = "https://creampad.com/my-asset/";
const assetUrlSuffix: string = ".json";

const mintingFee: number = tokensToLamports(0.01965156, 9);

describe("cream-pad", () => {

    // const boost = calculateBoost(
    //     75,
    //     50,
    //     2,
    //     2,
    //     3
    // );
    //
    // console.log("boost: ", boost);
    //
    // const newPrice = calculatePrice(
    //     4,
    //     1.2,
    //     4,
    //     1,
    //     [boost],
    //     0,
    //     3
    // );
    //
    // console.log("new Price: ", newPrice)


    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.CreamPad as Program<CreamPad>;

    const programId = program.programId;

    const delayTimeCount = 1000;

    let connection = anchor.AnchorProvider.env().connection;

    // Setup Events
    const initializePadEventListener = program.addEventListener(InitializePadEventName, handleInitializePadEvent);
    const updatePadEventListener = program.addEventListener(UpdatePadEventName, handleUpdatePadEvent);
    const endRoundEventListener = program.addEventListener(EndRoundEventName, handleEndRoundEvent);
    const startRoundEventListener = program.addEventListener(StartRoundEventName, handleStartRoundEvent);
    const lockAndDistributionEventListener = program.addEventListener(LockAndDistributionEventName, handleLockAndDistributionEvent);
    const unlockUnsoldSupplyEventListener = program.addEventListener(UnlockUnsoldSupplyEventName, handleUnlockUnsoldSupplyEvent);
    const buyEventListener = program.addEventListener(BuyEventName, handleBuyEvent);
    const claimDistributionEventListener = program.addEventListener(ClaimDistributionEventName, handleClaimDistributionEvent);

    it("setup signers accounts", async () => {
        console.log("Main Signing Authority Account: ", mainSigningAuthorityPubKey.toBase58());

        await connection.requestAirdrop(signingAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("signing authority account: ", signingAuthorityKeypair.publicKey.toBase58());
        console.log("signing authority account sol balance: ", (await connection.getBalance(signingAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(backAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("back authority account: ", backAuthorityKeypair.publicKey.toBase58());
        console.log("back authority account sol balance: ", (await connection.getBalance(backAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(feeAndRentPayerKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("fee and rent payer account: ", feeAndRentPayerKeypair.publicKey.toBase58());
        console.log("fee and rent payer account sol balance: ", (await connection.getBalance(feeAndRentPayerKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(mintAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("mint authority account: ", mintAuthorityKeypair.publicKey.toBase58());
        console.log("mint authority account sol balance: ", (await connection.getBalance(mintAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(creatorKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("creator account: ", creatorKeypair.publicKey.toBase58());
        console.log("creator account sol balance: ", (await connection.getBalance(creatorKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(feeReceiverKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("fee receiver account: ", feeReceiverKeypair.publicKey.toBase58());
        console.log("fee receiver account sol balance: ", (await connection.getBalance(feeReceiverKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(paymentReceiverKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("payment receiver account: ", paymentReceiverKeypair.publicKey.toBase58());
        console.log("payment receiver account sol balance: ", (await connection.getBalance(paymentReceiverKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(userAKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("user a account: ", userAKeypair.publicKey.toBase58());
        console.log("user a account sol balance: ", (await connection.getBalance(userAKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(userBKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("user b account: ", userBKeypair.publicKey.toBase58());
        console.log("user b account sol balance: ", (await connection.getBalance(userBKeypair.publicKey)) / LAMPORTS_PER_SOL);
    });

    it("create token mint account", async () => {
        sellingTokenMintAccount = await createMint(
            connection,
            feeAndRentPayerKeypair,
            mintAuthorityKeypair.publicKey,
            mintAuthorityKeypair.publicKey,
            sellingTokenDecimal,
            undefined,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("selling token mint account: ", sellingTokenMintAccount.toBase58());
        await delay(delayTimeCount);

        paymentTokenMintAccount = await createMint(
            connection,
            feeAndRentPayerKeypair,
            mintAuthorityKeypair.publicKey,
            mintAuthorityKeypair.publicKey,
            paymentTokenDecimal,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("payment token mint account: ", paymentTokenMintAccount.toBase58());
        await delay(delayTimeCount);

        // Mint Selling token to creator
        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            creatorKeypair.publicKey, // owner,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("create creator token account for selling token: ", creatorSellingTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintSellingTokenToCreatorTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            creatorSellingTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, sellingTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            sellingTokenDecimal, // decimals,
            undefined,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("mintSellingTokenToCreatorTx: ", mintSellingTokenToCreatorTx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, creatorSellingTokenAccount, 1000, "creator selling token balance", "creator selling token balance");

        // Mint payment token to user a
        const userAPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userAKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user a token account for payment token: ", userAPaymentTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserATx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userAPaymentTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserATx: ", mintPaymentTokenToUserATx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, userAPaymentTokenAccount, 1000, "user a payment token balance", "user a payment token balance");

        // Mint payment token to user b
        const userBPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userBKeypair.publicKey, true, paymentTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userBKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user b token account for payment token: ", userBPaymentTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserBTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userBPaymentTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserBTx: ", mintPaymentTokenToUserBTx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, userBPaymentTokenAccount, 1000, "user b payment token balance", "user b payment token balance");

    });

    it("create Collection", async () => {
        const collectionMintKeypair = Keypair.generate();
        collectionMintAccount = collectionMintKeypair.publicKey;

        const collectionMetadataPda = getMetadataPda(MPL_TOKEN_METADATA_PROGRAM_ID, collectionMintAccount);
        const collectionMasterEditionPda = getMasterEditionPda(MPL_TOKEN_METADATA_PROGRAM_ID, collectionMintAccount);

        const ata = await getAssociatedTokenAddress(collectionMintAccount, collectionUpdateAuthorityKeypair.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const data: DataV2 = {
            name: collectionName,
            symbol: collectionSymbol,
            uri: collectionUrl,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
        };

        const tx = new Transaction();

        // 1. Create Mint Account in solana
        tx.add(
            SystemProgram.createAccount({
                fromPubkey: feeAndRentPayerKeypair.publicKey,
                newAccountPubkey: collectionMintAccount,
                lamports,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID,
            }),
        );

        // 2. Create Mint Account
        tx.add(
            createInitializeMintInstruction(collectionMintAccount, 0, collectionUpdateAuthorityKeypair.publicKey, collectionUpdateAuthorityKeypair.publicKey, TOKEN_PROGRAM_ID));

        // 3. Create ATA

        tx.add(createAssociatedTokenAccountInstruction(feeAndRentPayerKeypair.publicKey, ata, collectionUpdateAuthorityKeypair.publicKey, collectionMintAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));

        // 4. Mint token to ATA
        tx.add(createMintToCheckedInstruction(collectionMintAccount, ata, collectionUpdateAuthorityKeypair.publicKey, 1, 0, undefined, TOKEN_PROGRAM_ID));


        // 5. Create Metadata
        tx.add(
            createCreateMetadataAccountV3Instruction({
                metadata: collectionMetadataPda,
                mint: collectionMintAccount,
                mintAuthority: collectionUpdateAuthorityKeypair.publicKey,
                payer: feeAndRentPayerKeypair.publicKey,
                updateAuthority: collectionUpdateAuthorityKeypair.publicKey,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            }, {
                createMetadataAccountArgsV3: {
                    data: data,
                    isMutable: true,
                    collectionDetails: null
                }
            })
        );

        // 6. Create Master Edition
        tx.add(
            createCreateMasterEditionV3Instruction({
                edition: collectionMasterEditionPda,
                mint: collectionMintAccount,
                updateAuthority: collectionUpdateAuthorityKeypair.publicKey,
                mintAuthority: collectionUpdateAuthorityKeypair.publicKey,
                payer: feeAndRentPayerKeypair.publicKey,
                metadata: collectionMetadataPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            }, {
                createMasterEditionArgs: {
                    maxSupply: 0,
                },
            })
        );

        const txHash = await connection.sendTransaction(tx, [feeAndRentPayerKeypair, collectionUpdateAuthorityKeypair, collectionMintKeypair]);

        console.log("Your transaction signature", txHash);

        await delay(delayTimeCount);
    });

    it("create Asset", async () => {
        const assetMintKeypair = Keypair.generate();

        const collectionMetadataPda = getMetadataPda(MPL_TOKEN_METADATA_PROGRAM_ID, collectionMintAccount);
        const collectionMasterEditionPda = getMasterEditionPda(MPL_TOKEN_METADATA_PROGRAM_ID, collectionMintAccount);

        const assetMetadataPda = getMetadataPda(MPL_TOKEN_METADATA_PROGRAM_ID, assetMintKeypair.publicKey);
        const assetMasterEditionPda = getMasterEditionPda(MPL_TOKEN_METADATA_PROGRAM_ID, assetMintKeypair.publicKey);

        const ata = await getAssociatedTokenAddress(assetMintKeypair.publicKey, userCKeypair.publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        const lamports = await getMinimumBalanceForRentExemptMint(connection);

        const data: DataV2 = {
            name: assetName + "1",
            symbol: assetSymbol,
            uri: assetUrl + "1" + assetUrlSuffix,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: {
                verified: false,
                key: collectionMintAccount
            },
            uses: null,
        };

        const tx = new Transaction();

        // 1. Create Mint Account in solana
        tx.add(
            SystemProgram.createAccount({
                fromPubkey: feeAndRentPayerKeypair.publicKey,
                newAccountPubkey: assetMintKeypair.publicKey,
                lamports,
                space: MINT_SIZE,
                programId: TOKEN_PROGRAM_ID,
            }),
        );

        // 2. Create Mint Account
        tx.add(
            createInitializeMintInstruction(assetMintKeypair.publicKey, 0, collectionUpdateAuthorityKeypair.publicKey, collectionUpdateAuthorityKeypair.publicKey, TOKEN_PROGRAM_ID));

        // 3. Create ATA

        tx.add(createAssociatedTokenAccountInstruction(feeAndRentPayerKeypair.publicKey, ata, userCKeypair.publicKey, assetMintKeypair.publicKey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));

        // 4. Mint token to ATA
        tx.add(createMintToCheckedInstruction(assetMintKeypair.publicKey, ata, collectionUpdateAuthorityKeypair.publicKey, 1, 0, undefined, TOKEN_PROGRAM_ID));


        // 5. Create Metadata
        tx.add(
            createCreateMetadataAccountV3Instruction({
                metadata: assetMetadataPda,
                mint: assetMintKeypair.publicKey,
                mintAuthority: collectionUpdateAuthorityKeypair.publicKey,
                payer: feeAndRentPayerKeypair.publicKey,
                updateAuthority: collectionUpdateAuthorityKeypair.publicKey,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            }, {
                createMetadataAccountArgsV3: {
                    data: data,
                    isMutable: true,
                    collectionDetails: null
                }
            })
        );

        // 6. Create Master Edition
        tx.add(
            createCreateMasterEditionV3Instruction({
                edition: assetMasterEditionPda,
                mint: assetMintKeypair.publicKey,
                updateAuthority: collectionUpdateAuthorityKeypair.publicKey,
                mintAuthority: collectionUpdateAuthorityKeypair.publicKey,
                payer: feeAndRentPayerKeypair.publicKey,
                metadata: assetMetadataPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            }, {
                createMasterEditionArgs: {
                    maxSupply: 0,
                },
            })
        );

        // 7. Verify collection
        tx.add(
            createVerifyCollectionInstruction({
                metadata: assetMetadataPda,
                collectionAuthority: collectionUpdateAuthorityKeypair.publicKey,
                payer: feeAndRentPayerKeypair.publicKey,
                collectionMint: collectionMintAccount,
                collection: collectionMetadataPda,
                collectionMasterEditionAccount: collectionMasterEditionPda,
            })
        );

        const txHash = await connection.sendTransaction(tx, [feeAndRentPayerKeypair, collectionUpdateAuthorityKeypair, assetMintKeypair]);

        console.log("Your transaction signature", txHash);

        await delay(delayTimeCount);
    });

    it("initialize program config", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const tx = await program.methods.initialize({
            backAuthority: backAuthorityKeypair.publicKey,
            isBackAuthorityRequired: true,
            isFeeRequired: true,
            feeBasePoint: 100,
            feeReceiver: feeReceiverKeypair.publicKey,
            roundLimit: 100,
            distributionBasePoint: 5000,
            lockBasePoint: 5000,
            lockDuration: new BN(5),
            mintingFee: new BN(mintingFee),
            treasury: treasuryKeypair.publicKey,
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                signingAuthority: signingAuthorityKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            })
            .signers([feeAndRentPayerKeypair, signingAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertCreamPadAccount(
            program,
            creamPadConfigPda,
            signingAuthorityKeypair.publicKey,
            backAuthorityKeypair.publicKey,
            true,
            ProgramStatus.Normal,
            true,
            100,
            feeReceiverKeypair.publicKey,
            100,
            5000,
            5000,
            new BN(5),
            new BN(mintingFee),
            treasuryKeypair.publicKey
        );
    });

    it("update program config", async () => {

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());


        const tx = await program.methods.updateConfig({
            backAuthority: backAuthorityKeypair.publicKey,
            isBackAuthorityRequired: true,
            isFeeRequired: true,
            feeBasePoint: 2500,
            feeReceiver: feeReceiverKeypair.publicKey,
            roundLimit: 100,
            programStatus: ProgramStatus.Normal,
            distributionBasePoint: 5000,
            lockBasePoint: 5000,
            lockDuration: new BN(5),
            mintingFee: new BN(mintingFee),
            treasury: treasuryKeypair.publicKey,
            creamPadConfigBump: creamPadConfigBump,
        })
            .accounts({
                signingAuthority: signingAuthorityKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
            })
            .signers([signingAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertCreamPadAccount(
            program,
            creamPadConfigPda,
            signingAuthorityKeypair.publicKey,
            backAuthorityKeypair.publicKey,
            true,
            ProgramStatus.Normal,
            true,
            2500,
            feeReceiverKeypair.publicKey,
            100,
            5000,
            5000,
            new BN(5),
            new BN(mintingFee),
            treasuryKeypair.publicKey
        );
    });

    it("Initialize Pad Config", async () => {
        const roundIndex = "1";

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());

        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("creatorSellingTokenAccount: ", creatorSellingTokenAccount.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());


        const tx = await program.methods.initializePad({
            paymentMint: paymentTokenMintAccount,
            paymentReceiver: paymentReceiverKeypair.publicKey,
            p0: new BN(tokensToLamports(4, 9).toString()),
            ptmax: new BN(tokensToLamports(1.2, 9).toString()),
            tmax: 2,
            omega: new BN(tokensToLamports(2, 9).toString()),
            alpha: new BN(tokensToLamports(2, 9).toString()),
            timeShiftMax: new BN(2),
            roundDuration: new BN(5),
            supply: new BN(tokensToLamports(200, 9).toString()),
            decayModel: DecayModel.Linear,
            haveBuyLimit: true,
            buyLimit: new BN(tokensToLamports(100, 9).toString()),
            padName: padName,
            creamPadConfigBump: creamPadConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                backAuthority: backAuthorityKeypair.publicKey,
                creator: creatorKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionConfigTokenAccount: auctionConfigSellingTokenAccount,
                creatorTokenAccount: creatorSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            })
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0)
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.lastBlockTimestamp,
            auctionRoundData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(0),
            new BN(0),
            1,
            new BN(0),
            true,
            new BN(tokensToLamports(100, 9).toString())
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 200, "Auction Config Selling token account", "Auction Config Selling token account")
    });

    it("update Pad Config", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());


        const tx = await program.methods.updatePad({
            paymentReceiver: paymentReceiverKeypair.publicKey,
            padName: padName,
            auctionConfigBump: auctionConfigBump
        })
            .accounts({
                creator: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([creatorKeypair, backAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0)
        );
    });

    it("Buy user a - 1", async () => {
        const roundIndex = "1";
        const userBuyIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());

        const userSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, userAKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("userSellingTokenAccount: ", userSellingTokenAccount.toBase58());

        const userPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("userPaymentTokenAccount: ", userPaymentTokenAccount.toBase58());

        const paymentReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, paymentReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("paymentReceiverPaymentTokenAccount: ", paymentReceiverPaymentTokenAccount.toBase58());

        const feeReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, feeReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("feeReceiverPaymentTokenAccount: ", feeReceiverPaymentTokenAccount.toBase58());

        const [userAuctionConfigPda] = getUserAuctionAccountPdaAndBump(programId, auctionConfigPda, userAKeypair.publicKey);
        console.log("userAuctionConfigPda: ", userAuctionConfigPda.toBase58());

        const [userAuctionRoundConfigPda] = getUserAuctionRoundAccountPdaAndBump(programId, auctionRoundConfigPda, userAuctionConfigPda);
        console.log("userAuctionRoundConfigPda: ", userAuctionRoundConfigPda.toBase58());

        const [userAuctionBuyReceiptConfigPda] = getUserAuctionBuyReceiptAccountPdaAndBump(programId, userAuctionConfigPda, userBuyIndex);
        console.log("userAuctionBuyReceiptConfigPda: ", userAuctionBuyReceiptConfigPda.toBase58());

        const tx = await program.methods.buy({
            padName: padName,
            currentRoundIndex: roundIndex,
            buyIndex: userBuyIndex,
            amount: new BN(tokensToLamports(75, 9)),
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                user: userAKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                userAuctionConfig: userAuctionConfigPda,
                userAuctionRoundConfig: userAuctionRoundConfigPda,
                userAuctionBuyReceiptConfig: userAuctionBuyReceiptConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                paymentTokenMintAccount: paymentTokenMintAccount,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 1: Back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                },
                // index 2: token program
                {
                    pubkey: sellingTokenProgramAccount,
                    isWritable: false,
                    isSigner: false
                },
                // index 3: payment token program
                {
                    pubkey: paymentTokenProgramAccount,
                    isWritable: false,
                    isSigner: false
                },
                // index 4: associated token program
                {
                    pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
                    isWritable: false,
                    isSigner: false
                },
                // index 5: user payment token program
                {
                    pubkey: userPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 6: user token program
                {
                    pubkey: userSellingTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 7: auction config token program
                {
                    pubkey: auctionConfigSellingTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 8: payment receiver
                {
                    pubkey: paymentReceiverKeypair.publicKey,
                    isWritable: false,
                    isSigner: false
                },
                // index 9: payment receiver token account
                {
                    pubkey: paymentReceiverPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 10: fee receiver
                {
                    pubkey: feeReceiverKeypair.publicKey,
                    isWritable: false,
                    isSigner: false
                },
                // index 11: fee receiver token account
                {
                    pubkey: feeReceiverPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
            ])

            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, userAKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            1,
            new BN(0),
            true,
            new BN(tokensToLamports(100, 9).toString())
        );

        await assertUserAuctionAccount(
            program,
            userAuctionConfigPda,
            userAKeypair.publicKey,
            new BN(1),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            UserAuctionStatus.None
        );

        await assertUserAuctionRoundAccount(
            program,
            userAuctionRoundConfigPda,
            new BN(1),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            1
        );

        await assertUserAuctionBuyReceiptAccount(
            program,
            userAuctionBuyReceiptConfigPda,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            1,
            new BN(1)
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 125, "Auction Config Selling token account", "Auction Config Selling token account");

        await assertTokenBalance(connection, userSellingTokenAccount, 75, "User Selling token account", "User Selling token account");

        await assertTokenBalance(connection, userPaymentTokenAccount, 700, "User Payment token account", "User Payment token account");

        await assertTokenBalance(connection, paymentReceiverPaymentTokenAccount, 225, "Payment Receiver Payment token account", "Payment Receiver Payment token account");

        await assertTokenBalance(connection, feeReceiverPaymentTokenAccount, 75, "Fee Receiver Payment token account", "Fee Receiver Payment token account");
    });


    it("End Round 1", async () => {
        await delay(5000);

        const roundIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());


        const tx = await program.methods.endRound({
            padName: padName,
            roundIndex: roundIndex,
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                ender: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Ended,
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            1,
            auctionRoundData.roundEndedAt,
            true,
            new BN(tokensToLamports(100, 9).toString())
        );
    });

    it("Start Round 2", async () => {
        const previousRoundIndex = "1";
        const nextRoundIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [previousAuctionRoundConfigPda, previousAuctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, previousRoundIndex);
        console.log("previousAuctionRoundConfigPda: ", previousAuctionRoundConfigPda.toBase58());

        const [nextAuctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, nextRoundIndex);
        console.log("nextAuctionRoundConfigPda: ", nextAuctionRoundConfigPda.toBase58());

        const tx = await program.methods.startNextRound({
            padName: padName,
            previousRoundIndex: previousRoundIndex,
            nextRoundIndex: nextRoundIndex,
            nextRoundDuration: new BN(5),
            nextHaveBuyLimit: true,
            nextBuyLimit: new BN(tokensToLamports(100, 9).toString()),
            auctionConfigBump: auctionConfigBump,
            previousAuctionRoundConfigBump: previousAuctionRoundConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                starter: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                previousAuctionRoundConfig: previousAuctionRoundConfigPda,
                nextAuctionRoundConfig: nextAuctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(nextAuctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            nextAuctionRoundConfigPda,
            auctionRoundData.lastBlockTimestamp,
            auctionRoundData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(1.2, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(0),
            new BN(0),
            2,
            new BN(0),
            true,
            new BN(tokensToLamports(100, 9).toString())
        );
    });

    it("End Round 2", async () => {
        await delay(5000);

        const roundIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());


        const tx = await program.methods.endRound({
            padName: padName,
            roundIndex: roundIndex,
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                ender: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Ended,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(1.2, 9).toString()),
            AuctionRoundStatus.Ended,
            new BN(0),
            new BN(0),
            2,
            auctionRoundData.roundEndedAt,
            true,
            new BN(tokensToLamports(100, 9).toString())
        );
    });

    it("lock and distribute", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionVaultConfigPda, auctionVaultConfigBump] = getAuctionVaultAccountPdaAndBump(programId, auctionConfigPda);
        console.log("auctionVaultConfigPda: ", auctionVaultConfigPda.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());

        const auctionVaultConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionVaultConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionVaultConfigSellingTokenAccount: ", auctionVaultConfigSellingTokenAccount.toBase58());

        const tx = await program.methods.lockAndDistribute({
            padName: padName,
            auctionConfigBump: auctionConfigBump,
            auctionVaultConfigBump: auctionVaultConfigBump,
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                supplyLocker: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionVaultConfig: auctionVaultConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionConfigTokenAccount: auctionConfigSellingTokenAccount,
                auctionVaultConfigTokenAccount: auctionVaultConfigSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        const auctionConfigData = await program.account.auctionAccount.fetch(auctionConfigPda);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.UnsoldLockedAndDistributionOpen,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(tokensToLamports(62.5, 9).toString()),
            auctionConfigData.lastBlockTimestamp,
            auctionConfigData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 62.5, "Auction Config Selling Token Account", "Auction Config Selling Token Account");

        await assertTokenBalance(connection, auctionVaultConfigSellingTokenAccount, 62.5, "Auction vault Config Selling Token Account", "Auction vault Config Selling Token Account");
    });

    it("unlock unsold supply", async () => {
        await delay(5000);

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionVaultConfigPda, auctionVaultConfigBump] = getAuctionVaultAccountPdaAndBump(programId, auctionConfigPda);
        console.log("auctionVaultConfigPda: ", auctionVaultConfigPda.toBase58());

        const auctionVaultConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionVaultConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionVaultConfigSellingTokenAccount: ", auctionVaultConfigSellingTokenAccount.toBase58());

        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("creatorSellingTokenAccount: ", creatorSellingTokenAccount.toBase58());


        const tx = await program.methods.unlockUnsoldSupply({
            padName: padName,
            auctionConfigBump: auctionConfigBump,
            auctionVaultConfigBump: auctionVaultConfigBump,
        })
            .accounts({
                creator: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionVaultConfig: auctionVaultConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionVaultConfigTokenAccount: auctionVaultConfigSellingTokenAccount,
                creatorTokenAccount: creatorSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        const auctionConfigData = await program.account.auctionAccount.fetch(auctionConfigPda);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.UnsoldUnlocked,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(tokensToLamports(62.5, 9).toString()),
            auctionConfigData.unsoldSupplyLockedAt,
            auctionConfigData.unsoldSupplyCanUnlockAt,
            auctionConfigData.unsoldSupplyUnlockedAt,
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        await assertTokenBalance(connection, auctionVaultConfigSellingTokenAccount, 0, "Auction vault Config Selling Token Account", "Auction vault Config Selling Token Account");


        await assertTokenBalance(connection, creatorSellingTokenAccount, 862.5, "Creator Selling Token Account", "Creator Selling Token Account");
    });

    // Collection
    it("Initialize Collection Pad Config", async () => {
        const roundIndex = "1";

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(program.programId);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [collectionAuctionConfigPda] = getCollectionAuctionAccountPdaAndBump(program.programId, collectionPadName, collectionMintAccount);
        console.log("collectionAuctionConfigPda: ", collectionAuctionConfigPda.toBase58());

        const [collectionAuctionRoundConfigPda] = getCollectionAuctionRoundAccountPdaAndBump(programId, collectionAuctionConfigPda, roundIndex);
        console.log("collectionAuctionRoundConfigPda: ", collectionAuctionRoundConfigPda.toBase58());


        const collectionMetadataPda = getMetadataPda(MPL_TOKEN_METADATA_PROGRAM_ID, collectionMintAccount);
        console.log("collectionMetadataPda: ", collectionMetadataPda.toBase58());

        const tx = await program.methods.initializeCollectionPad({
            paymentMint: paymentTokenMintAccount,
            paymentReceiver: paymentReceiverKeypair.publicKey,
            p0: new BN(tokensToLamports(4, 9).toString()),
            ptmax: new BN(tokensToLamports(1.2, 9).toString()),
            tmax: 2,
            omega: new BN(tokensToLamports(2, 9).toString()),
            alpha: new BN(tokensToLamports(2, 9).toString()),
            timeShiftMax: new BN(2),
            roundDuration: new BN(5),
            supply: new BN(30),
            decayModel: DecayModel.Linear,
            startingIndex: new BN(1),
            haveBuyLimit: true,
            buyLimit: new BN(6),
            sellerFeeBasisPoints: 500,
            assetCreators: [{
                address: creatorKeypair.publicKey,
                share: 50
            }, {address: collectionUpdateAuthorityKeypair.publicKey, share: 50}, {
                address: collectionAuctionConfigPda,
                share: 0
            }],
            assetName: assetName,
            assetSymbol: assetSymbol,
            assetUrl: assetUrl,
            assetUrlSuffix: assetUrlSuffix,
            padName: collectionPadName,
            creamPadConfigBump: creamPadConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                backAuthority: backAuthorityKeypair.publicKey,
                creator: creatorKeypair.publicKey,
                currentCollectionUpdateAuthority: collectionUpdateAuthorityKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
                collectionAuctionConfig: collectionAuctionConfigPda,
                collectionAuctionRoundConfig: collectionAuctionRoundConfigPda,
                collectionMintAccount: collectionMintAccount,
                tokenProgram: collectionTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID
            })
            .remainingAccounts([
                // 0: collection metadata pda
                {
                    pubkey: collectionMetadataPda,
                    isWritable: true,
                    isSigner: false
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair, collectionUpdateAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertCollectionAuctionAccount(
            program,
            collectionAuctionConfigPda,
            creatorKeypair.publicKey,
            collectionMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            500,
            [{address: creatorKeypair.publicKey, share: 50}, {
                address: collectionUpdateAuthorityKeypair.publicKey,
                share: 50
            }, {address: collectionAuctionConfigPda, share: 0}],
            new BN(30),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(1),
            new BN(31),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            assetName,
            assetSymbol,
            assetUrl,
            assetUrlSuffix
        );

        const auctionRoundData = await program.account.collectionAuctionRoundAccount.fetch(collectionAuctionRoundConfigPda);

        await assertCollectionAuctionRoundAccount(
            program,
            collectionAuctionRoundConfigPda,
            auctionRoundData.lastBlockTimestamp,
            auctionRoundData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(0),
            new BN(0),
            1,
            new BN(0),
            true,
            new BN(6)
        );
    });

    it("Remove Events", async () => {
        await delay(delayTimeCount);

        await program.removeEventListener(initializePadEventListener);
        await program.removeEventListener(updatePadEventListener);
        await program.removeEventListener(endRoundEventListener);
        await program.removeEventListener(startRoundEventListener);
        await program.removeEventListener(lockAndDistributionEventListener);
        await program.removeEventListener(unlockUnsoldSupplyEventListener);
        await program.removeEventListener(buyEventListener);
        await program.removeEventListener(claimDistributionEventListener);
    });
});

/// Helper
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



import * as anchor from "@coral-xyz/anchor";
import {BN, Program} from "@coral-xyz/anchor";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccount,
    createMint,
    getAssociatedTokenAddress,
    mintToChecked,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getMint
} from '@solana/spl-token';
import {assert} from "chai";
import {CreamPad} from "../target/types/cream_pad";

/// ENUMS
class ProgramStatus {
    static readonly Normal = {normal: {}};
    static readonly Halted = {halted: {}};
}

class DecayModelType {
    static readonly Linear = {linear: {}};
    static readonly Exponential = {exponential: {}};
}

/// Prefix
const CREAM_PAD_ACCOUNT_PREFIX: string = "CPAP";

const AUCTION_ACCOUNT_PREFIX: string = "AAP";
const AUCTION_VAULT_PREFIX: string = "AAP";
const AUCTION_ROUND_ACCOUNT_PREFIX: string = "ARAP";

const USER_AUCTION_ACCOUNT_PREFIX: string = "UAAP";
const USER_AUCTION_ROUND_ACCOUNT_PREFIX: string = "UARAP";
const USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: string = "UABRAP";
const USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: string = "UAUDAP";

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

const sellingTokenDecimal = 8;
const paymentTokenDecimal = 6;

let sellingTokenMintAccount: PublicKey;
let paymentTokenMintAccount: PublicKey;

const sellingTokenProgramAccount: PublicKey = TOKEN_PROGRAM_ID;
const paymentTokenProgramAccount: PublicKey = TOKEN_2022_PROGRAM_ID;

const padName = "one";

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
        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            creatorKeypair.publicKey, // owner,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("create creator token account for selling token: ", (await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount)).toBase58());
        await delay(delayTimeCount);

        let mintSellingTokenToCreatorTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            (await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount)), // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, sellingTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            sellingTokenDecimal, // decimals,
            undefined,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("mintSellingTokenToCreatorTx: ", mintSellingTokenToCreatorTx);
        await delay(delayTimeCount);

        console.log("creator selling token balance: ", await connection.getTokenAccountBalance(((await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount)))));

        // Mint payment token to user a
        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userAKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user a token account for payment token: ", (await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount)).toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserATx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            (await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount)), // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserATx: ", mintPaymentTokenToUserATx);
        await delay(delayTimeCount);

        console.log("user a payment token balance: ", await connection.getTokenAccountBalance(((await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount)))));

        // Mint payment token to user b
        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userBKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user b token account for payment token: ", (await getAssociatedTokenAddress(paymentTokenMintAccount, userBKeypair.publicKey, true, paymentTokenProgramAccount)).toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserBTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            (await getAssociatedTokenAddress(paymentTokenMintAccount, userBKeypair.publicKey, true, paymentTokenProgramAccount)), // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserBTx: ", mintPaymentTokenToUserBTx);
        await delay(delayTimeCount);

        console.log("user b payment token balance: ", await connection.getTokenAccountBalance(((await getAssociatedTokenAddress(paymentTokenMintAccount, userBKeypair.publicKey, true, paymentTokenProgramAccount)))));
    });

    it("initialize program config", async () => {

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(programId, CREAM_PAD_ACCOUNT_PREFIX);
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
            lockDuration: new BN(10)
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

        await assertCreamPadAccount(program, creamPadConfigPda, signingAuthorityKeypair.publicKey, backAuthorityKeypair.publicKey);
    });

    it("update program config", async () => {

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
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
            lockDuration: new BN(10),
            creamPadConfigBump: creamPadConfigBump
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

        // await assertAuctionAccount(program, auction)
    });

    it("Initialize Pad Config", async () => {
        const roundIndex = "1";

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
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
            tmax: 4,
            omega: new BN(tokensToLamports(2, 9).toString()),
            alpha: new BN(tokensToLamports(2, 9).toString()),
            timeShiftMax: new BN(2),
            roundDuration: new BN(5),
            supply: new BN(tokensToLamports(200, 9).toString()),
            decayModel: DecayModelType.Linear,
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);

        await assertAuctionRoundAccount(program, auctionRoundConfigPda);
    });

    it("update Pad Config", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);
    });

    it("Buy user a - 1", async () => {
        const roundIndex = "1";
        const userBuyIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
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

        const [userAuctionConfigPda] = getUserAuctionAccountPdaAndBump(programId, USER_AUCTION_ACCOUNT_PREFIX, auctionConfigPda, userAKeypair.publicKey);
        console.log("userAuctionConfigPda: ", userAuctionConfigPda.toBase58());

        const [userAuctionRoundConfigPda] = getUserAuctionRoundAccountPdaAndBump(programId, USER_AUCTION_ROUND_ACCOUNT_PREFIX, auctionRoundConfigPda, userAuctionConfigPda);
        console.log("userAuctionRoundConfigPda: ", userAuctionRoundConfigPda.toBase58());

        const [userAuctionBuyReceiptConfigPda] = getUserAuctionBuyReceiptAccountPdaAndBump(programId, USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX, userAuctionConfigPda, userBuyIndex);
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);

        await assertAuctionRoundAccount(program, auctionRoundConfigPda);

        await assertUserAuctionAccount(program, userAuctionConfigPda);

        await assertUserAuctionRoundAccount(program, userAuctionRoundConfigPda);

        await assertUserAuctionBuyReceiptAccountt(program, userAuctionBuyReceiptConfigPda);


        console.log("auction config balance: ", (await connection.getTokenAccountBalance(auctionConfigSellingTokenAccount)));
        console.log("user sell balance: ", (await connection.getTokenAccountBalance(userSellingTokenAccount)));
        console.log("user payment balance: ", (await connection.getTokenAccountBalance(userPaymentTokenAccount)));
        console.log("payment receiver balance: ", (await connection.getTokenAccountBalance(paymentReceiverPaymentTokenAccount)));
        console.log("fee receiver balance: ", (await connection.getTokenAccountBalance(feeReceiverPaymentTokenAccount)));
    });

    it("End Round", async () => {
        await delay(5000);

        const roundIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);

        await assertAuctionRoundAccount(program, auctionRoundConfigPda);
    });

    it("Start Round 2", async () => {
        const previousRoundIndex = "1";
        const nextRoundIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [previousAuctionRoundConfigPda, previousAuctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, previousRoundIndex);
        console.log("previousAuctionRoundConfigPda: ", previousAuctionRoundConfigPda.toBase58());

        const [nextAuctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, nextRoundIndex);
        console.log("nextAuctionRoundConfigPda: ", nextAuctionRoundConfigPda.toBase58());

        const tx = await program.methods.startNextRound({
            padName: padName,
            previousRoundIndex: previousRoundIndex,
            nextRoundIndex: nextRoundIndex,
            nextRoundDuration: new BN(10),
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);

        await assertAuctionRoundAccount(program, nextAuctionRoundConfigPda);
    });

    it("Buy user a - 2", async () => {
        const roundIndex = "2";
        const userBuyIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
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

        const [userAuctionConfigPda] = getUserAuctionAccountPdaAndBump(programId, USER_AUCTION_ACCOUNT_PREFIX, auctionConfigPda, userAKeypair.publicKey);
        console.log("userAuctionConfigPda: ", userAuctionConfigPda.toBase58());

        const [userAuctionRoundConfigPda] = getUserAuctionRoundAccountPdaAndBump(programId, USER_AUCTION_ROUND_ACCOUNT_PREFIX, auctionRoundConfigPda, userAuctionConfigPda);
        console.log("userAuctionRoundConfigPda: ", userAuctionRoundConfigPda.toBase58());

        const [userAuctionBuyReceiptConfigPda] = getUserAuctionBuyReceiptAccountPdaAndBump(programId, USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX, userAuctionConfigPda, userBuyIndex);
        console.log("userAuctionBuyReceiptConfigPda: ", userAuctionBuyReceiptConfigPda.toBase58());

        const tx = await program.methods.buy({
            padName: padName,
            currentRoundIndex: roundIndex,
            buyIndex: userBuyIndex,
            amount: new BN(tokensToLamports(1, 9)),
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

        await assertAuctionAccount(program, auctionConfigPda, creatorKeypair.publicKey);

        await assertAuctionRoundAccount(program, auctionRoundConfigPda);

        await assertUserAuctionAccount(program, userAuctionConfigPda);

        await assertUserAuctionRoundAccount(program, userAuctionRoundConfigPda);

        await assertUserAuctionBuyReceiptAccountt(program, userAuctionBuyReceiptConfigPda);


        console.log("auction config balance: ", (await connection.getTokenAccountBalance(auctionConfigSellingTokenAccount)));
        console.log("user sell balance: ", (await connection.getTokenAccountBalance(userSellingTokenAccount)));
        console.log("user payment balance: ", (await connection.getTokenAccountBalance(userPaymentTokenAccount)));
        console.log("payment receiver balance: ", (await connection.getTokenAccountBalance(paymentReceiverPaymentTokenAccount)));
        console.log("fee receiver balance: ", (await connection.getTokenAccountBalance(feeReceiverPaymentTokenAccount)));
    });

});

/// Helper
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

////// PDAs

function getCreamPadAccountPdaAndBump(programAddress: PublicKey, prefix: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(prefix)],
        programAddress
    )
}

function getAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, padName: string, tokenMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            Buffer.from(padName),
            tokenMintAccount.toBuffer()
        ],
        programAddress
    )
}

function getAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}


function getUserAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            user.toBuffer(),
        ],
        programAddress
    )
}

function getUserAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionRoundConfig: PublicKey, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionRoundConfig.toBuffer(),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

function getUserAuctionBuyReceiptAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey, userBuyIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
            Buffer.from(userBuyIndex),
        ],
        programAddress
    )
}

function getUserAuctionUnsoldDistributionAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

///// Assert
async function assertCreamPadAccount(program: Program<CreamPad>, pdaAddress: PublicKey, signingAuthority: PublicKey, backAuthority: PublicKey,) {
    const data = await program.account.creamPadAccount.fetch(pdaAddress);

    console.log("Cream pad account: >>>>>>>> ", data);

    assert(data.signingAuthority.toBase58() === signingAuthority.toBase58(), "Cream Pad -> signingAuthority");
    assert(data.backAuthority.toBase58() === backAuthority.toBase58(), "Cream Pad -> backAuthority");
}

async function assertAuctionAccount(program: Program<CreamPad>, pdaAddress: PublicKey, creator: PublicKey) {
    const data = await program.account.auctionAccount.fetch(pdaAddress);

    console.log("Auction account: >>>>>>>> ", data);

    assert(data.creator.toBase58() === creator.toBase58(), "Cream Pad -> creator");

    console.log("Current price!: ", lamportsToTokens(data.currentPrice.toNumber(), 9));
    console.log("total payment!: ", lamportsToTokens(data.totalPayment.toNumber(), 9));
    console.log("total fee!: ", lamportsToTokens(data.totalFee.toNumber(), 9));
}


async function assertAuctionRoundAccount(program: Program<CreamPad>, pdaAddress: PublicKey) {
    const data = await program.account.auctionRoundAccount.fetch(pdaAddress);

    console.log("Auction round account: >>>>>>>> ", data);

    console.log("Current boot!: ", data.boost.toNumber());
}

async function assertUserAuctionAccount(program: Program<CreamPad>, pdaAddress: PublicKey) {
    const data = await program.account.userAuctionAccount.fetch(pdaAddress);

    console.log("User auction account: >>>>>>>> ", data);
}


async function assertUserAuctionRoundAccount(program: Program<CreamPad>, pdaAddress: PublicKey) {
    const data = await program.account.userAuctionRoundAccount.fetch(pdaAddress);

    console.log("User auction round account: >>>>>>>> ", data);
}

async function assertUserAuctionBuyReceiptAccountt(program: Program<CreamPad>, pdaAddress: PublicKey) {
    const data = await program.account.userAuctionBuyReceiptAccount.fetch(pdaAddress);

    console.log("User auction buy receipt account: >>>>>>>> ", data);
}

async function assertUserAuctionUnsoldDistributionAccount(program: Program<CreamPad>, pdaAddress: PublicKey) {
    const data = await program.account.userAuctionUnsoldDistributionAccount.fetch(pdaAddress);

    console.log("User auction unsold distribution account: >>>>>>>> ", data);
}

///// MATH

function calculateBoost(
    actualSales: number,
    expectedSales: number,
    omega: number,
    alpha: number,
    timeShiftMax: number
): number {
    if (expectedSales === 0) return 0; // Prevent division by zero
    const ratio = Math.floor((actualSales * omega) / expectedSales);
    return Math.min(alpha * ratio, timeShiftMax);
}

function calculatePrice(
    p0: number,
    ptmax: number,
    tMax: number,
    currentRound: number,
    boostHistory: number[],
    decayModel: number,
    timeShiftMax: number
): number {
    let totalBoost = 0;

    // ✅ Fix: Correctly apply boost by shifting the time effect
    for (let i = 0; i < currentRound; i++) {
        totalBoost += 1 - Math.min(boostHistory[i] || 0, timeShiftMax);
    }

    if (decayModel === 0) { // Linear decay
        const k0 = (p0 - ptmax) / (tMax - 1); // ✅ Fix: Use `tMax - 1` instead of `tMax`
        return Math.max(p0 - k0 * totalBoost, ptmax);
    } else { // Exponential decay
        if (p0 <= ptmax) return ptmax; // Prevent log errors

        const lambda0 = (Math.log(p0) - Math.log(ptmax)) / (tMax - 1);
        return Math.max(p0 * Math.exp(-lambda0 * totalBoost), ptmax);
    }
}

function adjustAmount(amount: number, fromDecimals: number, toDecimals: number): number {
    const factor = Math.pow(10, Math.abs(toDecimals - fromDecimals));

    return toDecimals > fromDecimals
        ? amount * factor
        : Math.floor(amount / factor); // Use floor to avoid floating-point precision errors
}

function calculateTotalPrice(
    amount: number,
    price: number,
    fromDecimals: number,
    toDecimals: number,
    outputDecimals: number
): number {
    const adjustedAmount = adjustAmount(amount, fromDecimals, toDecimals);
    const totalPrice = BigInt(adjustedAmount) * BigInt(price);
    const divisor = BigInt(Math.pow(10, outputDecimals));

    return Number(totalPrice / divisor);
}

function lamportsToTokens(lamports: number, mintDecimals: number): number {
    return lamports / 10 ** mintDecimals;
}

// console.log(lamportsToTokens(2500000000n, 9)); // 2.5 tokens

function tokensToLamports(amount: number, mintDecimals: number): number {
    return amount * (10 ** mintDecimals);
}

// console.log(tokensToLamports(2.5, 9)); // 2500000000 lamports (2.5 tokens with 9 decimals)



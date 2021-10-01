const assert = require("assert");
const anchor = require("@project-serum/anchor");
const { SystemProgram } = anchor.web3;

describe("visitors", () => {
  // Use a local provider.
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Visitors;

  const visitor = anchor.web3.Keypair.generate();

  let visitorState, visitorBump;
  before(async () => {
    const [_visitorState, _visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
      [visitor.publicKey.toBuffer()],
      program.programId
    );
    visitorState = _visitorState;
    visitorBump = _visitorBump;
  });

  it("It works!", async () => {
    await program.rpc.introduceYourself(new anchor.BN(visitorBump),
      {
        accounts: {
          payer: provider.wallet.payer.publicKey,
          visitor: visitor.publicKey,
          visitorState: visitorState,
          systemProgram: anchor.web3.SystemProgram.programId
        },
        signers: [visitor]
      }
    );

    let visitorStateAccount = await program.account.visitorState.fetch(visitorState);
    assert.equal(1, visitorStateAccount.visitCount.toNumber());

    async function visit() {
      await provider.connection.confirmTransaction(
        await program.rpc.visit(
          {
            accounts: {
              visitor: visitor.publicKey,
              visitorState: visitorState
            },
            signers: [visitor]
          }
        ),
        "finalized"
      );
    }

    console.log("About to visit again, this takes a while for solana to finalize...");
    await visit();
    visitorStateAccount = await program.account.visitorState.fetch(visitorState);
    assert.equal(2, visitorStateAccount.visitCount.toNumber());

    console.log("About to visit again, this takes a while for solana to finalize...");
    await visit();
    visitorStateAccount = await program.account.visitorState.fetch(visitorState);
    assert.equal(3, visitorStateAccount.visitCount.toNumber());
  });

  it("Doesn't work if you're an intruder though", async () => {
    let visitorStateAccount = await program.account.visitorState.fetch(visitorState);
    // == 3 from the previous test
    assert.equal(3, visitorStateAccount.visitCount.toNumber());

    const intruder = anchor.web3.Keypair.generate();
    try {
      await program.rpc.visit(
        {
          accounts: {
            visitor: intruder.publicKey,
            visitorState: visitorState
          },
          signers: [intruder]
        }
      );
    } catch (err) {
        // 0x92 means a seed constraint failed (correctly)
        assert.equal(err.code, 0x92);
    }

    visitorStateAccount = await program.account.visitorState.fetch(visitorState);
    // still == 3
    assert.equal(3, visitorStateAccount.visitCount.toNumber());
  });
});
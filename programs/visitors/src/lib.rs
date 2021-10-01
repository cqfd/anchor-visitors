use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
mod visitors {
    use super::*;

    pub fn introduce_yourself(ctx: Context<Introduction>, _visitor_bump: u8) -> ProgramResult {
        msg!("Nice to meet you {}.", ctx.accounts.visitor.key);
        ctx.accounts.visitor_state.visitor = ctx.accounts.visitor.key();
        ctx.accounts.visitor_state.visit_count = 1;
        Ok(())
    }

    pub fn visit(ctx: Context<Visit>) -> ProgramResult {
        ctx.accounts.visitor_state.visit_count += 1;
        msg!(
            "Welcome back {}, you've now visited {} times.",
            ctx.accounts.visitor.key,
            ctx.accounts.visitor_state.visit_count
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(visitor_bump: u8)]
pub struct Introduction<'info> {
    payer: Signer<'info>,
    visitor: Signer<'info>,
    #[account(init, seeds = [visitor.key.as_ref()], bump = visitor_bump, payer = payer, space = 8 + 32 + 8)]
    visitor_state: Account<'info, VisitorState>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Visit<'info> {
    visitor: Signer<'info>,
    #[account(mut, constraint = visitor_state.visitor == visitor.key())]
    visitor_state: Account<'info, VisitorState>,
}

#[account]
pub struct VisitorState {
    visitor: Pubkey,
    visit_count: u64,
}

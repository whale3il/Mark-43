import { Router, Request, Response } from 'express';
import { serverRepo } from '../db/prisma';

export const bankingRouter = Router();

// GET /api/banking/dashboard - Consolidated initial dashboard load
bankingRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [accounts, transactions, beneficiaries, cards, bills, goals, sessions, profile] = await Promise.all([
      serverRepo.getAccounts(),
      serverRepo.getTransactions(),
      serverRepo.getBeneficiaries(),
      serverRepo.getCards(),
      serverRepo.getBills(),
      serverRepo.getGoals(),
      serverRepo.getSessions(),
      serverRepo.getUserProfile()
    ]);

    res.json({
      success: true,
      data: {
        accounts,
        transactions,
        beneficiaries,
        cards,
        bills,
        goals,
        sessions,
        profile
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to fetch dashboard data' } });
  }
});

// Accounts
bankingRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await serverRepo.getAccounts();
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    const account = await serverRepo.createAccount(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Transactions
bankingRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await serverRepo.getTransactions();
    res.json({ success: true, data: transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Transfers
bankingRouter.post('/transfers', async (req: Request, res: Response) => {
  try {
    const result = await serverRepo.executeTransfer(req.body);
    res.json({ success: true, data: result.transaction, updatedAccount: result.updatedAccount });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Beneficiaries
bankingRouter.get('/beneficiaries', async (req: Request, res: Response) => {
  try {
    const beneficiaries = await serverRepo.getBeneficiaries();
    res.json({ success: true, data: beneficiaries });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/beneficiaries', async (req: Request, res: Response) => {
  try {
    const ben = await serverRepo.addBeneficiary(req.body);
    res.status(201).json({ success: true, data: ben });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.delete('/beneficiaries/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await serverRepo.deleteBeneficiary(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Cards
bankingRouter.get('/cards', async (req: Request, res: Response) => {
  try {
    const cards = await serverRepo.getCards();
    res.json({ success: true, data: cards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.patch('/cards/:id', async (req: Request, res: Response) => {
  try {
    const updated = await serverRepo.updateCard(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/cards', async (req: Request, res: Response) => {
  try {
    const card = await serverRepo.issueCard(req.body);
    res.status(201).json({ success: true, data: card });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Bills
bankingRouter.get('/bills', async (req: Request, res: Response) => {
  try {
    const bills = await serverRepo.getBills();
    res.json({ success: true, data: bills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/bills/:id/pay', async (req: Request, res: Response) => {
  try {
    const result = await serverRepo.payBill(req.params.id);
    res.json({ success: true, data: result.transaction, bill: result.bill, account: result.account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.patch('/bills/:id/autopay', async (req: Request, res: Response) => {
  try {
    const bill = await serverRepo.toggleAutopay(req.params.id, req.body.autoPay);
    res.json({ success: true, data: bill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/bills', async (req: Request, res: Response) => {
  try {
    const bill = await serverRepo.addBill(req.body);
    res.status(201).json({ success: true, data: bill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Goals
bankingRouter.get('/goals', async (req: Request, res: Response) => {
  try {
    const goals = await serverRepo.getGoals();
    res.json({ success: true, data: goals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/goals/:id/deposit', async (req: Request, res: Response) => {
  try {
    const result = await serverRepo.depositToGoal(req.params.id, Number(req.body.amount));
    res.json({ success: true, data: result.goal, account: result.account });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.post('/goals', async (req: Request, res: Response) => {
  try {
    const goal = await serverRepo.createGoal(req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Sessions
bankingRouter.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await serverRepo.getSessions();
    res.json({ success: true, data: sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

bankingRouter.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const revoked = await serverRepo.revokeSession(req.params.id);
    res.json({ success: revoked });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

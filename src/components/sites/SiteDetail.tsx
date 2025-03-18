import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Building2, Calendar, Check, Edit, ExternalLink, User, Plus, CheckCircle, AlertCircle, IndianRupee } from 'lucide-react';
import { Expense, Site, Advance, FundsReceived, Invoice, BalanceSummary, AdvancePurpose, ApprovalStatus, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomCard from '@/components/ui/CustomCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SiteDetailTransactions from './SiteDetailTransactions';
import { useIsMobile } from '@/hooks/use-mobile';
import BalanceCard from '../dashboard/BalanceCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import AdvanceForm from '@/components/advances/AdvanceForm';
import FundsReceivedForm from '@/components/funds/FundsReceivedForm';
import InvoiceForm from '@/components/invoices/InvoiceForm';

interface SiteDetailProps {
  site: Site;
  expenses: Expense[];
  advances: Advance[];
  fundsReceived: FundsReceived[];
  invoices: Invoice[];
  supervisorInvoices: Invoice[];
  onBack: () => void;
  onAddExpense: (expense: Partial<Expense>) => Promise<void>;
  onAddAdvance: (advance: Partial<Advance>) => Promise<void>;
  onAddFunds: (fund: Partial<FundsReceived>) => Promise<void>;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onCompleteSite: (siteId: string, completionDate: Date) => Promise<void>;
  balanceSummary: BalanceSummary;
  siteSupervisor: any;
  userRole: UserRole;
}

const DEBIT_ADVANCE_PURPOSES = [
  AdvancePurpose.SAFETY_SHOES,
  AdvancePurpose.TOOLS,
  AdvancePurpose.OTHER
];

const SiteDetail: React.FC<SiteDetailProps> = ({
  site,
  expenses: initialExpenses,
  advances: initialAdvances,
  fundsReceived: initialFunds,
  invoices,
  supervisorInvoices,
  onBack,
  onAddExpense,
  onAddAdvance,
  onAddFunds,
  onAddInvoice,
  onCompleteSite,
  balanceSummary,
  siteSupervisor,
  userRole,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [advances, setAdvances] = useState<Advance[]>(initialAdvances);
  const [fundsReceived, setFundsReceived] = useState<FundsReceived[]>(initialFunds);
  const [balance, setBalance] = useState<BalanceSummary>(balanceSummary);
  const [activeTab, setActiveTab] = useState('summary');
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const isMobile = useIsMobile();
  
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isAdvanceFormOpen, setIsAdvanceFormOpen] = useState(false);
  const [isFundsFormOpen, setIsFundsFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isCompletionFormOpen, setIsCompletionFormOpen] = useState(false);
  const [completionDate, setCompletionDate] = useState<Date | null>(null);

  useEffect(() => {
    setExpenses(initialExpenses);
    setAdvances(initialAdvances);
    setFundsReceived(initialFunds);
    setBalance(balanceSummary);
  }, [initialExpenses, initialAdvances, initialFunds, balanceSummary]);

  const calculateBalance = (
    currentExpenses: Expense[],
    currentAdvances: Advance[],
    currentFunds: FundsReceived[],
    currentInvoices: Invoice[]
  ): BalanceSummary => {
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAdvances = currentAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalFunds = currentFunds.reduce((sum, fund) => sum + fund.amount, 0);
    const totalInvoices = currentInvoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);

    return {
      fundsReceived: totalFunds,
      totalExpenditure: totalExpenses,
      totalAdvances,
      debitsToWorker: 0, // This will be calculated based on advance types
      invoicesPaid: totalInvoices,
      pendingInvoices: 0,
      totalBalance: totalFunds - totalExpenses - totalAdvances - totalInvoices
    };
  };

  // Calculate total advances excluding debit to worker advances
  const totalAdvances = advances.reduce((sum, advance) => {
    if (!DEBIT_ADVANCE_PURPOSES.includes(advance.purpose)) {
      return sum + (Number(advance.amount) || 0);
    }
    return sum;
  }, 0);

  // Calculate total debit to worker advances
  const totalDebitToWorker = advances.reduce((sum, advance) => {
    if (DEBIT_ADVANCE_PURPOSES.includes(advance.purpose)) {
      return sum + (Number(advance.amount) || 0);
    }
    return sum;
  }, 0);

  const totalExpenses = balance.totalExpenditure;
  const totalFundsReceived = balance.fundsReceived;
  const totalInvoices = balance.invoicesPaid || 0;

  // Calculate current balance
  const currentBalance = totalFundsReceived - totalExpenses - totalAdvances - totalInvoices;

  const handleMarkComplete = async () => {
    try {
      const completionDate = new Date();
      
      const { error } = await supabase
        .from('sites')
        .update({
          is_completed: true,
          completion_date: completionDate.toISOString()
        })
        .eq('id', site.id);
        
      if (error) {
        console.error('Error marking site as complete:', error);
        toast.error('Failed to mark site as complete: ' + error.message);
        return;
      }
      
      toast.success('Site marked as complete successfully');
      if (onCompleteSite) {
        onCompleteSite(site.id, completionDate);
      }
    } catch (error: any) {
      console.error('Error in handleMarkComplete:', error);
      toast.error('Failed to mark site as complete: ' + error.message);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleExpenseSubmit = (expense: Partial<Expense>) => {
    if (onAddExpense) {
      onAddExpense(expense);
    }
    setIsExpenseFormOpen(false);
  };

  const handleAdvanceSubmit = (advance: Partial<Advance>) => {
    if (onAddAdvance) {
      onAddAdvance(advance);
    }
    setIsAdvanceFormOpen(false);
  };

  const handleFundsSubmit = (funds: Partial<FundsReceived>) => {
    if (onAddFunds) {
      const fundsWithSiteId = funds.siteId ? funds : {
        ...funds,
        siteId: site.id
      };
      onAddFunds(fundsWithSiteId);
    }
    setIsFundsFormOpen(false);
  };

  const handleInvoiceSubmit = (invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    if (onAddInvoice) {
      onAddInvoice(invoice);
    }
    setIsInvoiceFormOpen(false);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);
        
      if (error) throw error;
      
      // Update local state
      const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
      setExpenses(updatedExpenses);
      
      // Recalculate balance
      const updatedBalance = calculateBalance(updatedExpenses, advances, fundsReceived, supervisorInvoices);
      setBalance(updatedBalance);
      
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    try {
      const { error } = await supabase
        .from('advances')
        .delete()
        .eq('id', advanceId);
        
      if (error) throw error;
      
      // Update local state
      const updatedAdvances = advances.filter(advance => advance.id !== advanceId);
      setAdvances(updatedAdvances);
      
      // Recalculate balance
      const updatedBalance = calculateBalance(expenses, updatedAdvances, fundsReceived, supervisorInvoices);
      setBalance(updatedBalance);
      
      toast.success('Advance deleted successfully');
    } catch (error) {
      console.error('Error deleting advance:', error);
      toast.error('Failed to delete advance');
    }
  };

  const handleDeleteFund = async (fundId: string) => {
    try {
      const { error } = await supabase
        .from('funds_received')
        .delete()
        .eq('id', fundId);
        
      if (error) throw error;
      
      // Update local state
      const updatedFunds = fundsReceived.filter(fund => fund.id !== fundId);
      setFundsReceived(updatedFunds);
      
      // Recalculate balance
      const updatedBalance = calculateBalance(expenses, advances, updatedFunds, supervisorInvoices);
      setBalance(updatedBalance);
      
      toast.success('Fund deleted successfully');
    } catch (error) {
      console.error('Error deleting fund:', error);
      toast.error('Failed to delete fund');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <span className="text-sm font-medium text-muted-foreground">Site Name</span>
            <h1 className="text-xl md:text-2xl font-bold">{site.name}</h1>
          </div>
          {site.isCompleted ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              Completed
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Active
            </Badge>
          )}
        </div>
        
        {!site.isCompleted && (
          <Button 
            className="text-green-600 border-green-200 hover:bg-green-50 w-full sm:w-auto mt-2 sm:mt-0" 
            onClick={() => setIsMarkingComplete(true)}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark as Complete
          </Button>
        )}

        {isMarkingComplete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Mark Site as Complete?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Are you sure you want to mark this site as complete? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setIsMarkingComplete(false)}>Cancel</Button>
                  <Button onClick={handleMarkComplete}>Confirm</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomCard className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Job Name</h3>
              <p className="text-lg font-semibold mt-1">{site.jobName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">PO Number</h3>
              <p className="text-lg font-semibold mt-1">{site.posNo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Start Date</h3>
              <p className="text-lg font-semibold mt-1">{format(site.startDate, 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                {site.isCompleted ? 'Completion Date' : 'Est. Completion'}
              </h3>
              <p className="text-lg font-semibold mt-1">
                {site.completionDate ? format(site.completionDate, 'dd/MM/yyyy') : 'Not specified'}
              </p>
            </div>
            {siteSupervisor && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Supervisor</h3>
                <p className="text-lg font-semibold mt-1 flex items-center">
                  <User className="h-4 w-4 mr-1 text-muted-foreground" />
                  {siteSupervisor.name}
                </p>
              </div>
            )}
          </div>
        </CustomCard>

        <BalanceCard balanceData={balance} siteId={site.id} />
      </div>

      {userRole !== UserRole.VIEWER && !site.isCompleted && (
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setIsExpenseFormOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
          <Button 
            onClick={() => setIsAdvanceFormOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Advance
          </Button>
          <Button 
            onClick={() => setIsFundsFormOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Funds From HO
          </Button>
          <Button 
            onClick={() => setIsInvoiceFormOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Invoice
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid grid-cols-2 ${isMobile ? 'w-full' : 'max-w-md'} mb-4`}>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomCard>
              <h3 className="text-lg font-medium mb-4">Quick Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-medium">₹{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Advances</span>
                  <span className="font-medium">₹{totalAdvances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Invoices</span>
                  <span className="font-medium">₹{totalInvoices.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Debits to Worker</span>
                  <span className="font-medium">₹{totalDebitToWorker.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Funds Received</span>
                  <span className="font-medium">₹{totalFundsReceived.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center font-medium">
                    <span>Current Balance</span>
                    <span className={currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₹{currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Site Status</span>
                  <Badge className={site.isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                    {site.isCompleted ? 'Completed' : 'Active'}
                  </Badge>
                </div>
              </div>
            </CustomCard>
            
            <CustomCard>
              <h3 className="text-lg font-medium mb-4">Activity Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expense Entries</span>
                  <span className="font-medium">{expenses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Advance Entries</span>
                  <span className="font-medium">{advances.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Invoice Entries</span>
                  <span className="font-medium">{invoices.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Funds Received Entries</span>
                  <span className="font-medium">{fundsReceived.length}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Site Status</span>
                    <Badge className={site.isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {site.isCompleted ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CustomCard>
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <SiteDetailTransactions 
            siteId={site.id}
            userRole={userRole}
            expensesCount={expenses.length}
            advancesCount={advances.length}
            fundsReceivedCount={fundsReceived.length}
            site={site}
            expenses={expenses}
            advances={advances}
            fundsReceived={fundsReceived}
            onDeleteExpense={handleDeleteExpense}
            onDeleteAdvance={handleDeleteAdvance}
            onDeleteFund={handleDeleteFund}
          />
        </TabsContent>
      </Tabs>

      {isExpenseFormOpen && (
        <ExpenseForm
          isOpen={isExpenseFormOpen}
          onClose={() => setIsExpenseFormOpen(false)}
          onSubmit={handleExpenseSubmit}
          siteId={site.id}
        />
      )}
      
      {isAdvanceFormOpen && (
        <AdvanceForm
          isOpen={isAdvanceFormOpen}
          onClose={() => setIsAdvanceFormOpen(false)}
          onSubmit={handleAdvanceSubmit}
          siteId={site.id}
        />
      )}
      
      {isFundsFormOpen && (
        <FundsReceivedForm
          isOpen={isFundsFormOpen}
          onClose={() => setIsFundsFormOpen(false)}
          onSubmit={handleFundsSubmit}
          siteId={site.id}
        />
      )}
      
      {isInvoiceFormOpen && (
        <InvoiceForm
          isOpen={isInvoiceFormOpen}
          onClose={() => setIsInvoiceFormOpen(false)}
          onSubmit={handleInvoiceSubmit}
          siteId={site.id}
        />
      )}
    </div>
  );
};

export default SiteDetail;

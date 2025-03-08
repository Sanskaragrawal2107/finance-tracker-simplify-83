
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, ArrowLeft, Plus, Check, X, Building, Wallet, DownloadCloud, Receipt, FileText, Image } from 'lucide-react';
import { Site, Expense, ExpenseCategory, ApprovalStatus, Advance, FundsReceived, AdvancePurpose, Invoice } from '@/lib/types';
import CustomCard from '@/components/ui/CustomCard';
import { Button } from '@/components/ui/button';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import AdvanceForm from '@/components/advances/AdvanceForm';
import FundsReceivedForm from '@/components/funds/FundsReceivedForm';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface SiteDetailProps {
  site: Site;
  expenses: Expense[];
  advances?: Advance[];
  fundsReceived?: FundsReceived[];
  invoices?: Invoice[];
  onBack: () => void;
  onAddExpense: (expense: Partial<Expense>) => void;
  onAddAdvance?: (advance: Partial<Advance>) => void;
  onAddFunds?: (funds: Partial<FundsReceived>) => void;
  onAddInvoice?: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onCompleteSite: (siteId: string, completionDate: Date) => void;
}

const getCategoryColor = (category: ExpenseCategory | string) => {
  switch (category) {
    case ExpenseCategory.MATERIAL:
      return 'bg-blue-100 text-blue-800';
    case ExpenseCategory.LABOR:
      return 'bg-green-100 text-green-800';
    case ExpenseCategory.TRAVEL:
      return 'bg-yellow-100 text-yellow-800';
    case ExpenseCategory.OFFICE:
      return 'bg-purple-100 text-purple-800';
    case ExpenseCategory.MISC:
      return 'bg-gray-100 text-gray-800';
    case ExpenseCategory.TRANSPORT:
      return 'bg-orange-100 text-orange-800';
    case ExpenseCategory.FOOD:
      return 'bg-red-100 text-red-800';
    case ExpenseCategory.ACCOMMODATION:
      return 'bg-pink-100 text-pink-800';
    case ExpenseCategory.EQUIPMENT:
      return 'bg-indigo-100 text-indigo-800';
    case ExpenseCategory.MAINTENANCE:
      return 'bg-teal-100 text-teal-800';
    // Custom categories
    case "STAFF TRAVELLING CHARGES":
      return 'bg-yellow-100 text-yellow-800';
    case "STATIONARY & PRINTING":
      return 'bg-purple-100 text-purple-800';
    case "DIESEL & FUEL CHARGES":
      return 'bg-orange-100 text-orange-800';
    case "LABOUR TRAVELLING EXP.":
      return 'bg-yellow-100 text-yellow-800';
    case "LOADGING & BOARDING FOR STAFF":
      return 'bg-pink-100 text-pink-800';
    case "FOOD CHARGES FOR LABOUR":
      return 'bg-red-100 text-red-800';
    case "SITE EXPENSES":
      return 'bg-gray-100 text-gray-800';
    case "ROOM RENT FOR LABOUR":
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: ApprovalStatus) => {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return 'bg-green-100 text-green-800';
    case ApprovalStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case ApprovalStatus.REJECTED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const SiteDetail: React.FC<SiteDetailProps> = ({
  site,
  expenses,
  advances = [],
  fundsReceived = [],
  invoices = [],
  onBack,
  onAddExpense,
  onAddAdvance,
  onAddFunds,
  onAddInvoice,
  onCompleteSite
}) => {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isAdvanceFormOpen, setIsAdvanceFormOpen] = useState(false);
  const [isFundsFormOpen, setIsFundsFormOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [completionDate, setCompletionDate] = useState<Date | undefined>(site.completionDate);
  const [activeTab, setActiveTab] = useState('expenses');
  const [selectedInvoiceImage, setSelectedInvoiceImage] = useState<string | null>(null);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const moneyAdvances = advances.filter(advance => 
    advance.purpose === AdvancePurpose.ADVANCE
  );
  const workerDebits = advances.filter(advance => 
    advance.purpose === AdvancePurpose.SAFETY_SHOES || 
    advance.purpose === AdvancePurpose.TOOLS || 
    advance.purpose === AdvancePurpose.OTHER
  );
  const totalMoneyAdvances = moneyAdvances.reduce((sum, advance) => sum + advance.amount, 0);
  const totalWorkerDebits = workerDebits.reduce((sum, advance) => sum + advance.amount, 0);
  const totalFundsReceived = fundsReceived.reduce((sum, fund) => sum + fund.amount, 0);
  
  const supervisorInvoices = invoices.filter(invoice => invoice.approverType === "supervisor");
  const totalSupervisorInvoices = supervisorInvoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);
  
  const totalInvoices = invoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);
  
  const totalBalance = totalFundsReceived - totalExpenses - totalMoneyAdvances - totalSupervisorInvoices;

  const ensureDate = (date: Date | string): Date => {
    return date instanceof Date ? date : new Date(date);
  };

  const handleAddExpense = (newExpense: Partial<Expense>) => {
    const expenseWithSiteId = {
      ...newExpense,
      siteId: site.id,
      supervisorId: site.supervisorId
    };
    onAddExpense(expenseWithSiteId);
    setIsExpenseFormOpen(false);
  };

  const handleAddAdvance = (newAdvance: Partial<Advance>) => {
    if (onAddAdvance) {
      const advanceWithSiteId = {
        ...newAdvance,
        siteId: site.id
      };
      onAddAdvance(advanceWithSiteId);
    }
    setIsAdvanceFormOpen(false);
  };

  const handleAddFunds = (newFunds: Partial<FundsReceived>) => {
    if (onAddFunds) {
      const fundsWithSiteId = {
        ...newFunds,
        siteId: site.id
      };
      onAddFunds(fundsWithSiteId);
    }
    setIsFundsFormOpen(false);
  };

  const handleAddInvoice = (newInvoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    if (onAddInvoice) {
      onAddInvoice(newInvoice);
    }
    setIsInvoiceFormOpen(false);
  };

  const handleCompleteSite = () => {
    if (completionDate) {
      onCompleteSite(site.id, completionDate);
      setIsCompletionDialogOpen(false);
      toast.success("Site marked as completed");
    } else {
      toast.error("Please select a completion date");
    }
  };

  // Debug the invoices data
  console.log("Invoices in SiteDetail:", invoices);
  invoices.forEach(invoice => {
    console.log(`Invoice ${invoice.id} image URL:`, invoice.invoiceImageUrl);
  });

  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sites
        </Button>
        
        {!site.isCompleted ? <Button size="sm" variant="outline" className="ml-auto" onClick={() => setIsCompletionDialogOpen(true)}>
            <Check className="h-4 w-4 mr-2" />
            Mark as Completed
          </Button> : <div className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
            <Check className="h-4 w-4 mr-1" />
            Completed
          </div>}
      </div>
      
      <CustomCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold">{site.name}</h2>
            <p className="text-muted-foreground">{site.jobName}</p>
            
            <div className="mt-4 space-y-2">
              <div className="flex">
                <span className="text-muted-foreground w-32">P.O. Number:</span>
                <span className="font-medium">{site.posNo}</span>
              </div>
              <div className="flex">
                <span className="text-muted-foreground w-32">Start Date:</span>
                <span className="font-medium">{format(ensureDate(site.startDate), 'PPP')}</span>
              </div>
              {site.completionDate && <div className="flex">
                  <span className="text-muted-foreground w-32">Completion Date:</span>
                  <span className="font-medium">{format(ensureDate(site.completionDate), 'PPP')}</span>
                </div>}
              <div className="flex">
                <span className="text-muted-foreground w-32">Status:</span>
                <span className={`font-medium ${site.isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                  {site.isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Site Financial Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funds Received from HO:</span>
                <span className="font-medium text-green-600">₹{totalFundsReceived.toLocaleString()}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Expenses paid by supervisor:</span>
                <span className="font-medium text-red-600">₹{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Advances paid by supervisor:</span>
                <span className="font-medium text-amber-600">₹{totalMoneyAdvances.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debits TO worker:</span>
                <span className="font-medium text-purple-600">₹{totalWorkerDebits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoices paid by supervisor:</span>
                <span className="font-medium text-blue-600">₹{totalSupervisorInvoices.toLocaleString()}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="font-medium">Current Balance:</span>
                <span className={`font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CustomCard>
      
      <div className="flex flex-wrap items-center gap-4 mt-6">
        <div className="flex-grow">
          <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="expenses">
                <Receipt className="h-4 w-4 mr-2" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="moneyAdvances">
                <Wallet className="h-4 w-4 mr-2" />
                Advance History
              </TabsTrigger>
              <TabsTrigger value="workerDebits">
                <Wallet className="h-4 w-4 mr-2" />
                Debit by H.O.
              </TabsTrigger>
              <TabsTrigger value="funds">
                <Building className="h-4 w-4 mr-2" />
                Funds from HO
              </TabsTrigger>
              <TabsTrigger value="invoices">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsExpenseFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Expense
          </Button>
          <Button onClick={() => setIsAdvanceFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <Wallet className="h-4 w-4 mr-2" />
            New Advance
          </Button>
          <Button variant="outline" onClick={() => setIsFundsFormOpen(true)}>
            <DownloadCloud className="h-4 w-4 mr-2" />
            Funds Received
          </Button>
          <Button onClick={() => setIsInvoiceFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>
      
      <CustomCard>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="expenses" className="mt-0">
            {expenses.length > 0 ? <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pl-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Description</th>
                      <th className="pb-3 font-medium text-muted-foreground">Category</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(expense => <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-4 text-sm">{format(ensureDate(expense.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 text-sm">{expense.description}</td>
                        <td className="py-4 text-sm">
                          <span className={`${getCategoryColor(expense.category)} px-2 py-1 rounded-full text-xs font-medium`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-sm font-medium">₹{expense.amount.toLocaleString()}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div> : <div className="p-8 text-center">
                <p className="text-muted-foreground">No expenses have been recorded for this site yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsExpenseFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Expense
                </Button>
              </div>}
          </TabsContent>

          <TabsContent value="moneyAdvances" className="mt-0">
            {moneyAdvances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pl-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Recipient</th>
                      <th className="pb-3 font-medium text-muted-foreground">Purpose</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moneyAdvances.map(advance => (
                      <tr key={advance.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-4 text-sm">{format(ensureDate(advance.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 text-sm">{advance.recipientType}: {advance.recipientName}</td>
                        <td className="py-4 text-sm">
                          <div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {advance.purpose}
                            </span>
                            {advance.remarks && <p className="text-xs text-muted-foreground mt-1">{advance.remarks}</p>}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-sm font-medium">₹{advance.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No money advances have been recorded for this site yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAdvanceFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <Wallet className="h-4 w-4 mr-2" />
                  Add First Advance
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="workerDebits" className="mt-0">
            {workerDebits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pl-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Recipient</th>
                      <th className="pb-3 font-medium text-muted-foreground">Purpose</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerDebits.map(advance => (
                      <tr key={advance.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-4 text-sm">{format(ensureDate(advance.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 text-sm">{advance.recipientType}: {advance.recipientName}</td>
                        <td className="py-4 text-sm">
                          <div>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {advance.purpose}
                            </span>
                            {advance.remarks && <p className="text-xs text-muted-foreground mt-1">{advance.remarks}</p>}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-sm font-medium">₹{advance.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No worker debits have been recorded for this site yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAdvanceFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <Wallet className="h-4 w-4 mr-2" />
                  Add First Debit
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="funds" className="mt-0">
            {fundsReceived.length > 0 ? <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pl-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundsReceived.map(fund => <tr key={fund.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-4 text-sm">{format(ensureDate(fund.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 pr-4 text-sm font-medium text-green-600">₹{fund.amount.toLocaleString()}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div> : <div className="p-8 text-center">
                <p className="text-muted-foreground">No funds have been recorded for this site yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsFundsFormOpen(true)}>
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Record First Funds
                </Button>
              </div>}
          </TabsContent>
          
          <TabsContent value="invoices" className="mt-0">
            {invoices && invoices.length > 0 ? <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pl-4 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Party Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Invoice No.</th>
                      <th className="pb-3 font-medium text-muted-foreground">Payment By</th>
                      <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(invoice => <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-4 text-sm">{format(ensureDate(invoice.date), 'MMM dd, yyyy')}</td>
                        <td className="py-4 text-sm">{invoice.partyName}</td>
                        <td className="py-4 text-sm">{invoice.partyId}</td>
                        <td className="py-4 text-sm">
                          <span className={`px-2 py-1 ${invoice.approverType === "ho" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"} rounded-full text-xs font-medium`}>
                            {invoice.approverType === "ho" ? "Head Office" : "Supervisor"}
                          </span>
                        </td>
                        <td className="py-4 text-sm font-medium">₹{invoice.netAmount.toLocaleString()}</td>
                        <td className="py-4 pr-4 text-sm">
                          {invoice.invoiceImageUrl ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                console.log("Viewing image:", invoice.invoiceImageUrl);
                                setSelectedInvoiceImage(invoice.invoiceImageUrl);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Image className="h-4 w-4" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">No image</span>
                          )}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div> : <div className="p-8 text-center">
                <p className="text-muted-foreground">No invoices have been recorded for this site yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsInvoiceFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <FileText className="h-4 w-4 mr-2" />
                  Add First Invoice
                </Button>
              </div>}
          </TabsContent>
        </Tabs>
      </CustomCard>
      
      <ExpenseForm isOpen={isExpenseFormOpen} onClose={() => setIsExpenseFormOpen(false)} onSubmit={handleAddExpense} />
      
      <AdvanceForm isOpen={isAdvanceFormOpen} onClose={() => setIsAdvanceFormOpen(false)} onSubmit={handleAddAdvance} siteId={site.id} />
      
      <FundsReceivedForm isOpen={isFundsFormOpen} onClose={() => setIsFundsFormOpen(false)} onSubmit={handleAddFunds} siteId={site.id} />
      
      <InvoiceForm 
        isOpen={isInvoiceFormOpen} 
        onClose={() => setIsInvoiceFormOpen(false)} 
        onSubmit={handleAddInvoice}
        siteId={site.id}
      />
      
      <Dialog open={!!selectedInvoiceImage} onOpenChange={(open) => {
        if (!open) {
          console.log("Closing image dialog");
          setSelectedInvoiceImage(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Image</DialogTitle>
          </DialogHeader>
          {selectedInvoiceImage && (
            <div className="flex justify-center">
              <img 
                src={selectedInvoiceImage} 
                alt="Invoice" 
                className="max-h-[70vh] object-contain rounded-md" 
                onError={(e) => {
                  console.error("Error loading image:", e);
                  toast.error("Failed to load invoice image");
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedInvoiceImage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Site as Completed</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-muted-foreground">
              Please select the completion date for this site:
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !completionDate && "text-muted-foreground")}>
                  {completionDate ? format(completionDate, "PPP") : <span>Pick a date</span>}
                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={completionDate} onSelect={setCompletionDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCompletionDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="button" onClick={handleCompleteSite} disabled={!completionDate}>
              <Check className="h-4 w-4 mr-2" />
              Confirm Completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

export default SiteDetail;

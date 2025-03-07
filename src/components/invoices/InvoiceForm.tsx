
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PaymentStatus, Invoice, MaterialItem } from '@/lib/types';
import { Calendar as CalendarIcon, Upload, Loader2, Camera, Plus, Trash2, FileText, User, AlertTriangle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type InvoiceFormProps = {
  onSubmit: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  initialData?: Partial<Invoice>;
};

// Mock data - would come from API in real application
const gstRates = [5, 12, 18, 28];

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  onSubmit,
  initialData
}) => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(initialData?.date || new Date());
  const [partyId, setPartyId] = useState<string>(initialData?.partyId || '');
  const [partyName, setPartyName] = useState<string>(initialData?.partyName || '');
  const [partyNameFixed, setPartyNameFixed] = useState<boolean>(false);
  
  // For new material input
  const [materialInput, setMaterialInput] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<number>(0);
  const [rateInput, setRateInput] = useState<number>(0);
  const [gstPercentageInput, setGstPercentageInput] = useState<number>(18);
  
  // Material items list
  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([]);
  
  // Grand totals
  const [grandGrossAmount, setGrandGrossAmount] = useState<number>(0);
  const [grandNetAmount, setGrandNetAmount] = useState<number>(0);
  
  const [billFile, setBillFile] = useState<File | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initialData?.paymentStatus || PaymentStatus.PENDING
  );
  
  // Bank details
  const [accountNumber, setAccountNumber] = useState<string>(initialData?.bankDetails?.accountNumber || '');
  const [bankName, setBankName] = useState<string>(initialData?.bankDetails?.bankName || '');
  const [ifscCode, setIfscCode] = useState<string>(initialData?.bankDetails?.ifscCode || '');
  const [email, setEmail] = useState<string>(initialData?.bankDetails?.email || '');
  const [mobile, setMobile] = useState<string>(initialData?.bankDetails?.mobile || '');
  const [ifscValidationMessage, setIfscValidationMessage] = useState<string>('');
  const [isFetchingBankDetails, setIsFetchingBankDetails] = useState<boolean>(false);
  
  // Add approver type selection
  const [approverType, setApproverType] = useState<"ho" | "supervisor">("ho");

  // Fix party name when entered
  const handlePartyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!partyNameFixed) {
      setPartyName(e.target.value);
    }
  };

  const handlePartyNameBlur = () => {
    if (partyName.trim() !== '') {
      setPartyNameFixed(true);
    }
  };

  // Calculate total amounts whenever material items change
  useEffect(() => {
    let totalGross = 0;
    let totalNet = 0;
    
    materialItems.forEach(item => {
      if (item.amount !== null) {
        totalGross += item.amount;
        if (item.gstPercentage !== null) {
          totalNet += item.amount + (item.amount * (item.gstPercentage / 100));
        }
      }
    });
    
    setGrandGrossAmount(totalGross);
    setGrandNetAmount(totalNet);
    
    // Auto-select HO for amounts greater than 5000
    if (totalNet > 5000) {
      setApproverType("ho");
    }
  }, [materialItems]);

  // Add new material item
  const addMaterialItem = () => {
    if (!materialInput.trim()) {
      toast({
        title: "Material name is required",
        description: "Please enter a material name",
        variant: "destructive",
      });
      return;
    }
    
    if (quantityInput <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    if (rateInput <= 0) {
      toast({
        title: "Invalid rate",
        description: "Rate must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    const grossAmount = quantityInput * rateInput;
    
    const newItem: MaterialItem = {
      id: Date.now().toString(),
      material: materialInput,
      quantity: quantityInput,
      rate: rateInput,
      gstPercentage: gstPercentageInput,
      amount: grossAmount
    };
    
    setMaterialItems([...materialItems, newItem]);
    
    // Reset input fields
    setMaterialInput('');
    setQuantityInput(0);
    setRateInput(0);
  };

  // Remove material item
  const removeMaterialItem = (index: number) => {
    const updatedItems = [...materialItems];
    updatedItems.splice(index, 1);
    setMaterialItems(updatedItems);
  };

  // Handle account number input
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 16) {
      setAccountNumber(value);
    }
  };

  // Validate IFSC code
  const validateIfsc = (code: string) => {
    // Basic IFSC validation: must be 11 characters
    if (code.length !== 11) {
      return false;
    }
    
    // Check if 5th digit is '0'
    return code[4] === '0';
  };

  // Handle IFSC code change
  const handleIfscChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setIfscCode(value);
    
    // Clear validation message when user is typing
    if (value.length < 11) {
      setIfscValidationMessage('');
    }
  };

  // Handle IFSC code validation and bank details fetching
  const handleIfscBlur = async () => {
    // If IFSC is not 11 characters yet, don't validate
    if (ifscCode.length !== 11) {
      setIfscValidationMessage('IFSC code must be 11 characters');
      return;
    }
    
    // Validate 5th digit must be '0'
    if (ifscCode[4] !== '0') {
      setIfscValidationMessage('5th digit of IFSC code must be 0');
      setBankName('');
      return;
    }
    
    // Clear validation message if valid
    setIfscValidationMessage('');
    
    // Fetch bank details from Razorpay API
    try {
      setIsFetchingBankDetails(true);
      const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
      
      if (response.ok) {
        const data = await response.json();
        setBankName(`${data.BANK}, ${data.BRANCH}, ${data.CITY}`);
        toast({
          title: "Bank details fetched",
          description: "Bank details have been automatically filled",
        });
      } else {
        // Handle invalid IFSC
        setIfscValidationMessage('Invalid IFSC code');
        setBankName('');
      }
    } catch (error) {
      setIfscValidationMessage('Failed to fetch bank details');
      console.error('Error fetching bank details:', error);
    } finally {
      setIsFetchingBankDetails(false);
    }
  };

  // Handle bill file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBillFile(e.target.files[0]);
    }
  };

  // Reset party name
  const resetPartyName = () => {
    setPartyNameFixed(false);
    setPartyName('');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate IFSC before submission
    if (!validateIfsc(ifscCode)) {
      toast({
        title: "Invalid IFSC code",
        description: "Please provide a valid IFSC code with 5th digit as '0'",
        variant: "destructive",
      });
      return;
    }
    
    // Validate at least one material item has data
    if (materialItems.length === 0) {
      toast({
        title: "No materials added",
        description: "Please add at least one material item",
        variant: "destructive",
      });
      return;
    }
    
    // Validate Party ID
    if (!partyId.trim()) {
      toast({
        title: "Missing Invoice Number",
        description: "Please provide an Invoice Number",
        variant: "destructive",
      });
      return;
    }
    
    // Use the first material for backward compatibility with the Invoice type
    const primaryMaterial = materialItems[0];
    
    // Create invoice object from form data
    const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
      date,
      partyId,
      partyName,
      material: materialItems.map(item => item.material).join(', '),
      quantity: primaryMaterial.quantity || 0,
      rate: primaryMaterial.rate || 0,
      gstPercentage: primaryMaterial.gstPercentage || 18,
      grossAmount: grandGrossAmount,
      netAmount: grandNetAmount,
      materialItems: materialItems,
      bankDetails: {
        accountNumber,
        bankName,
        ifscCode,
        email,
        mobile,
      },
      billUrl: billFile ? URL.createObjectURL(billFile) : undefined,
      paymentStatus,
      createdBy: 'Current User', // In a real app, this would come from auth context
      approverType: approverType,
    };
    
    onSubmit(invoiceData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Invoice Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Invoice Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="party" className="flex items-center">
            <User className="h-4 w-4 mr-1 text-muted-foreground" />
            Party Name
          </Label>
          <div className="flex gap-2">
            <Input 
              id="party" 
              value={partyName} 
              onChange={handlePartyNameChange} 
              onBlur={handlePartyNameBlur}
              placeholder="Enter party name"
              required
              disabled={partyNameFixed}
              className={partyNameFixed ? "bg-muted" : ""}
            />
            {partyNameFixed && (
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={resetPartyName}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partyId" className="flex items-center">
            <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
            Invoice Number
          </Label>
          <Input 
            id="partyId"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            placeholder="Enter invoice number"
            required
          />
        </div>
      </div>

      <Separator />

      {/* Materials Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Materials</h3>
        </div>
        
        {/* Add Material Form */}
        <div className="p-4 border rounded-md mb-4 bg-muted/30">
          <h4 className="font-medium mb-3">Add New Material</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="material-input">Material Name</Label>
              <Input 
                id="material-input"
                value={materialInput} 
                onChange={(e) => setMaterialInput(e.target.value)} 
                placeholder="e.g., TMT Steel Bars"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity-input">Quantity</Label>
              <Input 
                id="quantity-input"
                type="number" 
                value={quantityInput || ''} 
                onChange={(e) => setQuantityInput(Number(e.target.value))} 
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate-input">Rate (₹)</Label>
              <Input 
                id="rate-input"
                type="number" 
                value={rateInput || ''} 
                onChange={(e) => setRateInput(Number(e.target.value))} 
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gst-input">GST Percentage (%)</Label>
              <Select 
                value={gstPercentageInput.toString()} 
                onValueChange={(value) => setGstPercentageInput(Number(value))}
              >
                <SelectTrigger id="gst-input">
                  <SelectValue placeholder="Select GST rate" />
                </SelectTrigger>
                <SelectContent>
                  {gstRates.map(rate => (
                    <SelectItem key={rate} value={rate.toString()}>
                      {rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            type="button"
            onClick={addMaterialItem}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </Button>
        </div>
        
        {/* Material Items List */}
        {materialItems.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Material Items List</h4>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="py-2 px-4 font-medium">#</th>
                    <th className="py-2 px-4 font-medium">Material</th>
                    <th className="py-2 px-4 font-medium text-right">Quantity</th>
                    <th className="py-2 px-4 font-medium text-right">Rate (₹)</th>
                    <th className="py-2 px-4 font-medium text-right">GST %</th>
                    <th className="py-2 px-4 font-medium text-right">Amount (₹)</th>
                    <th className="py-2 px-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materialItems.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{item.material}</td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">{item.rate?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{item.gstPercentage}%</td>
                      <td className="py-3 px-4 text-right">{item.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeMaterialItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Grand Total */}
        <div className="bg-muted p-4 rounded-md mt-4">
          <div className="flex flex-col md:flex-row md:justify-end md:items-center gap-4">
            <div className="space-y-2 md:w-1/4">
              <Label htmlFor="grandGross">Net Taxable Amount (₹)</Label>
              <Input 
                id="grandGross" 
                value={grandGrossAmount.toLocaleString()} 
                readOnly 
                className="bg-muted font-medium"
              />
            </div>
            
            <div className="space-y-2 md:w-1/4">
              <Label htmlFor="grandNet" className="font-medium">Grand Net Total (₹)</Label>
              <Input 
                id="grandNet" 
                value={grandNetAmount.toLocaleString()} 
                readOnly 
                className="bg-muted font-bold text-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Approver Type Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Approver</h3>
        <div className="bg-muted/30 p-4 rounded-md">
          <RadioGroup 
            value={approverType} 
            onValueChange={(value) => setApproverType(value as "ho" | "supervisor")}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ho" id="ho" />
              <Label htmlFor="ho">Head Office</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="supervisor" 
                id="supervisor" 
                disabled={grandNetAmount > 5000}
              />
              <Label 
                htmlFor="supervisor" 
                className={grandNetAmount > 5000 ? "text-muted-foreground" : ""}
              >
                Supervisor
              </Label>
            </div>
          </RadioGroup>
          
          {grandNetAmount > 5000 && (
            <div className="mt-3 flex items-center text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Amounts over ₹5,000 must be approved by Head Office</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Bank Details */}
      <div>
        <h3 className="text-lg font-medium mb-4">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number (max 16 digits)</Label>
            <Input 
              id="accountNumber" 
              value={accountNumber} 
              onChange={handleAccountNumberChange}
              placeholder="Enter Account Number (max 16 digits)"
              required
              maxLength={16}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <div className="relative">
              <Input 
                id="ifscCode" 
                value={ifscCode} 
                onChange={handleIfscChange}
                onBlur={handleIfscBlur}
                placeholder="Enter IFSC Code (11 characters)"
                maxLength={11}
                required
                className={ifscValidationMessage ? "border-red-500" : ""}
              />
              {isFetchingBankDetails && (
                <div className="absolute top-0 right-0 h-full flex items-center pr-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {ifscValidationMessage && (
                <p className="text-red-500 text-sm mt-1">{ifscValidationMessage}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Must be 11 characters and 5th digit must be '0'
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name & Branch</Label>
            <Input 
              id="bankName" 
              value={bankName} 
              onChange={(e) => setBankName(e.target.value)} 
              placeholder="Bank Name (auto-filled from IFSC)"
              required
              readOnly={bankName !== ''}
              className={bankName ? "bg-muted" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input 
              id="email" 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email Address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number (Optional)</Label>
            <Input 
              id="mobile" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} 
              placeholder="Mobile Number"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Bill Upload & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bill">Upload Bill</Label>
          <div className="border border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="file"
              id="bill"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,image/*"
              onChange={handleFileChange}
              capture="environment"
            />
            <label htmlFor="bill" className="cursor-pointer flex flex-col items-center">
              <div className="flex gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground mt-2">
                {billFile ? billFile.name : "Click to upload or take a photo"}
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Payment Status</Label>
          <Select 
            value={paymentStatus} 
            onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={PaymentStatus.PAID}>Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Save Invoice</Button>
      </div>
    </form>
  );
};

export default InvoiceForm;

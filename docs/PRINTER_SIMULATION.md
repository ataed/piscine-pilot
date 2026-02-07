# 🖨️ THERMAL PRINTER SIMULATION GUIDE

**For testing printer functionality without physical hardware**

---

## 🎯 THREE SIMULATION OPTIONS

### **Option 1: PDF Receipt Generator (RECOMMENDED)**
Generate PDF receipts instead of printing to thermal printer.

### **Option 2: HTML Preview**
Show receipt in browser before "printing"

### **Option 3: Console/File Output**
Write receipt to console or text file

---

## 🚀 OPTION 1: PDF RECEIPT GENERATOR

### **Install Dependencies**
```bash
npm install pdfkit
npm install --save-dev @types/pdfkit
```

### **Create Receipt Generator**

**File: `server/utils/receipt.ts`**

```typescript
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import type { Transaction } from '../../shared/types';

const RECEIPTS_DIR = path.join(__dirname, '../../receipts');

// Ensure receipts directory exists
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

export function generateReceipt(transaction: Transaction): string {
  const receiptPath = path.join(
    RECEIPTS_DIR,
    `receipt-${transaction.id}.pdf`
  );

  try {
    const doc = new PDFDocument({ size: [226, 800], margin: 10 });
    const stream = fs.createWriteStream(receiptPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(16).text('PISCINE PILOT', { align: 'center' });
    doc.fontSize(10).text('Swimming Club Receipt', { align: 'center' });
    doc.moveDown();

    // Transaction Details
    doc.fontSize(12).text(`Date: ${new Date(transaction.created_at).toLocaleString()}`);
    doc.text(`Receipt #: ${transaction.id.slice(0, 8)}`);
    doc.moveDown();

    // Items
    doc.fontSize(14).text('DETAILS', { underline: true });
    doc.fontSize(12);
    doc.text(`Type: ${transaction.type.toUpperCase()}`);
    doc.text(`Payment: ${transaction.payment_method.toUpperCase()}`);
    
    if (transaction.customer_name) {
      doc.text(`Customer: ${transaction.customer_name}`);
    }
    
    if (transaction.notes) {
      doc.text(`Notes: ${transaction.notes}`);
    }
    
    doc.moveDown();

    // Amount (large)
    doc.fontSize(20).text(
      `TOTAL: ${(transaction.amount / 100).toFixed(2)} MAD`,
      { align: 'center' }
    );
    
    doc.moveDown();

    // Footer
    doc.fontSize(8).text('Thank you for your visit!', { align: 'center' });
    doc.text('Keep this receipt', { align: 'center' });

    doc.end();

    // Wait for file to be written
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        logger.success('Receipt generated', { path: receiptPath });
        resolve(receiptPath);
      });
      stream.on('error', reject);
    }) as unknown as string;

  } catch (error) {
    logger.error('Failed to generate receipt', error as Error);
    throw error;
  }
}
```

### **Update Transaction Route**

**In `server/routes/transactions.ts`**, add after creating transaction:

```typescript
import { generateReceipt } from '../utils/receipt';

// After successful transaction creation:
const transaction = dbManager.createTransaction(input);

// Generate PDF receipt (simulated printing)
let printed = false;
try {
  const receiptPath = generateReceipt(transaction);
  printed = true;
  logger.success('Receipt simulated', { path: receiptPath });
} catch (error) {
  logger.error('Receipt generation failed', error as Error);
}

const responseData: TransactionResponse = {
  transaction,
  printed,
  queued_for_sync: false,
};
```

### **Test It**

```bash
# Create a transaction via API or form
# Check receipts folder:
ls -la receipts/

# Open the PDF
xdg-open receipts/receipt-*.pdf
```

---

## 🌐 OPTION 2: HTML RECEIPT PREVIEW

### **Create Receipt Component**

**File: `src/components/ReceiptPreview.tsx`**

```typescript
import type { Transaction } from '../../shared/types';

interface ReceiptPreviewProps {
  transaction: Transaction;
  onClose: () => void;
}

export function ReceiptPreview({ transaction, onClose }: ReceiptPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-paper">
          <div className="receipt-header">
            <h1>PISCINE PILOT</h1>
            <p>Swimming Club Receipt</p>
          </div>

          <div className="receipt-details">
            <p><strong>Date:</strong> {new Date(transaction.created_at).toLocaleString()}</p>
            <p><strong>Receipt #:</strong> {transaction.id.slice(0, 8)}</p>
          </div>

          <div className="receipt-items">
            <h3>DETAILS</h3>
            <p><strong>Type:</strong> {transaction.type.toUpperCase()}</p>
            <p><strong>Payment:</strong> {transaction.payment_method.toUpperCase()}</p>
            {transaction.customer_name && (
              <p><strong>Customer:</strong> {transaction.customer_name}</p>
            )}
            {transaction.notes && (
              <p><strong>Notes:</strong> {transaction.notes}</p>
            )}
          </div>

          <div className="receipt-total">
            <h2>TOTAL: {(transaction.amount / 100).toFixed(2)} MAD</h2>
          </div>

          <div className="receipt-footer">
            <p>Thank you for your visit!</p>
            <p>Keep this receipt</p>
          </div>
        </div>

        <div className="receipt-actions">
          <button onClick={handlePrint}>🖨️ Print Receipt</button>
          <button onClick={onClose}>❌ Close</button>
        </div>
      </div>

      <style jsx>{`
        .receipt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .receipt-container {
          background: white;
          padding: 20px;
          border-radius: 10px;
          max-width: 400px;
        }

        .receipt-paper {
          background: white;
          border: 2px dashed #ccc;
          padding: 20px;
          font-family: 'Courier New', monospace;
        }

        .receipt-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }

        .receipt-header h1 {
          font-size: 24px;
          margin: 0;
        }

        .receipt-details,
        .receipt-items {
          margin: 15px 0;
        }

        .receipt-total {
          text-align: center;
          margin: 20px 0;
          font-size: 24px;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 10px 0;
        }

        .receipt-footer {
          text-align: center;
          font-size: 12px;
          margin-top: 15px;
        }

        .receipt-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .receipt-actions button {
          flex: 1;
          padding: 12px;
          font-size: 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        .receipt-actions button:first-child {
          background: #0070f3;
          color: white;
        }

        .receipt-actions button:last-child {
          background: #e0e0e0;
        }

        @media print {
          .receipt-overlay {
            background: white;
          }
          .receipt-actions {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
```

### **Update Form to Show Receipt**

**In `src/pages/index.tsx`:**

```typescript
import { useState } from 'react';
import { ReceiptPreview } from '../components/ReceiptPreview';

export default function Home() {
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  const handleSubmit = async (e) => {
    // ... existing code ...
    
    if (data.success) {
      setLastTransaction(data.data.transaction);
      setShowReceipt(true); // Show receipt preview
      setMessage('✅ Transaction created successfully!');
    }
  };

  return (
    <>
      {/* Existing form code */}
      
      {showReceipt && lastTransaction && (
        <ReceiptPreview 
          transaction={lastTransaction}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
```

---

## 📝 OPTION 3: CONSOLE/FILE OUTPUT

### **Simple Text Receipt**

**File: `server/utils/receipt-text.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import type { Transaction } from '../../shared/types';

const RECEIPTS_DIR = path.join(__dirname, '../../receipts');

if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

export function generateTextReceipt(transaction: Transaction): void {
  const receipt = `
╔════════════════════════════════════╗
║        PISCINE PILOT              ║
║     Swimming Club Receipt          ║
╠════════════════════════════════════╣
║ Date: ${new Date(transaction.created_at).toLocaleString().padEnd(28)} ║
║ Receipt #: ${transaction.id.slice(0, 8).padEnd(23)} ║
╠════════════════════════════════════╣
║ DETAILS                            ║
║ Type: ${transaction.type.toUpperCase().padEnd(28)} ║
║ Payment: ${transaction.payment_method.toUpperCase().padEnd(25)} ║
${transaction.customer_name ? `║ Customer: ${transaction.customer_name.padEnd(24)} ║` : ''}
${transaction.notes ? `║ Notes: ${transaction.notes.slice(0, 27).padEnd(27)} ║` : ''}
╠════════════════════════════════════╣
║                                    ║
║   TOTAL: ${((transaction.amount / 100).toFixed(2) + ' MAD').padStart(18).padEnd(24)} ║
║                                    ║
╠════════════════════════════════════╣
║     Thank you for your visit!      ║
║        Keep this receipt           ║
╚════════════════════════════════════╝
`;

  // Print to console
  console.log('\n' + receipt + '\n');

  // Save to file
  const filename = path.join(RECEIPTS_DIR, `receipt-${transaction.id}.txt`);
  fs.writeFileSync(filename, receipt);
  
  console.log(`📄 Receipt saved: ${filename}`);
}
```

---

## 🎯 COMPARISON

| Feature | PDF Generator | HTML Preview | Console/File |
|---------|---------------|--------------|--------------|
| **Easy to implement** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Looks professional** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Can be printed** | ✅ Yes | ✅ Yes | ⚠️ Plain text |
| **Storage** | PDF files | None | Text files |
| **Customer-ready** | ✅ Yes | ✅ Yes | ❌ No |

---

## 🚀 RECOMMENDED APPROACH

**For development/testing:**
→ Use **HTML Preview** (Option 2)

**For production without printer:**
→ Use **PDF Generator** (Option 1)

**For production with real printer:**
→ Use `node-thermal-printer` with actual hardware

---

## 🔄 TRANSITIONING TO REAL PRINTER

When you get a thermal printer, you can replace the simulation with:

```typescript
// Install real printer library
npm install node-thermal-printer

// Replace simulation code with:
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: '/dev/usb/lp0', // USB port
});

export async function printReceipt(transaction: Transaction) {
  printer.alignCenter();
  printer.bold(true);
  printer.println('PISCINE PILOT');
  printer.bold(false);
  printer.println('Swimming Club Receipt');
  printer.drawLine();
  
  // ... rest of receipt content
  
  try {
    await printer.execute();
    return true;
  } catch (error) {
    logger.error('Print failed', error);
    return false;
  }
}
```

**The same API, just different implementation!**

---

## ✅ QUICK START

**To add PDF receipts now:**

```bash
# 1. Install dependency
npm install pdfkit
npm install --save-dev @types/pdfkit

# 2. Create receipts folder
mkdir receipts
echo "*" > receipts/.gitignore  # Don't commit receipts to git

# 3. Create receipt.ts file (paste code from Option 1)

# 4. Update transactions.ts to generate receipt

# 5. Test
npm run dev
# Create transaction
# Check receipts/ folder
```

---

**END OF PRINTER SIMULATION GUIDE**

*This allows you to test the complete transaction flow including "printing" without physical hardware.*

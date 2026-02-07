import { useState } from 'react';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('entry');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/local/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(amount) * 100,
          type,
          payment_method: paymentMethod,
          customer_name: customerName || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Transaction created successfully!');
        setAmount('');
        setCustomerName('');
        setNotes('');
      } else {
        setMessage(`❌ Error: ${data.error.message}`);
      }
    } catch (error) {
      setMessage('❌ Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>🏊 Piscine Pilot</h1>
      <p>Local-First Revenue Control System</p>

      <form onSubmit={handleSubmit} style={{ marginTop: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label>
            Amount (MAD):
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            Type:
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="entry">Entry</option>
              <option value="membership">Membership</option>
              <option value="lesson">Lesson</option>
              <option value="rental">Rental</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            Payment Method:
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            Customer Name (optional):
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>
            Notes (optional):
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? 'Creating...' : 'Create Transaction'}
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${message.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '5px',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

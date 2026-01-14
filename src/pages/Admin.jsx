
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import './Admin.css';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Subscribe to changes
    const subscription = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            listings (title, link)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const retryOrder = async (orderId) => {
      // Reset status to 'paid' to trigger the bot again
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid', stripe_payment_id: 'RETRY_TRIGGER' }) // Simple flag for now
        .eq('id', orderId);
        
      if (error) alert("Failed to retry: " + error.message);
      else fetchOrders(); 
  };

  if (loading) return <div className="admin-container">Loading Orders...</div>;

  return (
    <div className="admin-container">
      <h1>Op Dropshipping Admin</h1>
      
      <table className="orders-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className={`status-${order.status}`}>
              <td>{new Date(order.created_at).toLocaleString()}</td>
              <td>
                <a href={order.listings?.link} target="_blank" rel="noreferrer">
                    {order.listings?.title?.substring(0, 30)}...
                </a>
              </td>
              <td>{order.user_email}</td>
              <td>
                <span className={`badge badge-${order.status}`}>
                    {order.status}
                </span>
                {order.status === 'failed' && (
                    <div className="error-msg">{order.stripe_payment_id}</div>
                )}
              </td>
              <td>${order.total_amount?.toFixed(2)}</td>
              <td>
                {order.status === 'failed' && (
                    <button onClick={() => retryOrder(order.id)} className="btn-retry">Retry Bot</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

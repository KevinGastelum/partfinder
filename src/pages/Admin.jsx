
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import './Admin.css';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchInventory();
    }

    const subscription = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, listings (title, link)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('listings')
        .select('id, make, model, part_name, title, price, link, created_at');
      setAllListings(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Delete listing
  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) alert('Delete failed: ' + error.message);
    else fetchInventory();
  };

  // Delete all duplicates of a title (keep one)
  const deleteDuplicates = async (title) => {
    if (!window.confirm(`Delete duplicates of "${title.substring(0, 40)}..."? (Keeps 1)`)) return;
    const dupes = allListings.filter(l => l.title === title);
    if (dupes.length <= 1) return;
    const idsToDelete = dupes.slice(1).map(l => l.id);
    const { error } = await supabase.from('listings').delete().in('id', idsToDelete);
    if (error) alert('Delete failed: ' + error.message);
    else fetchInventory();
  };

  // Clean ALL duplicates at once
  const cleanAllDuplicates = async () => {
    const titleCount = {};
    allListings.forEach(item => {
      titleCount[item.title] = (titleCount[item.title] || []);
      titleCount[item.title].push(item.id);
    });
    
    const duplicateTitles = Object.entries(titleCount).filter(([_, ids]) => ids.length > 1);
    const totalDupes = duplicateTitles.reduce((sum, [_, ids]) => sum + ids.length - 1, 0);
    
    if (totalDupes === 0) {
      alert('No duplicates found!');
      return;
    }
    
    if (!window.confirm(`Delete ${totalDupes} duplicate listings across ${duplicateTitles.length} titles? (Keeps 1 of each)`)) return;
    
    // Collect all IDs to delete (skip first of each group)
    const idsToDelete = duplicateTitles.flatMap(([_, ids]) => ids.slice(1));
    
    const { error } = await supabase.from('listings').delete().in('id', idsToDelete);
    if (error) alert('Delete failed: ' + error.message);
    else {
      alert(`Cleaned up ${idsToDelete.length} duplicates!`);
      fetchInventory();
    }
  };

  // Computed stats
  const inventoryStats = useMemo(() => {
    const vehicleMap = {};
    const titleCount = {};
    const partPrices = {}; // For variance calculation

    allListings.forEach(item => {
      const vehicleKey = `${item.make || 'Unknown'} ${item.model || 'Unknown'}`;
      vehicleMap[vehicleKey] = (vehicleMap[vehicleKey] || 0) + 1;
      titleCount[item.title] = (titleCount[item.title] || 0) + 1;
      
      // Collect prices per part for variance
      const partKey = item.part_name || 'Unknown';
      if (!partPrices[partKey]) partPrices[partKey] = [];
      if (item.price) partPrices[partKey].push(item.price);
    });

    const byVehicle = Object.entries(vehicleMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const duplicates = Object.entries(titleCount)
      .filter(([_, count]) => count > 1)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate avg and stddev per part
    const priceStats = {};
    Object.entries(partPrices).forEach(([part, prices]) => {
      if (prices.length > 0) {
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const stddev = Math.sqrt(variance);
        priceStats[part] = { avg, stddev, min: Math.min(...prices), max: Math.max(...prices) };
      }
    });

    return { total: allListings.length, byVehicle, duplicates, priceStats };
  }, [allListings]);

  // Check if price is an outlier (> 2 stddev from mean)
  const isPriceOutlier = (partName, price) => {
    const stats = inventoryStats.priceStats[partName];
    if (!stats || !price) return null;
    const diff = Math.abs(price - stats.avg);
    if (diff > stats.stddev * 2) {
      return price > stats.avg ? 'high' : 'low';
    }
    return null;
  };

  // Filtered listings by selected vehicle
  const vehicleFilteredListings = useMemo(() => {
    if (!selectedVehicle) return allListings;
    return allListings.filter(item => 
      `${item.make || 'Unknown'} ${item.model || 'Unknown'}` === selectedVehicle
    );
  }, [allListings, selectedVehicle]);

  // Parts breakdown (based on vehicle filter)
  const partStats = useMemo(() => {
    const partMap = {};
    vehicleFilteredListings.forEach(item => {
      const partKey = item.part_name || 'Unknown';
      partMap[partKey] = (partMap[partKey] || 0) + 1;
    });
    return Object.entries(partMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [vehicleFilteredListings]);

  // Final filtered listings (vehicle + part)
  const filteredListings = useMemo(() => {
    let result = vehicleFilteredListings;
    if (selectedPart) {
      result = result.filter(item => (item.part_name || 'Unknown') === selectedPart);
    }
    return result.slice(0, 50);
  }, [vehicleFilteredListings, selectedPart]);

  // Price outliers in current selection
  const priceOutliers = useMemo(() => {
    return filteredListings.filter(item => isPriceOutlier(item.part_name, item.price));
  }, [filteredListings, inventoryStats]);

  const handleVehicleClick = (vehicleName) => {
    if (selectedVehicle === vehicleName) {
      setSelectedVehicle(null);
      setSelectedPart(null);
    } else {
      setSelectedVehicle(vehicleName);
      setSelectedPart(null);
    }
  };

  const handlePartClick = (partName) => {
    setSelectedPart(selectedPart === partName ? null : partName);
  };

  const retryOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid', stripe_payment_id: 'RETRY_TRIGGER' })
      .eq('id', orderId);
    if (error) alert("Failed to retry: " + error.message);
    else fetchOrders();
  };

  const renderOrders = () => (
    <table className="orders-table">
      <thead>
        <tr>
          <th>Date</th><th>Item</th><th>Customer</th><th>Status</th><th>Total</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id} className={`status-${order.status}`}>
            <td>{new Date(order.created_at).toLocaleString()}</td>
            <td><a href={order.listings?.link} target="_blank" rel="noreferrer">{order.listings?.title?.substring(0, 30)}...</a></td>
            <td>{order.user_email}</td>
            <td>
              <span className={`badge badge-${order.status}`}>{order.status}</span>
              {order.status === 'failed' && <div className="error-msg">{order.stripe_payment_id}</div>}
            </td>
            <td>${order.total_amount?.toFixed(2)}</td>
            <td>{order.status === 'failed' && <button onClick={() => retryOrder(order.id)} className="btn-retry">Retry Bot</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderInventory = () => (
    <div className="inventory-dashboard">
      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Listings</h3>
          <span className="stat-value">{inventoryStats.total.toLocaleString()}</span>
        </div>
        <div className="stat-card warning">
          <h3>Duplicates</h3>
          <span className="stat-value">{inventoryStats.duplicates.length}</span>
        </div>
        <div className="stat-card danger">
          <h3>Price Outliers</h3>
          <span className="stat-value">{priceOutliers.length}</span>
        </div>
        <div className="stat-card info">
          <h3>Showing</h3>
          <span className="stat-value">{filteredListings.length}</span>
        </div>
      </div>

      {/* Filter Breadcrumb */}
      {(selectedVehicle || selectedPart) && (
        <div className="filter-breadcrumb">
          <span>Filtering: </span>
          {selectedVehicle && <span className="filter-tag" onClick={() => { setSelectedVehicle(null); setSelectedPart(null); }}>🚗 {selectedVehicle} ✕</span>}
          {selectedPart && <span className="filter-tag" onClick={() => setSelectedPart(null)}>🔧 {selectedPart} ✕</span>}
          <button className="clear-filters" onClick={() => { setSelectedVehicle(null); setSelectedPart(null); }}>Clear All</button>
        </div>
      )}

      {/* Charts Row */}
      <div className="charts-row">
        {/* By Vehicle */}
        <div className="chart-card">
          <h3>📊 By Vehicle <span className="hint">(click to filter)</span></h3>
          <ul className="stat-list clickable">
            {inventoryStats.byVehicle.map(v => (
              <li key={v.name} className={selectedVehicle === v.name ? 'selected' : ''} onClick={() => handleVehicleClick(v.name)}>
                <span className="label">{v.name}</span>
                <span className="count">{v.count}</span>
                <div className="bar" style={{ width: `${(v.count / (inventoryStats.byVehicle[0]?.count || 1)) * 100}%` }} />
              </li>
            ))}
          </ul>
        </div>

        {/* By Part */}
        <div className="chart-card">
          <h3>🔧 By Part {selectedVehicle && <span className="hint">(for {selectedVehicle})</span>}</h3>
          <ul className="stat-list clickable">
            {partStats.map(p => {
              const stats = inventoryStats.priceStats[p.name];
              return (
                <li key={p.name} className={selectedPart === p.name ? 'selected' : ''} onClick={() => handlePartClick(p.name)}>
                  <span className="label">
                    {p.name}
                    {stats && <span className="price-range"> (${stats.min.toFixed(0)}-${stats.max.toFixed(0)})</span>}
                  </span>
                  <span className="count">{p.count}</span>
                  <div className="bar part-bar" style={{ width: `${(p.count / (partStats[0]?.count || 1)) * 100}%` }} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Listings Table */}
      {(selectedVehicle || selectedPart) && (
        <div className="listings-section">
          <h3>📋 Listings ({filteredListings.length} shown)</h3>
          <table className="listings-table">
            <thead>
              <tr><th>Title</th><th>Part</th><th>Price</th><th>Link</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredListings.map(item => {
                const outlier = isPriceOutlier(item.part_name, item.price);
                return (
                  <tr key={item.id} className={outlier ? `price-outlier-${outlier}` : ''}>
                    <td>{item.title?.substring(0, 45)}...</td>
                    <td>{item.part_name}</td>
                    <td>
                      ${item.price?.toFixed(2)}
                      {outlier && <span className={`outlier-badge ${outlier}`}>{outlier === 'high' ? '📈' : '📉'}</span>}
                    </td>
                    <td><a href={item.link} target="_blank" rel="noreferrer">eBay ↗</a></td>
                    <td><button className="btn-delete" onClick={() => deleteListing(item.id)}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Duplicates */}
      {inventoryStats.duplicates.length > 0 && (
        <div className="alert-section">
          <div className="section-header">
            <h3>⚠️ Potential Duplicates</h3>
            <button className="btn-cleanup-all" onClick={cleanAllDuplicates}>🧹 Clean All ({inventoryStats.duplicates.reduce((sum, d) => sum + d.count - 1, 0)})</button>
          </div>
          <table className="mini-table">
            <thead><tr><th>Title</th><th>Count</th><th>Actions</th></tr></thead>
            <tbody>
              {inventoryStats.duplicates.map((d, i) => (
                <tr key={i}>
                  <td>{d.title?.substring(0, 50)}...</td>
                  <td>{d.count}</td>
                  <td><button className="btn-cleanup" onClick={() => deleteDuplicates(d.title)}>Clean Up</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="admin-container">Loading...</div>;

  return (
    <div className="admin-container">
      <h1>PartFinder Admin Dashboard</h1>
      <div className="admin-tabs">
        <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>📦 Orders</button>
        <button className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📊 Inventory</button>
      </div>
      {activeTab === 'orders' ? renderOrders() : renderInventory()}
    </div>
  );
}

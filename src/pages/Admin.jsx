
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel,
  flexRender 
} from '@tanstack/react-table';
import './Admin.css';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory'); // Default to Inventory
  const [orders, setOrders] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [totalCount, setTotalCount] = useState(0); // Add separate state for total DB count
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // -- TanStack Table State --
  const [sorting, setSorting] = useState([{ id: 'price', desc: true }]); // Default sort High-Low Price
  const [globalFilter, setGlobalFilter] = useState('');
  
  // -- Server-Side Pagination State --
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50); // Rows per page
  
  // -- Server-Side Aggregates (Full Dataset) --
  const [aggregates, setAggregates] = useState({
    vehicles: [], // [{name, count}]
    models: [],   // NEW: [{name, count}]
    parts: [],    // [{name, count}]
    years: [],    // [{name, count}]
  });
  // Store raw data for client-side cross-filtering
  const [fullAggregateData, setFullAggregateData] = useState({
    makeData: [],
    partData: [],
    yearData: []
  });
  const [matchingCount, setMatchingCount] = useState(0); // Filtered result count
  
  // -- Server-Side Filters --
  const [filterYear, setFilterYear] = useState('');
  const [filterMake, setFilterMake] = useState('');
  const [filterPart, setFilterPart] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Server-side search
  
  // Interactive Card Filters (for cross-filtering aggregate cards)
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null); // NEW
  const [selectedPart, setSelectedPart] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showOutliersOnly, setShowOutliersOnly] = useState(false);

  // Auth State Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false); // Stop loading if no session
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return; // Don't fetch if not logged in

    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchInventory();
      fetchAggregates();
      // Also get total count (unfiltered) for stats header
      supabase.from('listings').select('*', { count: 'exact', head: true })
        .then(({ count }) => { if (count !== null) setTotalCount(count); });
    }

    const subscription = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [activeTab, session]); // Added session to trigger fetch on login
  
  // Re-fetch when filters change (both dropdown filters AND card click filters)
  useEffect(() => {
    if (!session || activeTab !== 'inventory') return;
    setPageIndex(0); // Reset to first page when filters change
    fetchInventory(0, pageSize, { year: filterYear || selectedYear, make: filterMake || selectedVehicle, model: selectedModel, part: filterPart || selectedPart, search: searchQuery });
  }, [filterYear, filterMake, filterPart, selectedVehicle, selectedModel, selectedPart, selectedYear, searchQuery]);

  const fetchOrders = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('orders')
        .select(`*, listings (title, link)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Orders Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch aggregate counts from FULL dataset (for filter dropdowns)
  const fetchAggregates = async () => {
    try {
      console.log('🔄 Fetching aggregates from FULL 22k dataset...');
      
      // Helper function to fetch all rows with pagination
      const fetchAllRows = async (column) => {
        let allData = [];
        let from = 0;
        const batchSize = 1000; // Supabase default limit
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('listings')
            .select(column)
            .not(column, 'is', null)
            .range(from, from + batchSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += batchSize;
            hasMore = data.length === batchSize; // Continue if we got a full batch
            console.log(`  Fetched ${allData.length} ${column} values so far...`);
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      // Fetch all unique values for each column
      // IMPORTANT: Fetch ALL rows with make, model, part_name, AND year together for cross-filtering
      const [allRowsData] = await Promise.all([
        fetchAllRows('make, model, part_name, year')
      ]);
      
      // Extract individual columns from the full dataset
      const makeData = allRowsData;
      const partData = allRowsData;
      const yearData = allRowsData;
      
      // Count occurrences client-side
      const makeCounts = {};
      makeData?.forEach(r => { if (r.make) makeCounts[r.make] = (makeCounts[r.make] || 0) + 1; });
      
      const modelCounts = {};
      allRowsData?.forEach(r => { if (r.model) modelCounts[r.model] = (modelCounts[r.model] || 0) + 1; });

      const partCounts = {};
      partData?.forEach(r => { if (r.part_name) partCounts[r.part_name] = (partCounts[r.part_name] || 0) + 1; });
      
      const yearCounts = {};
      yearData?.forEach(r => { if (r.year) yearCounts[r.year] = (yearCounts[r.year] || 0) + 1; });
      
      setAggregates({
        vehicles: Object.entries(makeCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count).slice(0, 20),
        models: Object.entries(modelCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count).slice(0, 20),
        parts: Object.entries(partCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count),
        years: Object.entries(yearCounts).map(([name, count]) => ({name, count})).sort((a,b) => Number(a.name) - Number(b.name)),
      });
      
      // Store raw data for cross-filtering
      setFullAggregateData({
        makeData,
        partData,
        yearData
      });
      
      console.log('✅ Aggregates loaded from FULL dataset:', Object.keys(makeCounts).length, 'makes,', Object.keys(partCounts).length, 'parts,', Object.keys(yearCounts).length, 'years');
      console.log('   Total rows processed:', makeData.length);
    } catch (err) {
      console.error('Error fetching aggregates:', err);
    }
  };

  // Fetch inventory with server-side filters
  const fetchInventory = async (page = pageIndex, size = pageSize, filters = {}) => {
    setLoading(true);
    try {
      setError(null);
      
      // Build query with filters
      const from = page * size;
      const to = from + size - 1;
      
      let query = supabase
        .from('listings')
        .select('id, make, model, part_name, title, price, link, created_at, year', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply server-side filters (both dropdown filters AND card click filters)
      if (filters.year || filterYear || selectedYear) {
        query = query.eq('year', filters.year || filterYear || selectedYear);
      }
      if (filters.make || filterMake || selectedVehicle) {
        query = query.eq('make', filters.make || filterMake || selectedVehicle);
      }
      if (selectedModel) {
        query = query.eq('model', selectedModel);
      }
      if (filters.part || filterPart || selectedPart) {
        query = query.eq('part_name', filters.part || filterPart || selectedPart);
      }
      if (filters.search || searchQuery) {
        query = query.ilike('title', `%${filters.search || searchQuery}%`);
      }
      
      // Apply pagination
      query = query.range(from, to);
      
      const { data, error, count } = await query;

      if (error) throw error;

      setAllListings(data);
      if (count !== null) {
        setMatchingCount(count); // Filtered count
      }
      console.log(`Fetched page ${page + 1} (${data.length} rows) of ${count} matching`);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("Inventory Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete listing
  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    setIsDeleting(true);
    try {
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw error;
        await fetchInventory();
    } catch (err) {
        setError("Delete Failed: " + err.message);
    } finally {
        setIsDeleting(false);
    }
  };

  // Cross-filtered aggregates for interactive cards
  const filteredAggregates = useMemo(() => {
    // If no card filter is active, return full aggregates
    if (!selectedVehicle && !selectedModel && !selectedPart && !selectedYear) {
      return aggregates;
    }

    // Client-side cross-filtering using raw data
    const { makeData, partData, yearData } = fullAggregateData;
    
    if (!makeData.length) return aggregates; // Data not loaded yet

    // Filter the raw data based on selections
    let filteredMakes = makeData;
    let filteredModels = makeData; // Uses same dataset
    let filteredParts = partData;
    let filteredYears = yearData;

    if (selectedVehicle) {
      // Filter parts and years to only those with selected vehicle
      filteredModels = makeData.filter(row => row.make === selectedVehicle);
      filteredParts = partData.filter(row => row.make === selectedVehicle);
      filteredYears = yearData.filter(row => row.make === selectedVehicle);
    }
    
    if (selectedModel) {
        filteredMakes = makeData.filter(row => row.model === selectedModel);
        filteredParts = partData.filter(row => row.model === selectedModel);
        filteredYears = yearData.filter(row => row.model === selectedModel);
    }

    if (selectedPart) {
      // Filter makes and years to only those with selected part
      filteredMakes = makeData.filter(row => row.part_name === selectedPart);
      filteredModels = makeData.filter(row => row.part_name === selectedPart);
      filteredYears = yearData.filter(row => row.part_name === selectedPart);
    }

    if (selectedYear) {
      // Filter makes and parts to only those with selected year
      filteredMakes = makeData.filter(row => row.year === selectedYear);
      filteredModels = makeData.filter(row => row.year === selectedYear);
      filteredParts = partData.filter(row => row.year === selectedYear);
    }

    // Count occurrences
    const makeCounts = {};
    filteredMakes.forEach(r => { makeCounts[r.make] = (makeCounts[r.make] || 0) + 1; });

    const modelCounts = {};
    filteredModels.forEach(r => { if(r.model) modelCounts[r.model] = (modelCounts[r.model] || 0) + 1; });

    const partCounts = {};
    filteredParts.forEach(r => { partCounts[r.part_name] = (partCounts[r.part_name] || 0) + 1; });

    const yearCounts = {};
    filteredYears.forEach(r => { yearCounts[r.year] = (yearCounts[r.year] || 0) + 1; });

    return {
      vehicles: Object.entries(makeCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count).slice(0, 20),
      models: Object.entries(modelCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count).slice(0, 20),
      parts: Object.entries(partCounts).map(([name, count]) => ({name, count})).sort((a,b) => b.count - a.count),
      years: Object.entries(yearCounts).map(([name, count]) => ({name, count})).sort((a,b) => Number(a.name) - Number(b.name)),
    };
  }, [aggregates, fullAggregateData, selectedVehicle, selectedModel, selectedPart, selectedYear]);

  // Delete duplicates (keep one, delete rest)
  const deleteDuplicates = async (title) => {
    if (!window.confirm(`Delete duplicates of "${title.substring(0, 40)}..."? (Keeps 1)`)) return;
    setIsDeleting(true);
    try {
        // Find all listings with this title
        const dups = allListings.filter(item => item.title === title);
        if (dups.length <= 1) return;

        // Sort by created_at (keep oldest) or price? Let's keep one with price.
        // Simple strategy: keep first index.
        const toDelete = dups.slice(1);
        const idsToDelete = toDelete.map(d => d.id);

        const { error } = await supabase
        .from('listings')
        .delete()
        .in('id', idsToDelete);

        if (error) throw error;
        
        // Optimistic update or refetch
        fetchInventory();
    } catch (err) {
        setError("Cleanup Failed: " + err.message);
    } finally {
        setIsDeleting(false);
    }
  };

  const cleanAllDuplicates = async () => {
    // Use the already computed duplicates from inventoryStats if available, otherwise recalc
    // Since inventoryStats is defined below, and this is called on click, it should be available via closure if we move this definition?
    // Actually, let's just re-calculate to be safe and independent of render cycle logic placement issues
    const titleCount = {};
    allListings.forEach(item => {
      titleCount[item.title] = (titleCount[item.title] || []);
      titleCount[item.title].push(item.id);
    });
    
    // Identify IDs to delete (keep the first one of each group)
    const allIdsToDelete = [];
    Object.values(titleCount).forEach(ids => {
        if (ids.length > 1) {
            // Keep first, delete rest
            allIdsToDelete.push(...ids.slice(1));
        }
    });

    if (allIdsToDelete.length === 0) {
        alert("No duplicates found to clean.");
        return;
    }

    if (!window.confirm(`Are you sure you want to delete ${allIdsToDelete.length} duplicate listings?`)) return;
    
    setIsDeleting(true);
    try {
        // Batch delete
        const batchSize = 100;
        for (let i = 0; i < allIdsToDelete.length; i += batchSize) {
            const batch = allIdsToDelete.slice(i, i + batchSize);
            const { error } = await supabase.from('listings').delete().in('id', batch);
            if (error) throw error;
        }

        fetchInventory();
    } catch (err) {
        setError("Bulk Cleanup Failed: " + err.message);
    } finally {
        setIsDeleting(false);
    }
  };

  // Computed stats
  const inventoryStats = useMemo(() => {
    const vehicleMap = {};
    const titleCount = {};
    const partNameMap = {};
    const yearMap = {};
    const partPrices = {}; // For variance calculation

    allListings.forEach(item => {
      const vehicleKey = `${item.make || 'Unknown'} ${item.model || 'Unknown'}`;
      vehicleMap[vehicleKey] = (vehicleMap[vehicleKey] || 0) + 1;
      
      const partKey = item.part_name || 'Other';
      partNameMap[partKey] = (partNameMap[partKey] || 0) + 1;

      const yearKey = item.year || 'Unknown';
      yearMap[yearKey] = (yearMap[yearKey] || 0) + 1;

      titleCount[item.title] = (titleCount[item.title] || 0) + 1;
      
      // Collect prices per part for variance
      if (!partPrices[partKey]) partPrices[partKey] = [];
      if (item.price) partPrices[partKey].push(item.price);
    });

    const byVehicle = Object.entries(vehicleMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const byPart = Object.entries(partNameMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
      
    const byYear = Object.entries(yearMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name - b.name); // Sort years numerically

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
    
    // Identify outliers
    let outliers = [];
    allListings.forEach(item => {
        const part = item.part_name || 'Other';
        const stats = priceStats[part];
        if (stats && item.price) {
            const zScore = (item.price - stats.avg) / (stats.stddev || 1);
            if (Math.abs(zScore) > 2) {
                outliers.push({ ...item, type: zScore > 0 ? 'high' : 'low', diff: Math.round(((item.price - stats.avg)/stats.avg)*100) });
            }
        }
    });

    return { total: allListings.length, byVehicle, byPart, byYear, duplicates, priceStats, outliers }; // Added byPart, byYear
  }, [allListings]);

  // Filtered listings logic - SERVER-SIDE filtering via fetchInventory
  // Only apply client-side outliers filter, NOT selectedVehicle/Part/Year
  const dataForTable = useMemo(() => {
    // Server-side filtering already applied selectedVehicle/Part/Year in fetchInventory
    // Only need to handle outliers filter here (client-side only)
    let data = showOutliersOnly ? inventoryStats.outliers : allListings;
    
    return data;
  }, [allListings, showOutliersOnly, inventoryStats.outliers]);

  const detectBrand = (title) => {
      const brands = ['Bosch', 'Denso', 'NGK', 'Brembo', 'Moog', 'ACDelco', 'Motorcraft', 'Genuine', 'OEM', 'TRW', 'Delphi'];
      for (const b of brands) {
          if (title?.toLowerCase().includes(b.toLowerCase())) return b;
      }
      return ''; // or 'Generic'
  };

  // -- Table Setup --
  const columns = useMemo(() => [
    {
      header: 'Vehicle',
      accessorFn: row => `${row.year || ''} ${row.make} ${row.model}`,
      cell: info => info.getValue(),
    },
    {
      header: 'Part',
      accessorKey: 'part_name',
    },
    {
      header: 'Title',
      accessorKey: 'title',
      cell: info => (
        <div>
           {info.getValue()}
           {detectBrand(info.getValue()) && <span className="badge badge-brand" style={{marginLeft:'6px', background:'#8e44ad33', color:'#9b59b6', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px'}}>{detectBrand(info.getValue())}</span>}
        </div>
      )
    },
    {
        header: 'Year',
        accessorKey: 'year',
    },
    {
        header: 'Brand',
        id: 'brand',
        accessorFn: row => detectBrand(row.title) || 'Unknown',
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: info => `$${info.getValue()?.toFixed(2)}`,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: info => (
        <div className="action-buttons">
          <a href={info.row.original.link} target="_blank" rel="noreferrer" className="btn-link">↗</a>
          <button className="btn-delete" onClick={() => deleteListing(info.row.original.id)}>🗑</button>
        </div>
      )
    }
  ], []);

  const table = useReactTable({
    data: dataForTable,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination: { pageIndex, pageSize }, // Controlled pagination state
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // SERVER-SIDE PAGINATION CONFIG
    manualPagination: true,
    pageCount: Math.ceil(matchingCount / pageSize), // Use matchingCount (filtered) not totalCount
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' 
        ? updater({ pageIndex, pageSize }) 
        : updater;
      setPageIndex(newState.pageIndex);
      setPageSize(newState.pageSize);
      fetchInventory(newState.pageIndex, newState.pageSize);
    },
  });

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
      {/* Header Actions */}
      <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'1rem'}}>
          <button 
            onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                    + ["id,title,price,make,model,year,brand,part_name,source,link"].join(",") + "\n"
                    + allListings.map(e => [
                        e.id,
                        `"${(e.title||'').replace(/"/g, '""')}"`, // Escape quotes
                        e.price,
                        e.make,
                        e.model,
                        e.year,
                        e.brand || detectBrand(e.title),
                        e.part_name,
                        e.source,
                        e.link
                    ].join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
            }}
            className="btn-secondary"
            style={{padding:'8px 16px', background:'#27ae60', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px'}}
          >
            📥 Export to CSV
          </button>
      </div>

      {/* Server-Side Filter Bar */}
      <div className="filter-bar" style={{display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px'}}>
        <select 
          value={filterYear} 
          onChange={(e) => setFilterYear(e.target.value)}
          style={{padding: '10px 16px', borderRadius: '8px', background: '#1a1a2e', color: 'white', border: '1px solid #333', minWidth: '120px'}}
        >
          <option value="">All Years</option>
          {aggregates.years.map(y => (
            <option key={y.name} value={y.name}>{y.name} ({y.count})</option>
          ))}
        </select>
        
        <select 
          value={filterMake} 
          onChange={(e) => setFilterMake(e.target.value)}
          style={{padding: '10px 16px', borderRadius: '8px', background: '#1a1a2e', color: 'white', border: '1px solid #333', minWidth: '150px'}}
        >
          <option value="">All Makes</option>
          {aggregates.vehicles.map(v => (
            <option key={v.name} value={v.name}>{v.name} ({v.count})</option>
          ))}
        </select>
        
        <select 
          value={filterPart} 
          onChange={(e) => setFilterPart(e.target.value)}
          style={{padding: '10px 16px', borderRadius: '8px', background: '#1a1a2e', color: 'white', border: '1px solid #333', minWidth: '150px'}}
        >
          <option value="">All Parts</option>
          {aggregates.parts.map(p => (
            <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
          ))}
        </select>
        
        <button 
          onClick={() => { setFilterYear(''); setFilterMake(''); setFilterPart(''); }}
          style={{padding: '10px 20px', borderRadius: '8px', background: '#333', color: 'white', border: 'none', cursor: 'pointer'}}
        >
          Clear Filters
        </button>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPageIndex(0); fetchInventory(0, pageSize, { year: filterYear, make: filterMake, part: filterPart, search: searchQuery }); } }}
          placeholder="🔍 Search in full dataset..."
          style={{padding: '10px 16px', borderRadius: '8px', background: '#1a1a2e', color: 'white', border: '1px solid #333', minWidth: '220px', flexGrow: 1}}
        />
        
        {searchQuery && (
          <button 
            onClick={() => { setSearchQuery(''); setPageIndex(0); fetchInventory(0, pageSize, { year: filterYear, make: filterMake, part: filterPart }); }}
            style={{padding: '10px 16px', borderRadius: '8px', background: '#555', color: 'white', border: 'none', cursor: 'pointer'}}
            title="Clear search"
          >
            ✕
          </button>
        )}
        
        <span style={{marginLeft: 'auto', opacity: 0.7}}>
          {(filterYear || filterMake || filterPart) 
            ? `Showing ${matchingCount.toLocaleString()} of ${totalCount.toLocaleString()}`
            : `${totalCount.toLocaleString()} total listings`
          }
        </span>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Total Listings</h3>
          <span className="stat-value">{totalCount.toLocaleString()}</span>
        </div>
        <div className="stat-card warning">
          <h3>Duplicates</h3>
          <span className="stat-value">{inventoryStats.duplicates.length}</span>
        </div>
        <div className="stat-card danger" onClick={() => setShowOutliersOnly(!showOutliersOnly)} style={{cursor: 'pointer'}}>
          <h3>Price Outliers</h3>
          <span className="stat-value">{inventoryStats.outliers.length} {showOutliersOnly ? ' (Showing)' : ''}</span>
        </div>
        <div className="stat-card brand">
          <h3>Matching</h3>
          <span className="stat-value">{matchingCount.toLocaleString()}</span>
        </div>
        <div className="stat-card" style={{gridColumn: 'span 2'}}>
          <h3>Price Trends</h3>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-around', height:'60px'}}>
             <div style={{textAlign:'center'}}>
                 <div style={{fontSize:'0.8rem', opacity:0.6}}>Avg Price</div>
                 <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{(allListings.reduce((sum, i) => sum + (i.price||0), 0) / (allListings.length||1)).toFixed(2)}</div>
             </div>
             <div style={{textAlign:'center'}}>
                 <div style={{fontSize:'0.8rem', opacity:0.6}}>Most Common Year</div>
                 <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{inventoryStats.byYear[inventoryStats.byYear.length-1]?.name || 'N/A'}</div>
             </div>
             <div style={{textAlign:'center'}}>
                 <div style={{fontSize:'0.8rem', opacity:0.6}}>Inventory Value</div>
                 <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>${(allListings.reduce((sum, i) => sum + (i.price||0), 0)).toLocaleString()}</div>
             </div>
          </div>
        </div>
      </div>
      {allListings.length === 0 && (
        <div className="info-message" style={{textAlign:'center', padding:'2rem', opacity:0.7}}>
            <p>No listings found. If you expect data, check RLS policies or database connection.</p>
        </div>
      )}

      {/* Filter Breadcrumb */}
      {(selectedVehicle || selectedModel || selectedPart || selectedYear || showOutliersOnly) && (
        <div className="filter-breadcrumb">
          <span>Filters: </span>
          {selectedVehicle && <span className="filter-tag" onClick={() => { setSelectedVehicle(null); setSelectedModel(null); }}>🚗 {selectedVehicle} ✕</span>}
          {selectedModel && <span className="filter-tag" onClick={() => setSelectedModel(null)}>🚘 {selectedModel} ✕</span>}
          {selectedPart && <span className="filter-tag" onClick={() => setSelectedPart(null)}>🔧 {selectedPart} ✕</span>}
          {selectedYear && <span className="filter-tag" onClick={() => setSelectedYear(null)}>🗓️ {selectedYear} ✕</span>}
          {showOutliersOnly && <span className="filter-tag" onClick={() => setShowOutliersOnly(false)}>🚨 Outliers Only ✕</span>}
          <button className="clear-filters" onClick={() => { setSelectedVehicle(null); setSelectedModel(null); setSelectedPart(null); setSelectedYear(null); setShowOutliersOnly(false); }}>Clear All</button>
        </div>
      )}

      {/* Interactive Card Filter Context Bar */}
      {(selectedVehicle || selectedModel || selectedPart || selectedYear) && (
        <div className="filter-context-bar" style={{display:'flex', alignItems:'center', gap:'12px', padding:'16px', background:'rgba(52, 152, 219, 0.1)', border:'1px solid rgba(52, 152, 219, 0.3)', borderRadius:'12px', marginBottom:'20px'}}>
          <span style={{fontWeight:'600', fontSize:'0.95rem'}}>📊 Dashboard Filtered By:</span>
          {selectedVehicle && (
            <span className="filter-badge" style={{background:'var(--color-primary)', color:'white', padding:'6px 12px', borderRadius:'16px', fontSize:'0.9rem', cursor:'pointer'}} onClick={() => setSelectedVehicle(null)}>
              Make: {selectedVehicle} ✕
            </span>
          )}
          {selectedModel && (
            <span className="filter-badge" style={{background:'#e67e22', color:'white', padding:'6px 12px', borderRadius:'16px', fontSize:'0.9rem', cursor:'pointer'}} onClick={() => setSelectedModel(null)}>
              Model: {selectedModel} ✕
            </span>
          )}
          {selectedPart && (
            <span className="filter-badge" style={{background:'#2ecc71', color:'white', padding:'6px 12px', borderRadius:'16px', fontSize:'0.9rem', cursor:'pointer'}} onClick={() => setSelectedPart(null)}>
              Part: {selectedPart} ✕
            </span>
          )}
          {selectedYear && (
            <span className="filter-badge" style={{background:'#9b59b6', color:'white', padding:'6px 12px', borderRadius:'16px', fontSize:'0.9rem', cursor:'pointer'}} onClick={() => setSelectedYear(null)}>
              Year: {selectedYear} ✕
            </span>
          )}
          <button onClick={() => { setSelectedVehicle(null); setSelectedModel(null); setSelectedPart(null); setSelectedYear(null); }} style={{marginLeft:'auto', padding:'8px 16px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'white', cursor:'pointer'}}>
            Clear Dashboard Filters
          </button>
        </div>
      )}

      {/* Data Overview Cards - INTERACTIVE with cross-filtering */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>By Make {selectedVehicle && <span style={{fontSize:'0.8rem', opacity:0.7}}>(\u2714 Filtered)</span>}</h3>
          <ul className="stat-list clickable">
            {filteredAggregates.vehicles.slice(0, 10).map(stat => (
              <li 
                key={stat.name}
                onClick={() => setSelectedVehicle(selectedVehicle === stat.name ? null : stat.name)}
                style={{
                  background: selectedVehicle === stat.name ? 'rgba(52, 152, 219, 0.2)' : 'transparent',
                  borderLeft: selectedVehicle === stat.name ? '3px solid var(--color-primary)' : 'none',
                  paddingLeft: selectedVehicle === stat.name ? '12px' : '8px',
                  cursor: 'pointer'
                }}
              >
                <div className="bar" style={{width: `${(stat.count / totalCount) * 100}%`}}></div>
                <span className="label">{stat.name}</span>
                <span className="count">{stat.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="chart-card">
          <h3>By Model {selectedModel && <span style={{fontSize:'0.8rem', opacity:0.7}}>(\u2714 Filtered)</span>}</h3>
          <ul className="stat-list clickable">
             {filteredAggregates.models.slice(0, 10).map(stat => (
              <li 
                key={stat.name}
                onClick={() => setSelectedModel(selectedModel === stat.name ? null : stat.name)}
                style={{
                  background: selectedModel === stat.name ? 'rgba(230, 126, 34, 0.2)' : 'transparent',
                  borderLeft: selectedModel === stat.name ? '3px solid #e67e22' : 'none',
                  paddingLeft: selectedModel === stat.name ? '12px' : '8px',
                  cursor: 'pointer'
                }}
              >
                <div className="bar model-bar" style={{width: `${(stat.count / (filteredAggregates.models[0]?.count || 1)) * 100}%`, background: '#e67e22'}}></div>
                <span className="label" title={stat.name}>{stat.name.substring(0, 20)}</span>
                <span className="count">{stat.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chart-card">
          <h3>By Part {selectedPart && <span style={{fontSize:'0.8rem', opacity:0.7}}>(\u2714 Filtered)</span>}</h3>
          <ul className="stat-list clickable">
             {filteredAggregates.parts.slice(0, 10).map(stat => (
              <li 
                key={stat.name}
                onClick={() => setSelectedPart(selectedPart === stat.name ? null : stat.name)}
                style={{
                  background: selectedPart === stat.name ? 'rgba(46, 204, 113, 0.2)' : 'transparent',
                  borderLeft: selectedPart === stat.name ? '3px solid #2ecc71' : 'none',
                  paddingLeft: selectedPart === stat.name ? '12px' : '8px',
                  cursor: 'pointer'
                }}
              >
                <div className="bar part-bar" style={{width: `${(stat.count / (filteredAggregates.parts[0]?.count || 1)) * 100}%`}}></div>
                <span className="label">{stat.name}</span>
                <span className="count">{stat.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="chart-card">
            <h3>By Year {selectedYear && <span style={{fontSize:'0.8rem', opacity:0.7}}>(\u2714 Filtered)</span>}</h3>
            <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
                {filteredAggregates.years.map(stat => (
                    <button 
                        key={stat.name}
                        onClick={() => setSelectedYear(selectedYear === stat.name ? null : stat.name)}
                        style={{
                            background: selectedYear === stat.name ? '#9b59b6' : 'rgba(255,255,255,0.05)',
                            border: selectedYear === stat.name ? '2px solid #9b59b6' : '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: selectedYear === stat.name ? 'bold' : 'normal'
                        }}
                    >
                        {stat.name} <span style={{opacity:0.5, fontSize:'0.8em'}}>({stat.count.toLocaleString()})</span>
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* NEW: TanStack Table Section */}
      <div className="listings-section table-section">

        <table className="listings-table sortable">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted()] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="pagination">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
            <span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
            <select 
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
            >
                {[15, 30, 50, 100].map(pageSize => (
                    <option key={pageSize} value={pageSize}>Show {pageSize}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Duplicates Section (Kept for "Clean All" utility) */}
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

  if (loading && !session) return <div className="admin-container">Loading Auth...</div>;
  if (!session) {
      return (
          <div className="admin-container" style={{maxWidth:'400px', textAlign:'center', marginTop:'100px'}}>
              <h1>{isSignUp ? 'Admin Registration' : 'Admin Login'}</h1>
              <p style={{marginBottom:'20px', opacity:0.7}}>Secure Access Required</p>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  const email = e.target.email.value;
                  const password = e.target.password.value;
                  const { error } = isSignUp 
                    ? await supabase.auth.signUp({ email, password })
                    : await supabase.auth.signInWithPassword({ email, password });
                  
                  setLoading(false);
                  if (error) {
                      alert(error.message);
                  } else if (isSignUp) {
                      alert("Registration successful! Please check your email or login.");
                      setIsSignUp(false);
                  }
              }}>
                  <input name="email" type="email" placeholder="Email" style={{display:'block', width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'6px', border:'1px solid #333', background:'#111', color:'white'}} required />
                  <input name="password" type="password" placeholder="Password" style={{display:'block', width:'100%', padding:'10px', marginBottom:'20px', borderRadius:'6px', border:'1px solid #333', background:'#111', color:'white'}} required />
                  <button type="submit" style={{width:'100%', padding:'12px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', marginBottom:'10px'}}>
                    {isSignUp ? 'Sign Up' : 'Login'}
                  </button>
                  <p style={{fontSize:'0.9rem', cursor:'pointer', color:'var(--color-primary)'}} onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
                  </p>
              </form>
          </div>
      );
  }

  if (loading) return <div className="admin-container">Loading Dashboard...</div>;

  return (
    <div className="admin-container">
      <h1>PartFinder Admin Dashboard</h1>
      {error && (
        <div className="error-banner" style={{background: '#ff444422', border: '1px solid #ff4444', color: '#ff4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
            <h3>⚠️ Error Occurred</h3>
            <p>{error}</p>
            <p><small>Please check your connection and that you are logged in if required.</small></p>
        </div>
      )}
      <div className="admin-tabs">
        <button className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>📦 Orders</button>
        <button className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📊 Inventory</button>
      </div>
      {activeTab === 'orders' ? renderOrders() : renderInventory()}
    </div>
  );
}

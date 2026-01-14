
// Mock service to simulate backend for now

export const searchParts = async (criteria) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const mockImages = [
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1624709585868-b769cb391753?auto=format&fit=crop&q=80&w=600',
  ];

  return [
    {
      id: 1,
      title: `${criteria.year || '2023'} ${criteria.make || 'Toyota'} ${criteria.model || 'Camry'} Alternator`,
      price: '120.00',
      serviceFee: '36.00', // 30%
      store: 'PartsGeek',
      condition: 'New',
      image: mockImages[0],
      link: '#'
    },
    {
      id: 2,
      title: `OEM ${criteria.make || 'Toyota'} ${criteria.model || 'Camry'} Alternator (Refurbished)`,
      price: '85.00',
      serviceFee: '25.50',
      store: 'eBay Motors',
      condition: 'Refurbished',
      image: mockImages[1],
      link: '#'
    },
    {
      id: 3,
      title: 'High Performance Alternator 160A',
      price: '210.00',
      serviceFee: '63.00',
      store: 'Summit Racing',
      condition: 'New',
      image: mockImages[2],
      link: '#'
    },
    {
      id: 4,
      title: 'Used Alternator - Tested',
      price: '45.00',
      serviceFee: '13.50',
      store: 'Local Junkyard',
      condition: 'Used',
      image: 'https://via.placeholder.com/300x200?text=Part',
      link: '#'
    }
  ];
};

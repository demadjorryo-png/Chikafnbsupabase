import type { Product, Customer, Transaction, PendingOrder } from './types';

export const products: Product[] = [
  {
    id: 'prod_naked100',
    name: 'Naked 100 Hawaiian POG',
    barcode: '857493006501',
    category: 'Liquid Freebase',
    stock: 50,
    price: 185000,
    costPrice: 120000,
    supplierId: 'sup01',
    imageUrl: 'https://picsum.photos/seed/vape1/400/400',
    imageHint: 'vape liquid',
    attributes: {
      brand: 'Naked 100',
      flavorProfile: 'Passion Fruit, Orange, Guava',
      nicotine: '3mg',
      size: '60ml',
      pg_vg_ratio: '30/70',
    },
  },
  {
    id: 'prod_caliburnG2',
    name: 'Uwell Caliburn G2',
    barcode: '6942012345678',
    category: 'Pod',
    stock: 0,
    price: 265000,
    costPrice: 210000,
    supplierId: 'sup02',
    imageUrl: 'https://picsum.photos/seed/vape2/400/400',
    imageHint: 'vape device',
    attributes: {
      brand: 'Uwell',
      type: 'Pod System',
      powerOutput: '18W',
    },
  },
  {
    id: 'prod_darkluna',
    name: 'Dark Luna Grape',
    barcode: '9876543210987',
    category: 'Liquid Saltnic',
    stock: 78,
    price: 120000,
    costPrice: 85000,
    supplierId: 'sup03',
    imageUrl: 'https://picsum.photos/seed/vape4/400/400',
    imageHint: 'vape liquid',
    attributes: {
      brand: 'Emkay',
      flavorProfile: 'Grape, Mint',
      nicotine: '30mg',
      size: '30ml',
      pg_vg_ratio: '50/50',
    },
  },
  {
    id: 'prod_cottonbacon',
    name: 'Cotton Bacon Prime',
    barcode: '1122334455667',
    category: 'Cotton',
    stock: 150,
    price: 85000,
    costPrice: 50000,
    supplierId: 'sup04',
    imageUrl: 'https://picsum.photos/seed/vape3/400/400',
    imageHint: 'vape cotton',
    attributes: {
      brand: 'Wick ‘n’ Vape',
    },
  },
   {
    id: 'prod_centaurusm200',
    name: 'Lost Vape Centaurus M200',
    barcode: '2233445566778',
    category: 'Mod',
    stock: 15,
    price: 650000,
    costPrice: 525000,
    supplierId: 'sup02',
    imageUrl: 'https://picsum.photos/seed/vape6/400/400',
    imageHint: 'vape device',
    attributes: {
      brand: 'Lost Vape',
      type: 'Box Mod',
      powerOutput: '200W',
    },
  },
  {
    id: 'prod_dead_rabbit_v3',
    name: 'Hellvape Dead Rabbit V3 RDA',
    barcode: '3344556677889',
    category: 'RDA',
    stock: 0,
    price: 320000,
    costPrice: 250000,
    supplierId: 'sup05',
    imageUrl: 'https://picsum.photos/seed/vape7/400/400',
    imageHint: 'vape atomizer',
    attributes: {
      brand: 'Hellvape',
      type: 'RDA',
      resistance: 'Dual Coil',
    },
  },
];

const customerNames = [
  'Budi Santoso', 'Siti Aminah', 'Agus Wijaya', 'Dewi Lestari', 'Eko Prasetyo', 
  'Fitriani', 'Gunawan', 'Hasanah', 'Indra Cahyono', 'Joko Susilo',
  'Kartika Sari', 'Lia Anggraini', 'Muhammad Hafiz', 'Nurul Aini', 'Putri Ayu',
  'Rahmat Hidayat', 'Rina Marlina', 'Sari Permata', 'Taufik Akbar', 'Umar Said',
  'Vina Lestari', 'Wahyudi', 'Yulia Puspita', 'Zainal Abidin', 'Adi Nugroho',
  'Bella Swan', 'Candra Gupta', 'Dian Novita', 'Fajar Sidik', 'Gita Gutawa',
  'Hendra Wijaya', 'Ika Putri', 'Jamaludin', 'Kevin Sanjaya', 'Laila Sari',
  'Mega Chandra', 'Nadia Putri', 'Oscar Lawalata', 'Prabowo Subianto', 'Rizky Febian',
  'Susi Susanti', 'Tukul Arwana', 'Vidi Aldiano', 'Wulan Guritno', 'Yuni Shara',
  'Zaskia Gotik', 'Ahmad Dhani', 'Bunga Citra Lestari', 'Cinta Laura', 'Duta Sheila'
];

const generateCustomers = (count: number): Customer[] => {
  const customers: Customer[] = [];
  for (let i = 1; i <= count; i++) {
    const points = Math.floor(Math.random() * 6000) + 50;
    let tier: 'Squab' | 'Flyer' | 'Homer';
    if (points < 500) tier = 'Squab';
    else if (points < 2000) tier = 'Flyer';
    else tier = 'Homer';

    const birthYear = Math.floor(Math.random() * (2003 - 1980 + 1)) + 1980;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const joinYear = Math.floor(Math.random() * 3) + 2022;
    const joinMonth = Math.floor(Math.random() * 12) + 1;
    const joinDay = Math.floor(Math.random() * 28) + 1;

    customers.push({
      id: `cust${String(i).padStart(3, '0')}`,
      name: customerNames[i-1] || `Customer ${i}`,
      phone: `08${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
      birthDate: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      joinDate: new Date(joinYear, joinMonth - 1, joinDay).toISOString(),
      loyaltyPoints: points,
      memberTier: tier,
      avatarUrl: `https://picsum.photos/seed/person${i}/100/100`,
    });
  }
  return customers;
};

export const customers: Customer[] = generateCustomers(50);

const generateTransactions = (count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  const paymentMethods: ('Cash' | 'Card' | 'QRIS')[] = ['Cash', 'Card', 'QRIS'];

  for (let i = 1; i <= count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let totalAmount = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      if (!items.some(item => item.productId === product.id)) {
        const quantity = 1;
        items.push({
          productId: product.id,
          productName: product.name,
          quantity: quantity,
          price: product.price,
        });
        totalAmount += product.price * quantity;
      }
    }
    
    if (items.length === 0) continue;

    const transactionDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();

    transactions.push({
      id: `trx${String(i).padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      staffId: `staff0${Math.ceil(Math.random() * 2)}`,
      createdAt: transactionDate,
      totalAmount: totalAmount,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      pointsEarned: Math.floor(totalAmount / 10000),
      items: items,
    });
  }
  return transactions;
}

export const transactions: Transaction[] = generateTransactions(100);

export const pendingOrders: PendingOrder[] = [
  {
    id: 'po001',
    customerId: 'cust003',
    customerName: 'Agus Wijaya',
    customerAvatarUrl: 'https://picsum.photos/seed/person3/100/100',
    productId: 'prod_caliburnG2',
    productName: 'Uwell Caliburn G2',
    createdAt: '2024-07-22T14:00:00Z',
  },
  {
    id: 'po002',
    customerId: 'cust001',
    customerName: 'Budi Santoso',
    customerAvatarUrl: 'https://picsum.photos/seed/person1/100/100',
    productId: 'prod_dead_rabbit_v3',
    productName: 'Hellvape Dead Rabbit V3 RDA',
    createdAt: '2024-07-21T11:30:00Z',
  },
];


export const salesData = [
  { date: 'Mon', revenue: 2350000 },
  { date: 'Tue', revenue: 1980000 },
  { date: 'Wed', revenue: 2120000 },
  { date: 'Thu', revenue: 2870000 },
  { date: 'Fri', revenue: 3450000 },
  { date: 'Sat', revenue: 4580000 },
  { date: 'Sun', revenue: 4100000 },
];

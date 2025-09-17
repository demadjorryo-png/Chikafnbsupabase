'use client';

import * as React from 'react';
import type { Transaction } from '@/lib/types';
import { stores, users } from '@/lib/data';

type ReceiptProps = {
    transaction: Transaction;
};

function VapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 20v-6h12v6H6z" />
      <path d="M18 14V6" />
      <path d="M6 14V9" />
      <path d="M14 6h-4" />
      <path d="M12 6V4" />
    </svg>
  );
}

export function Receipt({ transaction }: ReceiptProps) {
  if (!transaction) return null;

  const store = stores.find(s => s.id === transaction.storeId);
  const staff = users.find(u => u.id === transaction.staffId);

  return (
    <div className="bg-white text-black text-sm w-[300px] p-4 font-code mx-auto">
      <div className="text-center space-y-2 mb-4">
        <div className="flex justify-center items-center gap-2">
            <VapeIcon className="h-8 w-8" />
            <p className="font-headline text-2xl tracking-wider">BEKUPON</p>
        </div>
        <p>{store?.name || 'Bekupon Vape Store'}</p>
        <p>{store?.location || 'Jl. Vape Master No. 42, Jakarta'}</p>
        <p>Telp: 0812-3456-7890</p>
      </div>
      <div className="border-t border-dashed border-black" />
      <div className="my-2 space-y-1">
        <div className="flex justify-between">
            <span>Nota:</span>
            <span>{transaction.id}</span>
        </div>
        <div className="flex justify-between">
            <span>Kasir:</span>
            <span>{staff?.name || transaction.staffId}</span>
        </div>
        <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{transaction.customerName}</span>
        </div>
        <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{new Date(transaction.createdAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</span>
        </div>
      </div>
      <div className="border-t border-dashed border-black" />
      <div className="my-2 space-y-1">
        {transaction.items.map((item) => (
          <div key={item.productId}>
            <p>{item.productName}</p>
            <div className="flex justify-between">
              <span>{item.quantity} x {item.price.toLocaleString('id-ID')}</span>
              <span>{(item.quantity * item.price).toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>
       <div className="border-t border-dashed border-black" />
       <div className="my-2 space-y-1 font-semibold">
         <div className="flex justify-between">
            <span>TOTAL</span>
            <span>Rp {transaction.totalAmount.toLocaleString('id-ID')}</span>
         </div>
       </div>
       <div className="border-t border-dashed border-black" />
       <div className="text-center mt-4 space-y-1">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p className="font-semibold">Poin didapat: +{transaction.pointsEarned}</p>
       </div>
    </div>
  );
}

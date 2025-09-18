
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BrainCircuit, Loader, Send, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { deductAiUsageFee, getTransactionFeeSettings } from '@/lib/app-settings';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { askChika, ChikaAnalystInputSchema } from '@/ai/flows/business-analyst';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { Transaction, Product } from '@/lib/types';

type Message = {
  id: number;
  sender: 'user' | 'ai';
  text: string;
};

type ChikaChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChikaChatDialog({ open, onOpenChange }: ChikaChatDialogProps) {
  const {
    currentUser,
    activeStore,
    pradanaTokenBalance,
    refreshPradanaTokenBalance,
  } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [feeSettings, setFeeSettings] =
    React.useState<TransactionFeeSettings | null>(null);
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      getTransactionFeeSettings().then(setFeeSettings);
      if (messages.length === 0) {
        setMessages([
          {
            id: 1,
            sender: 'ai',
            text: `Halo, ${currentUser?.name}! Saya Chika, analis bisnis pribadi Anda. Apa yang bisa saya bantu analisis hari ini?`,
          },
        ]);
      }
    }
  }, [open, currentUser, messages.length]);

  React.useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to scroll to the bottom.
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !feeSettings || !activeStore) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await deductAiUsageFee(pradanaTokenBalance, feeSettings, toast);
      refreshPradanaTokenBalance();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'Maaf, saldo token Anda tidak mencukupi. Silakan isi ulang untuk melanjutkan.',
        },
      ]);
      setIsLoading(false);
      return;
    }

    // --- Data Gathering for AI ---
    try {
        const productCollectionName = `products_${activeStore.id.replace('store_', '')}`;
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfLastMonth = startOfMonth(lastMonth);
        const endOfLastMonth = endOfMonth(lastMonth);

        const transactionsRef = collection(db, 'transactions');
        const q = query(transactionsRef, where('storeId', '==', activeStore.id));
        const transactionSnap = await getDocs(q);
        const storeTransactions = transactionSnap.docs.map(d => d.data() as Transaction);

        const lastMonthTransactions = storeTransactions.filter(t => isWithinInterval(new Date(t.createdAt), {start: startOfLastMonth, end: endOfLastMonth}));
        const totalRevenueLastMonth = lastMonthTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

        const productSales: Record<string, number> = {};
        storeTransactions.forEach(t => {
            t.items.forEach(item => {
                if (!productSales[item.productName]) productSales[item.productName] = 0;
                productSales[item.productName] += item.quantity;
            });
        });
        const sortedProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a);

        const aiInput: z.infer<typeof ChikaAnalystInputSchema> = {
            question: userMessage.text,
            activeStoreName: activeStore.name,
            totalRevenueLastMonth,
            topSellingProducts: sortedProducts.slice(0, 5).map(([name]) => name),
            worstSellingProducts: sortedProducts.slice(-5).reverse().map(([name]) => name),
        };

        const result = await askChika(aiInput);

        setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: result.answer },
        ]);

    } catch (aiError) {
        console.error("AI processing error:", aiError);
        setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: 'Maaf, terjadi kesalahan saat menganalisis data. Coba lagi beberapa saat.' },
        ]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline tracking-wider flex items-center gap-2">
            <BrainCircuit /> Chika AI Business Analyst
          </DialogTitle>
          <DialogDescription>
            Tanyakan apapun terkait performa bisnis di toko ini. (Biaya: {feeSettings?.aiUsageFee} Token/pesan)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback>
                      <BrainCircuit className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-lg p-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-secondary'
                      : 'bg-card border'
                  }`}
                >
                  <p>{message.text}</p>
                </div>
                 {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback>
                      <BrainCircuit className="h-5 w-5" />
                    </AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-lg p-3 text-sm bg-card border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Chika sedang berpikir...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Contoh: Apa produk paling tidak laku bulan ini?"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

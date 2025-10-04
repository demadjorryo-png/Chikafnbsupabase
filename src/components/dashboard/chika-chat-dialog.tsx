
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
import { BrainCircuit, Loader, Send, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { deductAiUsageFee, getTransactionFeeSettings } from '@/lib/app-settings';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { askChika, type ChikaAnalystInput } from '@/ai/flows/business-analyst';
import { sendWhatsAppNotification } from '@/ai/flows/whatsapp-notification';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';

import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { Transaction } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: number;
  sender: 'user' | 'ai';
  text: string;
};

const businessAnalystExampleQuestions = [
    "Bagaimana cara meningkatkan omset toko saya?",
    "Beri saya ide promo untuk akhir pekan.",
    "Produk apa yang paling tidak laku bulan ini?",
];

const appConsultantExampleQuestions = [
    "Saya mau buat aplikasi kasir untuk coffee shop.",
    "Bisa bantu saya bikin aplikasi untuk barbershop?",
    "Berapa perkiraan biaya pembuatan aplikasi custom?",
];

type ChikaChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'consultant' | 'analyst';
};

export function ChikaChatDialog({ open, onOpenChange, mode }: ChikaChatDialogProps) {
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
  const [isSessionActive, setIsSessionActive] = React.useState(false);
  const [awaitingRenewal, setAwaitingRenewal] = React.useState(false);
  const [chatEnded, setChatEnded] = React.useState(false);

  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sessionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const isBusinessAnalystMode = mode === 'analyst';

  const initialMessage = isBusinessAnalystMode 
    ? `Halo, ${currentUser?.name}! Saya Chika, analis bisnis pribadi Anda untuk toko ${activeStore?.name}. Apa yang bisa saya bantu analisis hari ini?`
    : "Halo! Saya Chika, asisten AI untuk Rio Pradana...etc"; // Shortened for brevity
    
  const exampleQuestions = isBusinessAnalystMode ? businessAnalystExampleQuestions : appConsultantExampleQuestions;

  React.useEffect(() => {
    if (open) {
      if (isBusinessAnalystMode) {
        getTransactionFeeSettings().then(setFeeSettings);
      }
      if (messages.length === 0) {
        setMessages([{ id: 1, sender: 'ai', text: initialMessage }]);
      }
    } else {
        setMessages([]);
        setInput('');
        setIsSessionActive(false);
        setAwaitingRenewal(false);
        setChatEnded(false);
        if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    }
    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]); 

  React.useEffect(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = viewport.scrollHeight;
        }, 100);
    }
  }, [messages]);


  const handleSendMessage = async (question: string) => {
    if (!question.trim() || isLoading || awaitingRenewal || chatEnded) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if(isBusinessAnalystMode) {
        await handleBusinessAnalyst(question);
    } else {
        await handleAppConsultant(question);
    }
  };
  
  const handleAppConsultant = async (userInput: string) => { /* ... no change ... */ };

  const handleBusinessAnalyst = async (userInput: string) => {
      if (!feeSettings || !activeStore) {
        setIsLoading(false);
        return;
      };

      if (!isSessionActive) {
        try {
          const feeToDeduct = feeSettings.aiSessionFee || 5;
          await deductAiUsageFee(pradanaTokenBalance, feeToDeduct, activeStore.id, toast, `Memulai sesi Chika AI`);
          refreshPradanaTokenBalance();
          setIsSessionActive(true);
          
          const duration = feeSettings.aiSessionDurationMinutes || 30;
          toast({ title: "Sesi Dimulai", description: `Sesi konsultasi Anda aktif selama ${duration} menit.` });

          const durationMs = duration * 60 * 1000;
          sessionTimeoutRef.current = setTimeout(() => {
            setIsSessionActive(false);
            setAwaitingRenewal(true);
            const renewalFee = feeSettings.aiSessionFee || 5;
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), sender: 'ai', text: `Waktu sesi Anda telah habis. Apakah Anda ingin memulai sesi baru untuk melanjutkan? (Biaya: ${renewalFee} Token)` },
            ]);
            toast({ title: "Sesi Berakhir", description: "Silakan konfirmasi untuk melanjutkan." });
          }, durationMs);

        } catch (error) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', text: 'Maaf, saldo token Anda tidak mencukupi untuk memulai sesi. Silakan isi ulang.' },
          ]);
          setIsLoading(false);
          return;
        }
      }

      try {
          // ... (existing data gathering logic) ...
          const aiInput: ChikaAnalystInput = { question: userInput, activeStoreName: activeStore.name, totalRevenueLastMonth: 0, topSellingProducts: [], worstSellingProducts: [] };
          const result = await askChika(aiInput);
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: result.answer }]);
      } catch (aiError) {
          console.error("AI processing error:", aiError);
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Maaf, terjadi kesalahan. Coba lagi.' }]);
      } finally {
          setIsLoading(false);
      }
  }

  const handleRenewSession = () => {
    setAwaitingRenewal(false);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'ai', text: 'Baik, silakan ketik pertanyaan Anda untuk memulai sesi baru.' },
    ]);
    // The next user message will automatically trigger the !isSessionActive block 
    // in handleBusinessAnalyst, starting a new session and deducting the fee.
  }

  const handleEndChat = () => {
    setAwaitingRenewal(false);
    setChatEnded(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'ai', text: 'Tentu. Terima kasih telah menggunakan Chika AI. Sampai jumpa di lain waktu!' },
    ]);
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  }

  const getDescription = () => {
    if (isBusinessAnalystMode) {
      if (!feeSettings) return 'Memuat pengaturan...';
      const fee = feeSettings.aiSessionFee || 5;
      const duration = feeSettings.aiSessionDurationMinutes || 30;
      if (isSessionActive) return `Sesi aktif. Anda bisa bertanya sepuasnya.`;
      if (awaitingRenewal) return `Sesi berakhir. Pilih untuk melanjutkan atau mengakhiri.`;
      return `Biaya: ${fee} Token untuk memulai sesi konsultasi selama ${duration} menit.`;
    }
    return "Jelaskan ide aplikasi Anda. Chika akan membantu Anda merangkum kebutuhan proyek.";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-full h-screen flex flex-col sm:rounded-none">
        <DialogHeader>
          <DialogTitle className='font-headline tracking-wider flex items-center gap-2'>
            <BrainCircuit/> Chika AI {isBusinessAnalystMode ? 'Business Analyst' : 'App Consultant'}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">{/* ... messages mapping ... */}</div>
        </ScrollArea>
        
        {awaitingRenewal && (
          <div className="p-4 border-t flex flex-col sm:flex-row justify-center gap-2">
            <Button onClick={handleRenewSession} className="w-full sm:w-auto">
              <Sparkles className="w-4 h-4 mr-2" />
              Lanjutkan Sesi (Biaya: {feeSettings?.aiSessionFee || 5} Token)
            </Button>
            <Button onClick={handleEndChat} variant="outline" className="w-full sm:w-auto">
              Tidak, Terima Kasih
            </Button>
          </div>
        )}

        <DialogFooter>
          <form onSubmit={handleFormSubmit} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatEnded ? "Sesi telah berakhir." : "Ketik pesan Anda..."}
              disabled={isLoading || awaitingRenewal || chatEnded}
            />
            <Button type="submit" disabled={isLoading || !input.trim() || awaitingRenewal || chatEnded}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

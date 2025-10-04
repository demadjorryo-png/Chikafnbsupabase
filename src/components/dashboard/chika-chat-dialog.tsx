
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
import { consultWithChika } from '@/ai/flows/app-consultant';
import { useDashboard } from '@/contexts/dashboard-context';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { AIConfirmationDialog } from './ai-confirmation-dialog';

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

// This internal component contains all the logic that requires the dashboard context.
function BusinessAnalystChat({ open, onOpenChange }: Omit<ChikaChatDialogProps, 'mode'>) {
    const {
        currentUser,
        activeStore,
        pradanaTokenBalance,
        refreshPradanaTokenBalance,
    } = useAuth();
    const { dashboardData, feeSettings } = useDashboard();
    const { toast } = useToast();
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSessionActive, setIsSessionActive] = React.useState(false);
    const [awaitingRenewal, setAwaitingRenewal] = React.useState(false);
    const [chatEnded, setChatEnded] = React.useState(false);

    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const sessionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    
    const initialMessage = `Halo, ${currentUser?.name}! Saya Chika, analis bisnis pribadi Anda untuk toko ${activeStore?.name}. Apa yang bisa saya bantu analisis hari ini?`;

    React.useEffect(() => {
        if (open) {
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
    }, [open]);

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            setTimeout(() => {
                const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = viewport.scrollHeight;
            }, 100);
        }
    }, [messages]);

    const handleBusinessAnalyst = async (userInput: string) => {
      if (!feeSettings || !activeStore || !dashboardData) {
        setIsLoading(false);
        toast({variant: 'destructive', title: 'Data tidak lengkap', description: 'Gagal memuat pengaturan atau data toko.'});
        return;
      };

      if (!isSessionActive) {
        try {
          const feeToDeduct = feeSettings.aiSessionFee;
          await deductAiUsageFee(pradanaTokenBalance, feeToDeduct, activeStore.id, toast, `Memulai sesi Chika AI`);
          refreshPradanaTokenBalance();
          setIsSessionActive(true);
          
          const duration = feeSettings.aiSessionDurationMinutes;
          toast({ title: "Sesi Dimulai", description: `Sesi konsultasi Anda aktif selama ${duration} menit.` });

          const durationMs = duration * 60 * 1000;
          sessionTimeoutRef.current = setTimeout(() => {
            setIsSessionActive(false);
            setAwaitingRenewal(true);
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), sender: 'ai', text: `Waktu sesi Anda telah habis. Apakah Anda ingin memulai sesi baru untuk melanjutkan?` },
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
          const now = new Date();
          const startOfLastMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          const endOfLastMonth = endOfMonth(startOfLastMonth);
          const { transactions } = dashboardData;

          const lastMonthTransactions = transactions.filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfLastMonth, end: endOfLastMonth }));
          const totalRevenueLastMonth = lastMonthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);

          const sales: Record<string, number> = {};
          lastMonthTransactions.forEach(t => {
            t.items.forEach(item => {
                if (!sales[item.productName]) sales[item.productName] = 0;
                sales[item.productName] += item.quantity;
            });
          });
          const sortedProducts = Object.entries(sales).sort(([, a], [, b]) => b - a);
          const topSellingProducts = sortedProducts.slice(0, 5).map(([name]) => name);
          const worstSellingProducts = sortedProducts.slice(-5).reverse().map(([name]) => name);

          const aiInput: ChikaAnalystInput = { 
              question: userInput, 
              activeStoreName: activeStore.name, 
              totalRevenueLastMonth, 
              topSellingProducts, 
              worstSellingProducts 
          };
          const result = await askChika(aiInput);
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: result.answer }]);
      } catch (aiError) {
          console.error("AI processing error:", aiError);
          setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Coba lagi.' }]);
      } finally {
          setIsLoading(false);
      }
    }

    const handleSendMessage = async (question: string) => {
        if (!question.trim() || isLoading || awaitingRenewal || chatEnded) return;

        const userMessage: Message = { id: Date.now(), sender: 'user', text: question };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        await handleBusinessAnalyst(question);
    };

    const handleRenewSession = () => {
        setAwaitingRenewal(false);
        setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', text: 'Sesi baru dimulai! Silakan lanjutkan pertanyaan Anda.' },
        ]);
    }

    const handleEndChat = () => {
        setAwaitingRenewal(false);
        setChatEnded(true);
        setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', text: 'Baik. Terima kasih telah menggunakan Chika AI. Sampai jumpa di lain waktu!' },
        ]);
    }

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input);
    }
    
    const getDescription = () => {
        if (!feeSettings) return 'Memuat pengaturan...';
        const fee = feeSettings.aiSessionFee;
        const duration = feeSettings.aiSessionDurationMinutes;
        if (isSessionActive) return `Sesi aktif. Anda bisa bertanya sepuasnya.`;
        if (awaitingRenewal) return `Sesi berakhir. Pilih untuk melanjutkan atau mengakhiri.`;
        return `Biaya: ${fee} Token untuk memulai sesi konsultasi selama ${duration} menit.`;
    };

    return (
        <DialogContent className="sm:max-w-full h-screen flex flex-col sm:rounded-none">
            <DialogHeader>
                <DialogTitle className='font-headline tracking-wider flex items-center gap-2'><BrainCircuit/> Chika AI Business Analyst</DialogTitle>
                <DialogDescription>{getDescription()}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
                <ChatBody messages={messages} isLoading={isLoading} exampleQuestions={businessAnalystExampleQuestions} onQuestionClick={handleSendMessage} />
            </ScrollArea>
             {awaitingRenewal && feeSettings && activeStore ? (
                <div className="p-4 border-t flex flex-col sm:flex-row justify-center gap-2">
                    <AIConfirmationDialog
                        featureName="Sesi Baru Chika AI"
                        featureDescription={`Anda akan memulai sesi konsultasi baru selama ${feeSettings.aiSessionDurationMinutes} menit.`}
                        feeSettings={{...feeSettings, aiUsageFee: feeSettings.aiSessionFee}}
                        onConfirm={async () => Promise.resolve()}
                        onSuccess={handleRenewSession}
                    >
                        <Button className="w-full sm:w-auto">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Lanjutkan Sesi
                        </Button>
                    </AIConfirmationDialog>
                    <Button onClick={handleEndChat} variant="outline" className="w-full sm:w-auto">Tidak, Terima Kasih</Button>
                </div>
            ) : (
                <DialogFooter>
                    <form onSubmit={handleFormSubmit} className="flex w-full items-center gap-2">
                        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={chatEnded ? "Sesi telah berakhir." : "Ketik pesan Anda..."} disabled={isLoading || awaitingRenewal || chatEnded} />
                        <Button type="submit" disabled={isLoading || !input.trim() || awaitingRenewal || chatEnded}><Send className="h-4 w-4" /></Button>
                    </form>
                </DialogFooter>
            )}
        </DialogContent>
    );
}


function AppConsultantChat({ open, onOpenChange }: Omit<ChikaChatDialogProps, 'mode'>) {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const initialMessage = "Halo, saya Chika, asisten AI dari PT Chikatech. Saya bisa membantu Anda merancang aplikasi baru atau melaporkan kendala teknis. Apa yang bisa saya bantu?";
    
    React.useEffect(() => {
        if (open) {
            if (messages.length === 0) {
                setMessages([{ id: 1, sender: 'ai', text: initialMessage }]);
            }
        } else {
            setMessages([]);
            setInput('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

     React.useEffect(() => {
        if (scrollAreaRef.current) {
            setTimeout(() => {
                const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) viewport.scrollTop = viewport.scrollHeight;
            }, 100);
        }
    }, [messages]);

    const handleSendMessage = async (question: string) => {
        if (!question.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now(), sender: 'user', text: question };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await consultWithChika({
                conversationHistory: [...messages, userMessage].map((m) => `${m.sender}: ${m.text}`).join('\n'),
                userInput: question,
            });
            setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: result.response }]);
        } catch (error) {
            console.error("Consultant AI processing error:", error);
            setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Maaf, terjadi kesalahan saat memproses permintaan Anda. Coba lagi.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input);
    };
    
    return (
         <DialogContent className="sm:max-w-full h-screen flex flex-col sm:rounded-none">
            <DialogHeader>
                <DialogTitle className='font-headline tracking-wider flex items-center gap-2'><BrainCircuit/> Chika AI App Consultant</DialogTitle>
                <DialogDescription>Jelaskan ide aplikasi Anda. Chika akan membantu Anda merangkum kebutuhan proyek.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
                 <ChatBody messages={messages} isLoading={isLoading} exampleQuestions={appConsultantExampleQuestions} onQuestionClick={handleSendMessage} />
            </ScrollArea>
            <DialogFooter>
                <form onSubmit={handleFormSubmit} className="flex w-full items-center gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ketik pesan Anda..." disabled={isLoading} />
                    <Button type="submit" disabled={isLoading || !input.trim()}><Send className="h-4 w-4" /></Button>
                </form>
            </DialogFooter>
        </DialogContent>
    );
}

function ChatBody({ messages, isLoading, exampleQuestions, onQuestionClick }: { messages: Message[], isLoading: boolean, exampleQuestions: string[], onQuestionClick: (q:string) => void }) {
    return (
        <div className="space-y-4">
            {messages.map((message) => (
                <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    {message.sender === 'ai' && (
                        <Avatar className='h-8 w-8'>
                            <AvatarFallback className='bg-primary text-primary-foreground'><Sparkles className='h-5 w-5'/></AvatarFallback>
                        </Avatar>
                    )}
                    <div className={`max-w-md rounded-lg p-3 ${message.sender === 'ai' ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                            {message.text}
                        </ReactMarkdown>
                    </div>
                    {message.sender === 'user' && (
                        <Avatar className='h-8 w-8'>
                            <AvatarFallback><User className='h-5 w-5'/></AvatarFallback>
                        </Avatar>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-end gap-2">
                    <Avatar className='h-8 w-8'>
                        <AvatarFallback className='bg-primary text-primary-foreground'><Sparkles className='h-5 w-5'/></AvatarFallback>
                    </Avatar>
                    <div className="max-w-xs rounded-lg p-3 bg-secondary">
                        <Loader className="animate-spin" />
                    </div>
                </div>
            )}
            {!isLoading && messages.length === 1 && (
                <div className="pt-4 text-center text-sm">
                    <p className="text-muted-foreground">Atau coba tanya:</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {exampleQuestions.map(q => (
                        <Button key={q} variant="outline" size="sm" onClick={() => onQuestionClick(q)}>{q}</Button>
                    ))}
                    </div>
                </div>
            )}
        </div>
    );
}


export function ChikaChatDialog({ open, onOpenChange, mode }: ChikaChatDialogProps) {
  
  if (mode === 'analyst') {
    return <BusinessAnalystChat open={open} onOpenChange={onOpenChange} />;
  }

  return <AppConsultantChat open={open} onOpenChange={onOpenChange} />;
}

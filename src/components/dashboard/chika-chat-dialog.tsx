
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
    "Produk apa yang paling tidak laku bulan ini?",
    "Bagaimana cara meningkatkan omset?",
    "Beri saya ide promo untuk akhir pekan.",
    "Berapa total pendapatan bulan lalu?",
];

const appConsultantExampleQuestions = [
    "Saya mau buat aplikasi kasir untuk coffee shop.",
    "Bisa bantu saya bikin aplikasi untuk barbershop?",
    "Apa saja yang perlu disiapkan untuk membuat aplikasi custom?",
    "Berapa perkiraan biayanya?",
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
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  
  const isBusinessAnalystMode = mode === 'analyst';

  const initialMessage = isBusinessAnalystMode 
    ? `Halo, ${currentUser?.name}! Saya Chika, analis bisnis pribadi Anda untuk toko ${activeStore?.name}. Apa yang bisa saya bantu analisis hari ini?`
    : "Halo! Saya Chika, asisten AI untuk Rio Pradana, konsultan aplikasi AI kami. Saya di sini untuk membantu Anda menggali ide-ide aplikasi Anda agar tim kami bisa memberikan solusi terbaik. Jangan sungkan untuk berbagi detail sebanyak-banyaknya ya!";
    
  const exampleQuestions = isBusinessAnalystMode ? businessAnalystExampleQuestions : appConsultantExampleQuestions;


  React.useEffect(() => {
    if (open) {
      if (isBusinessAnalystMode) {
        getTransactionFeeSettings().then(setFeeSettings);
      }
      // Set initial message only if chat is empty
      if (messages.length === 0) {
        setMessages([{ id: 1, sender: 'ai', text: initialMessage }]);
      }
    } else {
        // Reset chat when dialog is closed, ready for a new session
        setMessages([]);
        setInput('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

 const sendSummaryToWhatsapp = async (summary: string) => {
    try {
        const { deviceId, adminGroup } = await getWhatsappSettings();
        if (!deviceId || !adminGroup) {
            toast({ variant: 'destructive', title: 'WhatsApp Belum Dikonfigurasi', description: 'Gagal mengirim ringkasan ke admin.' });
            return;
        }
        
        const finalMessage = `Konsultasi Pembuatan Aplikasi Baru
---------------------------------
Chika AI telah menyelesaikan sesi konsultasi dengan calon klien. Berikut adalah ringkasannya:

${summary}

---------------------------------
Mohon untuk segera ditindaklanjuti.`;

        await sendWhatsAppNotification({
            isGroup: true,
            target: adminGroup,
            message: finalMessage,
        });
        
        toast({ title: "Ringkasan Terkirim!", description: "Ringkasan konsultasi telah dikirim ke tim admin." });

    } catch (error) {
         console.error("Failed to send summary to WA:", error);
         toast({ variant: 'destructive', title: 'Gagal Mengirim Ringkasan' });
    }
  }


  const handleSendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: question,
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if(isBusinessAnalystMode) {
        await handleBusinessAnalyst(question, newMessages);
    } else {
        await handleAppConsultant(question, newMessages);
    }
  };
  
  const handleAppConsultant = async (userInput: string, currentMessages: Message[]) => {
     try {
        const result = await consultWithChika({
            conversationHistory: currentMessages.map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n'),
            userInput: userInput,
        });

        const updatedMessages: Message[] = [...currentMessages, { id: Date.now() + 1, sender: 'ai', text: result.response }];
        setMessages(updatedMessages);
        
        if (result.isFinished && result.summary) {
          sendSummaryToWhatsapp(result.summary);
          setMessages(prev => [...prev, {
              id: Date.now() + 2,
              sender: 'ai',
              text: "Terima kasih! Ringkasan kebutuhan Anda telah saya kirimkan ke tim kami. Silakan tunggu follow up dari kami ya!",
          }]);
        }

    } catch (error) {
        console.error("AI consultation error:", error);
        setMessages(prev => [...prev, { id: Date.now() + 1, text: "Maaf, terjadi sedikit gangguan. Bisakah Anda mengulangi?", sender: 'ai' }]);
        toast({ variant: 'destructive', title: "Terjadi Kesalahan AI" });
    } finally {
        setIsLoading(false);
    }
  }

  const handleBusinessAnalyst = async (userInput: string, currentMessages: Message[]) => {
      if (!feeSettings || !activeStore) {
        setIsLoading(false);
        return;
      };

      try {
        await deductAiUsageFee(pradanaTokenBalance, feeSettings, activeStore.id, toast);
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
          const productCollectionName = `products_${activeStore.id}`;
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const startOfLastMonth = startOfMonth(lastMonth);
          const endOfLastMonth = endOfMonth(lastMonth);

          const transactionsRef = collection(db, `transactions_${activeStore.id}`);
          const q = query(transactionsRef);
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

          const aiInput: ChikaAnalystInput = {
              question: userInput,
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
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  }

  const getTitle = () => {
    if (isBusinessAnalystMode) return 'Chika AI Business Analyst';
    return 'Konsultasi Aplikasi dengan Chika AI';
  }

  const getDescription = () => {
    if (isBusinessAnalystMode) {
      return `Tanyakan apapun terkait performa bisnis di toko ini. (Biaya: ${feeSettings?.aiUsageFee} Token/pesan)`;
    }
    return "Jelaskan ide aplikasi Anda. Chika akan membantu Anda merangkum kebutuhan proyek.";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline tracking-wider flex items-center gap-2">
            <Sparkles /> 
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
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
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-secondary'
                      : 'bg-card border'
                  }`}
                >
                  <article className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </article>
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
        
        {messages.length <= 1 && (
            <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Atau coba tanya:</p>
                <div className="grid grid-cols-1 gap-2">
                    {exampleQuestions.map((q, i) => (
                        <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-2 text-left justify-start whitespace-normal"
                            onClick={() => handleSendMessage(q)}
                            disabled={isLoading}
                        >
                            {q}
                        </Button>
                    ))}
                </div>
            </div>
        )}

        <DialogFooter>
          <form onSubmit={handleFormSubmit} className="flex w-full items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan Anda..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

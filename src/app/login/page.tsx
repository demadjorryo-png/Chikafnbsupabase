'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Sparkles, Send, MessageSquare, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import { consultWithChika } from '@/ai/flows/app-consultant';
import { sendWhatsAppNotification } from '@/ai/flows/whatsapp-notification';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

type Message = {
  text: string;
  isUser: boolean;
};

export default function LoginPage() {
  const [view, setView] = React.useState<'welcome' | 'consult' | 'login' | 'register'>('welcome');
  
  // Login State
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);

  // Register State
  const [regName, setRegName] = React.useState('');
  const [regStoreName, setRegStoreName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [regWhatsapp, setRegWhatsapp] = React.useState('');
  const [isRegisterLoading, setIsRegisterLoading] = React.useState(false);
  
  // Consultation State
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [userInput, setUserInput] = React.useState('');
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const router = useRouter();
  const { login, register } = useAuth();
  
  React.useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const startConsultation = () => {
    setView('consult');
    setMessages([{ text: 'Halo! Saya Chika, asisten AI Anda. Senang bertemu dengan Anda. Sebelum kita mulai, boleh saya tahu nama Anda?', isUser: false }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessages: Message[] = [...messages, { text: userInput, isUser: true }];
    setMessages(newMessages);
    setUserInput('');
    setIsAiLoading(true);

    try {
        const result = await consultWithChika({
            conversationHistory: newMessages.map(m => `${m.isUser ? 'User' : 'AI'}: ${m.text}`).join('\n'),
            userInput: userInput,
        });

        const updatedMessages = [...newMessages, { text: result.response, isUser: false }];
        setMessages(updatedMessages);
        
        if (result.isFinished && result.summary) {
            sendSummaryToWhatsapp(result.summary);
            updatedMessages.push({
                text: "Terima kasih! Ringkasan kebutuhan Anda telah saya kirimkan ke tim kami. Silakan lanjutkan untuk mendaftar atau login.",
                isUser: false
            });
            setMessages(updatedMessages);
        }

    } catch (error) {
        console.error("AI consultation error:", error);
        setMessages(prev => [...prev, { text: "Maaf, terjadi sedikit gangguan. Bisakah Anda mengulangi?", isUser: false }]);
        toast({ variant: 'destructive', title: "Terjadi Kesalahan AI" });
    } finally {
        setIsAiLoading(false);
    }
  };
  
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Gagal', description: error.message });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisterLoading(true);
    try {
      await register(regName, regStoreName, regEmail, regPassword, regWhatsapp);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registrasi Gagal', description: error.message });
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const renderView = () => {
    switch(view) {
        case 'consult':
            return (
                <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-headline tracking-wider flex items-center justify-center gap-2"><Sparkles /> Konsultasi Aplikasi</CardTitle>
                        <CardDescription>Jawab pertanyaan Chika untuk mendefinisikan kebutuhan aplikasi Anda.</CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-grow p-6" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.isUser ? 'justify-end' : ''}`}>
                                    {!msg.isUser && (
                                        <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                            <AvatarFallback><Sparkles className="h-5 w-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <p className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.isUser ? 'bg-secondary' : 'bg-card border'}`}>
                                        {msg.text}
                                    </p>
                                </div>
                            ))}
                            {isAiLoading && (
                                <div className="flex items-start gap-3">
                                     <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                        <AvatarFallback><Sparkles className="h-5 w-5"/></AvatarFallback>
                                    </Avatar>
                                    <p className="max-w-[80%] rounded-lg px-4 py-2 text-sm bg-card border flex items-center gap-2 text-muted-foreground">
                                        <Loader className="h-4 w-4 animate-spin"/>
                                        <span>Chika sedang mengetik...</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <CardContent>
                        <div className="flex items-center gap-2 mt-4">
                            <Input 
                                placeholder="Ketik jawaban Anda..." 
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={isAiLoading}
                            />
                            <Button onClick={handleSendMessage} disabled={isAiLoading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                         <Button variant="link" className="text-xs text-muted-foreground mt-4" onClick={() => setView('welcome')}>Kembali ke Awal</Button>
                    </CardContent>
                </Card>
            );
        case 'login':
            return (
                 <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-headline tracking-wider">SELAMAT DATANG</CardTitle>
                        <CardDescription>Masukkan email dan password Anda untuk masuk.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder='admin@tokosaya.com' value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoginLoading}>
                            {isLoginLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Masuk
                        </Button>
                        </form>
                        <Separator className="my-4" />
                        <p className="text-center text-sm text-muted-foreground">
                            Belum punya akun?{' '}
                            <Button variant="link" className="p-0 h-auto" onClick={() => setView('register')}>
                                Daftar di sini
                            </Button>
                        </p>
                         <Button variant="link" className="text-xs text-muted-foreground mt-4 w-full" onClick={() => setView('welcome')}>Kembali ke Awal</Button>
                    </CardContent>
                </Card>
            );
        case 'register':
            return (
                 <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-headline tracking-wider">DAFTAR AKUN BARU</CardTitle>
                        <CardDescription>Buat toko Anda sendiri dan mulai dalam hitungan menit.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="reg-name">Nama Lengkap Anda</Label>
                                <Input id="reg-name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reg-store-name">Nama Toko Anda</Label>
                                <Input id="reg-store-name" value={regStoreName} onChange={(e) => setRegStoreName(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="reg-email">Email</Label>
                                    <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="reg-whatsapp">Nomor WhatsApp</Label>
                                    <Input id="reg-whatsapp" type="tel" value={regWhatsapp} onChange={(e) => setRegWhatsapp(e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reg-password">Password</Label>
                                <Input id="reg-password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                                {isRegisterLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Daftar & Buat Toko
                            </Button>
                        </form>
                        <Separator className="my-4" />
                        <p className="text-center text-sm text-muted-foreground">
                            Sudah punya akun?{' '}
                            <Button variant="link" className="p-0 h-auto" onClick={() => setView('login')}>
                                Masuk di sini
                            </Button>
                        </p>
                        <Button variant="link" className="text-xs text-muted-foreground mt-4 w-full" onClick={() => setView('welcome')}>Kembali ke Awal</Button>
                    </CardContent>
                </Card>
            );
        case 'welcome':
        default:
            return (
                 <Card className="text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline tracking-wider">SELAMAT DATANG</CardTitle>
                        <CardDescription>Apa yang ingin Anda lakukan?</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Button size="lg" onClick={startConsultation} className="h-16 flex-col gap-1">
                            <MessageSquare/>
                            <span className="font-bold">Konsultasi Pembuatan Aplikasi</span>
                            <span className="text-xs font-normal">Bicaralah dengan Chika AI untuk merancang aplikasi Anda</span>
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => setView('login')} className="h-16 flex-col gap-1">
                            <LogIn/>
                            <span className="font-bold">Login ke Kasir POS</span>
                            <span className="text-xs font-normal">Masuk untuk mengelola toko Anda yang sudah ada</span>
                        </Button>
                    </CardContent>
                </Card>
            )
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {renderView()}
      </div>
    </main>
  );
}

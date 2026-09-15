'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { TdvMark } from '@/components/brand/tdv-mark';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const WELCOME_TEXT =
  'Merhaba! Yoklama, öğrenci ve rapor işlemlerinde size nasıl yardımcı olabilirim?';

const QUICK_REPLIES = [
  'Devamsızlık raporu nasıl alınır?',
  'Yeni öğrenci nasıl eklenir?',
  'Yoklama nasıl girilir?',
];

/**
 * Gercek bir AI/backend'e bagli degil (kullanicinin istegi: "sadece
 * frontend UI'sini yap") - anahtar kelime eslesmesiyle calisan, canli
 * gibi HISSETTIREN ama arka planda sabit kurallarla yanit veren bir
 * yardimci. Ileride gercek bir servise baglanmak istenirse sadece bu
 * fonksiyon degisir, arayuz aynen kalir.
 */
function reply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('yoklama') && !t.includes('rapor')) {
    return '"Yoklama" sayfasından bugünkü dersi seçip her öğrenci için Geldi / Gelmedi / İzinli / Geç Geldi / Haberli-Habersiz Devamsızlık durumlarından birini işaretleyebilirsiniz. Kim ne zaman değiştirdi kaydı tutulur.';
  }
  if (t.includes('rapor') || t.includes('devamsız')) {
    return '"Raporlar" sayfasında öğrenci, grup, ders ve öğretmen bazlı devamsızlık raporlarını görüntüleyip PDF, Excel veya CSV olarak dışa aktarabilirsiniz.';
  }
  if (t.includes('öğrenci') && (t.includes('ekle') || t.includes('kayıt'))) {
    return '"Öğrenciler" sayfasındaki "Yeni Öğrenci" butonuyla tekli kayıt açabilir, çok sayıda öğrenciyi ise Excel ile toplu aktarabilirsiniz.';
  }
  if (t.includes('grup')) {
    return '"Gruplar" sayfasından yeni bir grup oluşturup öğrencileri bu gruba atayabilir, dönem içinde grup değişikliklerini geçmişiyle birlikte görebilirsiniz.';
  }
  if (t.includes('şifre') || t.includes('giriş')) {
    return 'Giriş sorunları için sistem yöneticinizle iletişime geçin - şifre sıfırlama özelliği yakında eklenecek.';
  }
  return 'Bu konuda henüz hazır bir yanıtım yok, ama ilgili sayfayı sol menüden bulabilirsiniz. Emin değilseniz sistem yöneticinize danışın.';
}

function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Math.random());
  return { id, role, text };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage('assistant', WELCOME_TEXT),
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function send(rawText: string) {
    const text = rawText.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, createMessage('user', text)]);
    setInput('');
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, createMessage('assistant', reply(text))]);
    }, 700);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Yardımcıyı kapat' : 'Yardımcıyı aç'}
        aria-expanded={open}
        className={cn(
          'fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-900/30',
          'transition-all duration-150 hover:bg-brand-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2',
          open && 'scale-95',
        )}
      >
        {open ? <X size={22} strokeWidth={2} /> : <MessageCircle size={22} strokeWidth={1.75} />}
      </button>

      <div
        role="dialog"
        aria-label="Yoklama Asistanı"
        aria-hidden={!open}
        className={cn(
          'fixed right-5 bottom-24 z-40 flex h-[70vh] max-h-[560px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl transition-all duration-150 dark:border-neutral-800 dark:bg-neutral-900',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        <div className="flex items-center gap-3 bg-brand-900 px-4 py-3.5 dark:bg-brand-950">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <TdvMark className="h-5 w-5 text-mark-500" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex items-center gap-1.5 text-sm font-bold text-white">
              Yoklama Asistanı
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/60 uppercase">
                Beta
              </span>
            </p>
            <p className="truncate text-xs text-white/50">Genelde birkaç saniyede yanıtlar</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {typing ? <TypingBubble /> : null}
          {messages.length === 1 ? (
            <div className="flex flex-wrap gap-1.5 pt-1 pl-8">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-300 hover:bg-brand-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-1.5 border-t border-neutral-100 p-2.5 dark:border-neutral-800"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir soru yazın…"
            aria-label="Asistana mesaj yazın"
            className="h-10 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-800 dark:focus:ring-brand-900/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label="Gönder"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
          >
            <ArrowUp size={17} strokeWidth={2.25} />
          </button>
        </form>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-700 px-3.5 py-2 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <TdvMark className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" />
      </span>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2 text-sm leading-relaxed text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
        {message.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <TdvMark className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-3 dark:bg-white/5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

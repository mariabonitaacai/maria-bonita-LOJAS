'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMaria() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Sou a Maria Gerente. Como posso ajudar com os dados de estoque e caixa hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API key is missing');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Você é a 'Maria Gerente', gerente geral das 3 lojas (Pacujá, Graça e Mucambo) da Maria Bonita Açaíteria. 
Seu foco é a gestão completa: cruzar dados de estoque, fechamento de caixa e CRIAR ESTRATÉGIAS DE VENDAS E MARKETING para aumentar o faturamento.
Você é proativa, profissional, criativa para alavancar vendas e extremamente exigente com a qualidade: não aceita de forma alguma que o açaí deixe de ser 'rústico e areado' (odeia textura de sorvete liso). 
Responda de forma concisa, direta e sempre focada em resultados e no crescimento das lojas.`;

      const formattedMessages = newMessages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedMessages,
        config: {
          systemInstruction,
        }
      });

      if (!response.text) throw new Error('No response text');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || ''
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Verifique a chave da API e tente novamente.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50 flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex justify-between items-center text-on-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold font-headline">Maria Gerente</h3>
                  <p className="text-xs opacity-80">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-on-primary rounded-tr-sm' 
                        : 'bg-surface-container-high text-on-surface rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-high text-on-surface p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                    <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-surface-container-low border-t border-outline-variant flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte à Maria..."
                className="flex-1 bg-surface-container-highest border border-outline-variant rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={18} className="ml-1" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-xl flex items-center justify-center z-50 hover:shadow-primary/30 transition-shadow"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </>
  );
}

import { useState, useMemo } from 'react';
import { formatActionLabel } from './game-defs';
import { MessageSquare, HandCoins, ArrowRight, Skull, Handshake, Gavel } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface GameActionPanelProps {
  selectedGame: string;
  gameState: Record<string, any>;
  legalActions: Record<string, any>[];
  sendAction: (action: Record<string, any>) => void;
}

export function GameActionPanel({ selectedGame, gameState, legalActions, sendAction }: GameActionPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [amountSlider, setAmountSlider] = useState(0);
  const [diceFace, setDiceFace] = useState(2);
  const [diceQty, setDiceQty] = useState(1);

  // Group actions by type to easily extract buttons vs complex inputs
  const actionTypes = useMemo(() => legalActions.map(a => String(a.type)), [legalActions]);

  const hasAction = (type: string) => actionTypes.includes(type);
  const getAction = (type: string) => legalActions.find(a => String(a.type) === type);

  // Generic fallback if not handled by a bespoke UI
  const renderGeneric = () => {
    const hasText = legalActions.some(a => ['speak', 'message', 'chat', 'declare'].includes(String(a.type)));
    const hasAmt = legalActions.some(a => ['bid', 'propose'].includes(String(a.type)));
    const btns = legalActions.filter(a => !['speak', 'message', 'chat', 'declare', 'bid', 'propose'].includes(String(a.type)));

    return (
      <div className="space-y-4">
        {hasText && (
          <div className="flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  const ta = legalActions.find(a => ['speak','message','chat','declare'].includes(String(a.type))) as any;
                  const t = String(ta.type); const key = t==='declare'?'claim':t==='chat'?'message':t==='message'?'text':'message';
                  sendAction({...ta, [key]: chatInput.trim()}); setChatInput('');
                }
              }}
              placeholder="输入消息…"
              className="flex-1 px-4 py-2.5 rounded-[14px] bg-surface-container/50 border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-body"
            />
            <button onClick={() => { 
                if(!chatInput.trim())return; 
                const ta=legalActions.find(a=>['speak','message','chat','declare'].includes(String(a.type))) as any; 
                const t=String(ta.type); const key=t==='declare'?'claim':t==='chat'?'message':t==='message'?'text':'message'; 
                sendAction({...ta, [key]: chatInput.trim()}); setChatInput(''); 
              }}
              disabled={!chatInput.trim()} 
              className={`px-5 py-2.5 rounded-[14px] text-sm font-bold font-headline tracking-wider transition-all shadow-sm ${chatInput.trim() ? 'bg-primary text-on-primary hover:bg-primary/90 active:scale-95' : 'bg-surface-container-highest/50 text-outline cursor-not-allowed'}`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {hasAmt && (
          <div className="flex gap-2">
            <input type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)}
              onKeyDown={e => { 
                if(e.key==='Enter' && amountInput && !isNaN(Number(amountInput))){
                  const a=legalActions.find(x=>['bid','propose'].includes(String(x.type))) as any;
                  const t=String(a.type);
                  sendAction({...a,[t==='bid'?'amount':'myShare']:Number(amountInput)});
                  setAmountInput('');
                }
              }}
              placeholder="金额…" 
              className="flex-1 px-4 py-2.5 rounded-[14px] bg-surface-container/50 border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono-data"
            />
            <button onClick={()=>{
                if(!amountInput||isNaN(Number(amountInput)))return;
                const a=legalActions.find(x=>['bid','propose'].includes(String(x.type))) as any;
                const t=String(a.type);
                sendAction({...a,[t==='bid'?'amount':'myShare']:Number(amountInput)});
                setAmountInput('');
              }}
              disabled={!amountInput||isNaN(Number(amountInput))} 
              className={`px-5 py-2.5 rounded-[14px] text-sm font-bold font-headline tracking-wider transition-all shadow-sm ${amountInput&&!isNaN(Number(amountInput)) ? 'bg-primary text-on-primary hover:bg-primary/90 active:scale-95' : 'bg-surface-container-highest/50 text-outline cursor-not-allowed'}`}
            >
              CONFIRM
            </button>
          </div>
        )}

        {btns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {btns.map((action: any, i) => {
              const at = String(action.type || '');
              const isDanger = ['raise','bet','steal','accuse','assassinate','coup'].includes(at);
              const isNeutral = ['fold','silence','end_discussion','end_negotiate','reject','defect','challenge'].includes(at);
              let btnClass = 'bg-primary text-white hover:bg-primary/90';
              if (isDanger) btnClass = 'bg-error text-white hover:bg-error/90';
              else if (isNeutral) btnClass = 'bg-surface-container-highest text-on-surface hover:bg-outline-variant/50';

              return (
                <button key={i} onClick={() => sendAction(action)}
                  className={`flex-1 min-w-[100px] px-4 py-3 rounded-[14px] text-sm font-headline font-bold tracking-wider transition-all active:scale-95 shadow-sm border border-black/5 ${btnClass}`}
                >
                  {formatActionLabel(action)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------------
  // Bespoke Action Panels
  // --------------------------------------------------------------------------------

  switch (selectedGame) {
    case 'texas_holdem_hu': {
      // Buttons: fold, call, check, raise, bet
      // Slider for raise/bet
      const isBetRaise = hasAction('bet') || hasAction('raise');
      const actionRef = getAction('bet') || getAction('raise');
      const minAmount = (actionRef as any)?.minAmount || 0;
      const maxAmount = (actionRef as any)?.maxAmount || gameState.yourStack || 0;

      return (
        <div className="space-y-4">
          {isBetRaise && (
            <div className="p-4 rounded-[16px] bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-headline font-bold tracking-widest text-primary">BET AMOUNT</span>
                <span className="font-mono-data font-bold text-primary text-lg">{amountSlider || minAmount}</span>
              </div>
              <input type="range" 
                min={minAmount} max={maxAmount} 
                value={amountSlider || minAmount} 
                onChange={e => setAmountSlider(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex gap-2">
                <button onClick={() => setAmountSlider(Math.floor(gameState.pot / 2))} className="flex-1 py-1.5 rounded-lg bg-surface-container-highest text-[10px] font-bold text-on-surface hover:bg-outline-variant/50 transition-colors">1/2 POT</button>
                <button onClick={() => setAmountSlider(gameState.pot)} className="flex-1 py-1.5 rounded-lg bg-surface-container-highest text-[10px] font-bold text-on-surface hover:bg-outline-variant/50 transition-colors">POT</button>
                <button onClick={() => setAmountSlider(maxAmount)} className="flex-1 py-1.5 rounded-lg bg-surface-container-highest text-[10px] font-bold text-on-surface hover:bg-outline-variant/50 transition-colors">ALL IN</button>
              </div>
              <button 
                onClick={() => sendAction({ ...actionRef, amount: amountSlider || minAmount })}
                className="w-full py-3 rounded-[12px] bg-primary text-white font-headline font-bold tracking-widest text-sm shadow-md active:scale-95 transition-transform"
              >
                {hasAction('raise') ? 'RAISE' : 'BET'} {amountSlider || minAmount}
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
             {hasAction('fold') && (
               <button onClick={() => sendAction(getAction('fold')!)} className="flex-1 py-3 bg-surface-container-highest text-on-surface rounded-[14px] font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform">
                 FOLD
               </button>
             )}
             {hasAction('check') && (
               <button onClick={() => sendAction(getAction('check')!)} className="flex-1 py-3 bg-secondary text-on-primary rounded-[14px] font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform">
                 CHECK
               </button>
             )}
             {hasAction('call') && (
               <button onClick={() => sendAction(getAction('call')!)} className="flex-2 py-3 bg-primary text-white rounded-[14px] font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform shadow-md">
                 CALL {(getAction('call') as any)?.amount || ''}
               </button>
             )}
          </div>
        </div>
      );
    }

    case 'liars_dice': {
       if (hasAction('bid')) {
         return (
           <div className="space-y-4">
             <div className="p-4 rounded-[16px] bg-surface-container/50 border border-outline-variant/30">
               <div className="flex justify-between mb-4 text-[10px] font-headline font-bold tracking-widest text-on-surface-variant">
                 <span>QUANTITY</span>
                 <span>FACE VALUE</span>
               </div>
               <div className="flex gap-4 items-center">
                 <input type="number" min={1} max={10} value={diceQty} onChange={e => setDiceQty(Number(e.target.value))} className="w-1/2 p-3 text-center rounded-[12px] bg-surface-container-high border border-outline-variant/20 font-mono-data text-xl focus:outline-none focus:border-primary" />
                 <span className="text-on-surface-variant font-bold">×</span>
                 <select value={diceFace} onChange={e => setDiceFace(Number(e.target.value))} className="w-1/2 p-3 rounded-[12px] bg-surface-container-high border border-outline-variant/20 font-mono-data text-xl focus:outline-none focus:border-primary appearance-none text-center">
                   {[1,2,3,4,5,6].map(f => <option key={f} value={f}>{['','⚀','⚁','⚂','⚃','⚄','⚅'][f]} {f}</option>)}
                 </select>
               </div>
               <button onClick={() => sendAction({ type: 'bid', quantity: diceQty, faceValue: diceFace })} className="w-full mt-4 py-3 rounded-[12px] bg-primary text-white font-headline font-bold tracking-widest text-sm shadow-md active:scale-95 transition-transform">
                 PLACE BID
               </button>
             </div>
             {hasAction('challenge') && (
               <button onClick={() => sendAction({ type: 'challenge' })} className="w-full py-3 bg-error text-white rounded-[14px] font-headline font-bold text-sm tracking-wider active:scale-95 transition-transform shadow-sm">
                 CHALLENGE (LIAR!)
               </button>
             )}
           </div>
         );
       }
       return renderGeneric();
    }

    case 'split_or_steal': {
      // Either negotiate phase or decide phase
      if (hasAction('split') && hasAction('steal')) {
        return (
          <div className="flex gap-3">
            <button onClick={() => sendAction({ type: 'split' })} className="flex-1 py-5 bg-secondary text-white rounded-[20px] shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2">
              <Handshake className="w-8 h-8" />
              <span className="font-headline font-bold tracking-widest">SPLIT</span>
            </button>
            <button onClick={() => sendAction({ type: 'steal' })} className="flex-1 py-5 bg-error text-white rounded-[20px] shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2">
              <Skull className="w-8 h-8" />
              <span className="font-headline font-bold tracking-widest">STEAL</span>
            </button>
          </div>
        );
      }
      return renderGeneric();
    }

    case 'ultimatum': {
        if (hasAction('propose')) {
            const total = gameState.totalAmount || 100;
            return (
              <div className="p-4 rounded-[16px] bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-headline font-bold tracking-widest text-primary">YOUR SHARE</span>
                  <span className="font-mono-data font-bold text-primary text-lg">¥{amountSlider}</span>
                </div>
                <input type="range" 
                  min={0} max={total} 
                  value={amountSlider} 
                  onChange={e => setAmountSlider(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between items-center bg-surface-container-high px-4 py-2 rounded-[10px]">
                  <span className="text-[10px] font-headline font-bold tracking-widest text-on-surface-variant flex items-center gap-2"><Gavel className="w-3 h-3"/> OPPONENT GETS</span>
                  <span className="font-mono-data font-bold text-on-surface-variant text-sm">¥{total - amountSlider}</span>
                </div>
                <button 
                  onClick={() => sendAction({ type: 'propose', myShare: amountSlider })}
                  className="w-full py-3 rounded-[12px] bg-primary text-white font-headline font-bold tracking-widest text-sm shadow-md active:scale-95 transition-transform"
                >
                  PROPOSE SPLIT
                </button>
              </div>
            );
        }
        return renderGeneric();
    }

    default:
      return renderGeneric();
  }
}

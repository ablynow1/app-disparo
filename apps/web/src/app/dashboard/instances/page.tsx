import { Smartphone, Zap, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

// Força Server Component (Sempre ao vivo sem cache estático)
export const dynamic = 'force-dynamic'; 

export default async function InstancesPage() {
  
  // ---------------------------------------------------------
  // SERVER SIDE BUSCA DOS DADOS NA EVOLUTION API (ZERO LOADING)
  // ---------------------------------------------------------
  
  let instances: any[] = [];
  let errorMsg = null;
  
  try {
    const res = await fetch(`http://127.0.0.1:8085/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': '123456',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store' // Desativa o cache do Next.js
    });
    
    if (res.ok) {
        const body = await res.json();
        const apiInstances = Array.isArray(body) ? body : (body.value || []);
        
        // A API 1.8.x da Evolution tem formatos variados dependendo do endpoint de busca
        instances = apiInstances.map((item: any) => item.instance || item);
    } else {
        errorMsg = "Servidor da Evolution API recusou a requisição.";
    }
  } catch (error: any) {
    errorMsg = "Servidor Evolution API indisponível.";
  }

  return (
    <>
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Aparelhos / WhatsApp</h1>
        <p className="text-sm text-zinc-400">Suas conexões de WhatsApp usadas para disparos e automações.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Renderiza as Instâncias Retornadas */}
        {instances.length > 0 ? (
          instances.map((inst, index) => (
            <div key={index} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-3xl shadow-sm relative overflow-hidden group flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                <Smartphone size={80} />
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                 {/* Imagem de Perfil do WhatsApp */}
                 {inst.profilePictureUrl ? (
                   <img 
                     src={inst.profilePictureUrl} 
                     alt="Foto de perfil" 
                     className="w-16 h-16 rounded-full border-2 border-zinc-800 shadow-md object-cover relative z-10" 
                   />
                 ) : (
                   <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-zinc-700 flex items-center justify-center relative z-10">
                     <Smartphone className="text-zinc-500 w-6 h-6" />
                   </div>
                 )}
                 <div className="relative z-10">
                   <h3 className="text-lg font-semibold text-zinc-100 tracking-tight leading-none mb-1">
                     {inst.profileName || inst.instanceName}
                   </h3>
                   <p className="text-xs text-zinc-400 font-medium select-all">
                     {inst.owner ? inst.owner.split('@')[0] : 'Numero não sincronizado'}
                   </p>
                 </div>
              </div>

              <div className="space-y-3 mt-auto relative z-10">
                <div className="flex items-center justify-between text-sm bg-zinc-950/50 px-3 py-2 rounded-xl">
                  <span className="text-zinc-500 font-medium">Instância Server</span>
                  <span className="text-zinc-200 font-mono text-xs bg-zinc-800/80 px-2 py-0.5 rounded-md">{inst.instanceName}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm bg-zinc-950/50 px-3 py-2 rounded-xl">
                  <span className="text-zinc-500 font-medium">Status</span>
                  {inst.status === 'open' ? (
                     <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2 py-1 rounded-md">
                       <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                     </div>
                  ) : (
                     <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs bg-amber-500/10 px-2 py-1 rounded-md">
                       <AlertCircle className="w-3.5 h-3.5" /> AGUARDANDO QR
                     </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-5 border-t border-zinc-800/50 flex gap-2 relative z-10">
                 {inst.status === 'open' ? (
                   <button disabled className="flex-1 bg-zinc-800/50 text-zinc-500 text-sm font-medium py-2.5 rounded-xl cursor-not-allowed">
                     Dispositivo Conectado
                   </button>
                 ) : (
                   <button className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium py-2.5 rounded-xl transition-colors border border-emerald-500/20">
                     Ler QRCode
                   </button>
                 )}
                 <button className="w-12 flex items-center justify-center bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-xl transition-colors shrink-0">
                    <RefreshCw className="w-4 h-4" />
                 </button>
              </div>
            </div>
          ))
        ) : (
          /* Estado Vazio ou Erro */
          <div className="col-span-full xl:col-span-2 bg-zinc-900/20 backdrop-blur border border-zinc-800/40 border-dashed rounded-3xl p-10 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-700/50 text-zinc-500">
               {errorMsg ? <AlertCircle className="w-10 h-10 text-rose-500/50" /> : <Smartphone className="w-10 h-10" />}
            </div>
            <h4 className="text-xl font-medium text-zinc-200 mb-2">
              {errorMsg ? "Evolution API Desconectada" : "Nenhum Telefone Cadastrado"}
            </h4>
            <p className="text-zinc-500 mb-8 max-w-sm">
              {errorMsg || "Para o robô funcionar você precisa emparelhar sua conta do WhatsApp."}
            </p>
            <button className="bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" /> Adicionar Telefone
            </button>
          </div>
        )}
      </div>
    </>
  );
}

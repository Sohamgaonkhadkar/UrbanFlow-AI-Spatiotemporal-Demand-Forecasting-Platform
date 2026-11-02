import { useEffect, useState } from "react";
import { initialize } from "@/lib/data";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AppProvider, useApp } from "@/components/ui";
import Homepage from "@/home/Homepage";
import AppShell from "@/app/AppShell";
import Overview from "@/pages/Overview";
import ForecastStudio from "@/pages/ForecastStudio";
import CityExplorer from "@/pages/CityExplorer";
import Insights from "@/pages/Insights";
import ModelIntel from "@/pages/ModelIntel";
function Router() {
  const { route } = useApp();
  if (route === "home") return <Homepage />;
  const page =
    route === "overview" ? (
      <Overview />
    ) : route === "forecast" ? (
      <ForecastStudio />
    ) : route === "explorer" ? (
      <CityExplorer />
    ) : route === "insights" ? (
      <Insights />
    ) : (
      <ModelIntel />
    );
  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          {page}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
export default function App() {
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;initialize().then(()=>{if(active)setReady(true)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[retry]);
  if(!ready)return <main className="grain min-h-screen bg-obsidian p-10 text-chalk"><h1 className="text-signal">URBANFLOW AI</h1><p role={error?'alert':'status'}>{error || 'Loading verified historical coverage and model metadata…'}</p>{error&&<button className="mt-6 border p-3" onClick={()=>{setError('');setRetry(x=>x+1)}}>Retry connection</button>}</main>;
  return (
    <MotionConfig reducedMotion="user">
      <div className="grain min-h-screen bg-obsidian">
        <AppProvider>
          <Router />
        </AppProvider>
      </div>
    </MotionConfig>
  );
}

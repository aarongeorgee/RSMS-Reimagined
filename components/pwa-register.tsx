'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    const promptHandler=(event:any)=>{
      event.preventDefault()
      ;(window as any).__rsmsInstallPrompt=event
      window.dispatchEvent(new Event('rsms-install-ready'))
    }
    const installedHandler=()=>{
      ;(window as any).__rsmsInstallPrompt=null
      window.dispatchEvent(new Event('rsms-install-ready'))
    }
    window.addEventListener('beforeinstallprompt',promptHandler)
    window.addEventListener('appinstalled',installedHandler)

    if ('serviceWorker' in navigator) {
      const register=async()=>{
        try {
          const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'})
          await registration.update()
        } catch {}
      }
      if(document.readyState==='complete') register()
      else window.addEventListener('load',register,{once:true})
    }

    return()=>{
      window.removeEventListener('beforeinstallprompt',promptHandler)
      window.removeEventListener('appinstalled',installedHandler)
    }
  },[])
  return null
}

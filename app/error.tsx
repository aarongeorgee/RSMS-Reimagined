'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{padding:'10vh 8vw'}}><h1>Something interrupted your student portal.</h1><p>Please try loading this view again. Your saved demo records remain on this device.</p><button className="primary" onClick={reset}>Try again</button></main>}

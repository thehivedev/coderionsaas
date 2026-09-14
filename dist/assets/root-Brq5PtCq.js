import{r as i,j as e}from"./jsx-runtime-BNRJbmTP.js";import{f,e as y,g,h as x,_ as w,i as a,O as S,M as j,j as k,S as M}from"./components-CWQyJQ-f.js";/**
 * @remix-run/react v2.17.5
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let l="positions";function O({getKey:t,...c}){let{isSpaMode:h}=f(),o=y(),p=g();x({getKey:t,storageKey:l});let u=i.useMemo(()=>{if(!t)return null;let s=t(o,p);return s!==o.key?s:null},[]);if(h)return null;let m=((s,d)=>{if(!window.history.state||!window.history.state.key){let r=Math.random().toString(32).slice(2);window.history.replaceState({key:r},"")}try{let n=JSON.parse(sessionStorage.getItem(s)||"{}")[d||window.history.state.key];typeof n=="number"&&window.scrollTo(0,n)}catch(r){console.error(r),sessionStorage.removeItem(s)}}).toString();return i.createElement("script",w({},c,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${m})(${a(JSON.stringify(l))}, ${a(JSON.stringify(u))})`}}))}const I="/assets/tailwind-7vRIZmil.css",L=()=>[{rel:"stylesheet",href:I},{rel:"preconnect",href:"https://fonts.googleapis.com"},{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"}];function N({children:t}){return e.jsxs("html",{lang:"es",children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),e.jsx(j,{}),e.jsx(k,{})]}),e.jsxs("body",{className:"bg-[#171717] text-white antialiased",children:[t,e.jsx(O,{}),e.jsx(M,{})]})]})}function _(){return e.jsx(S,{})}export{N as Layout,_ as default,L as links};

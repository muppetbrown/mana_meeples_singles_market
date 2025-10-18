import{c as t,r,j as a}from"./index-DpUM0y5P.js";/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],y=t("chevron-down",f);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],M=t("funnel",k);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],m=t("info",g);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],$=t("mail",w);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],C=t("map-pin",b);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],E=t("plus",N);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],L=t("refresh-cw",v);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],S=t("search",j);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],A=t("shopping-cart",_),q=({currency:c,onCurrencyChange:l,className:h=""})=>{var d;const[s,o]=r.useState(!1),n=r.useRef(null),i=[{code:"NZD",symbol:"NZ$",label:"New Zealand Dollar (NZD)",rate:1,flag:"🇳🇿",lastUpdated:"2024-01-01"},{code:"USD",symbol:"$",label:"US Dollar (USD)",rate:.625,flag:"🇺🇸",lastUpdated:"2024-01-01"}];r.useEffect(()=>{const e=x=>{n.current&&!n.current.contains(x.target)&&o(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[]);const p=e=>{l&&l(e),o(!1)},u=e=>{switch(e.key){case"Enter":case" ":e.preventDefault(),o(!s);break;case"Escape":o(!1);break;case"ArrowDown":e.preventDefault(),s||o(!0);break;case"ArrowUp":e.preventDefault(),s||o(!0);break}};return a.jsxs("div",{className:`relative ${h}`,ref:n,children:[a.jsxs("button",{type:"button",onClick:()=>o(!s),onKeyDown:u,className:"bg-mm-forest hover:bg-mm-darkForest text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors focus:ring-2 focus:ring-mm-forest focus:outline-none","aria-expanded":s,"aria-haspopup":"true","aria-label":`Current currency: ${c.code}. Click to change currency`,children:[a.jsx("div",{className:"w-5 h-5 rounded-full flex items-center justify-center text-sm",children:((d=i.find(e=>e.code===c.code))==null?void 0:d.flag)||"💱"}),a.jsx("span",{className:"font-medium",children:c.code}),c.code!=="NZD"&&a.jsx(m,{className:"w-3 h-3 text-yellow-400","aria-label":"Exchange rates are approximate and may not reflect current market values"}),a.jsx("span",{className:"sr-only",children:"Exchange rates are approximate"}),a.jsx(y,{className:`w-4 h-4 transition-transform ${s?"rotate-180":""}`})]}),s&&a.jsxs("div",{className:"absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-mm-warmAccent py-1 min-w-[120px] z-50",role:"menu","aria-orientation":"vertical",children:[i.map(e=>a.jsxs("button",{onClick:()=>p(e),className:`flex items-center gap-3 px-4 py-2 hover:bg-mm-tealLight cursor-pointer transition-colors text-mm-darkForest font-medium w-full text-left ${c.code===e.code?"bg-mm-tealLight hover:bg-mm-tealLight":""}`,role:"menuitem",children:[a.jsx("div",{className:"w-6 h-6 rounded-full flex items-center justify-center text-lg",children:e.flag}),a.jsx("span",{children:e.code})]},e.code)),a.jsx("div",{className:"border-t border-mm-warmAccent mt-1 pt-2 px-4 pb-2",children:a.jsxs("p",{className:"text-xs text-mm-teal flex items-center gap-1",children:[a.jsx(m,{className:"w-3 h-3 flex-shrink-0","aria-hidden":"true"}),a.jsx("span",{children:"Exchange rates are approximate (Jan 2024)"})]})})]})]})};export{q as C,M as F,$ as M,E as P,L as R,S,C as a,A as b,y as c};

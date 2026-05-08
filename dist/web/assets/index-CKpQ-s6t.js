var vr=Object.defineProperty;var _r=(s,e,t)=>e in s?vr(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var w=(s,e,t)=>_r(s,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function r(i){if(i.ep)return;i.ep=!0;const n=t(i);fetch(i.href,n)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Le=globalThis,ot=Le.ShadowRoot&&(Le.ShadyCSS===void 0||Le.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,lt=Symbol(),Rt=new WeakMap;let ds=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==lt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(ot&&e===void 0){const r=t!==void 0&&t.length===1;r&&(e=Rt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&Rt.set(t,e))}return e}toString(){return this.cssText}};const wr=s=>new ds(typeof s=="string"?s:s+"",void 0,lt),ye=(s,...e)=>{const t=s.length===1?s[0]:e.reduce((r,i,n)=>r+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+s[n+1],s[0]);return new ds(t,s,lt)},xr=(s,e)=>{if(ot)s.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const r=document.createElement("style"),i=Le.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=t.cssText,s.appendChild(r)}},It=ot?s=>s:s=>s instanceof CSSStyleSheet?(e=>{let t="";for(const r of e.cssRules)t+=r.cssText;return wr(t)})(s):s;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:yr,defineProperty:Sr,getOwnPropertyDescriptor:Ar,getOwnPropertyNames:Pr,getOwnPropertySymbols:Tr,getPrototypeOf:Er}=Object,W=globalThis,Ct=W.trustedTypes,Rr=Ct?Ct.emptyScript:"",Ge=W.reactiveElementPolyfillSupport,be=(s,e)=>s,Me={toAttribute(s,e){switch(e){case Boolean:s=s?Rr:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,e){let t=s;switch(e){case Boolean:t=s!==null;break;case Number:t=s===null?null:Number(s);break;case Object:case Array:try{t=JSON.parse(s)}catch{t=null}}return t}},ct=(s,e)=>!yr(s,e),zt={attribute:!0,type:String,converter:Me,reflect:!1,useDefault:!1,hasChanged:ct};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),W.litPropertyMetadata??(W.litPropertyMetadata=new WeakMap);let se=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=zt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(e,r,t);i!==void 0&&Sr(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){const{get:i,set:n}=Ar(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:i,set(o){const a=i==null?void 0:i.call(this);n==null||n.call(this,o),this.requestUpdate(e,a,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??zt}static _$Ei(){if(this.hasOwnProperty(be("elementProperties")))return;const e=Er(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(be("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(be("properties"))){const t=this.properties,r=[...Pr(t),...Tr(t)];for(const i of r)this.createProperty(i,t[i])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[r,i]of t)this.elementProperties.set(r,i)}this._$Eh=new Map;for(const[t,r]of this.elementProperties){const i=this._$Eu(t,r);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const r=new Set(e.flat(1/0).reverse());for(const i of r)t.unshift(It(i))}else e!==void 0&&t.push(It(e));return t}static _$Eu(e,t){const r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return xr(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var r;return(r=t.hostConnected)==null?void 0:r.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var r;return(r=t.hostDisconnected)==null?void 0:r.call(t)})}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){var n;const r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(i!==void 0&&r.reflect===!0){const o=(((n=r.converter)==null?void 0:n.toAttribute)!==void 0?r.converter:Me).toAttribute(t,r.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){var n,o;const r=this.constructor,i=r._$Eh.get(e);if(i!==void 0&&this._$Em!==i){const a=r.getPropertyOptions(i),h=typeof a.converter=="function"?{fromAttribute:a.converter}:((n=a.converter)==null?void 0:n.fromAttribute)!==void 0?a.converter:Me;this._$Em=i;const c=h.fromAttribute(t,a.type);this[i]=c??((o=this._$Ej)==null?void 0:o.get(i))??c,this._$Em=null}}requestUpdate(e,t,r,i=!1,n){var o;if(e!==void 0){const a=this.constructor;if(i===!1&&(n=this[e]),r??(r=a.getPropertyOptions(e)),!((r.hasChanged??ct)(n,t)||r.useDefault&&r.reflect&&n===((o=this._$Ej)==null?void 0:o.get(e))&&!this.hasAttribute(a._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:n},o){r&&!(this._$Ej??(this._$Ej=new Map)).has(e)&&(this._$Ej.set(e,o??t??this[e]),n!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??(this._$Eq=new Set)).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var r;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[n,o]of this._$Ep)this[n]=o;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[n,o]of i){const{wrapped:a}=o,h=this[n];a!==!0||this._$AL.has(n)||h===void 0||this.C(n,void 0,o,h)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(r=this._$EO)==null||r.forEach(i=>{var n;return(n=i.hostUpdate)==null?void 0:n.call(i)}),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(r=>{var i;return(i=r.hostUpdated)==null?void 0:i.call(r)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&(this._$Eq=this._$Eq.forEach(t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}};se.elementStyles=[],se.shadowRootOptions={mode:"open"},se[be("elementProperties")]=new Map,se[be("finalized")]=new Map,Ge==null||Ge({ReactiveElement:se}),(W.reactiveElementVersions??(W.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ke=globalThis,Ot=s=>s,Be=ke.trustedTypes,Lt=Be?Be.createPolicy("lit-html",{createHTML:s=>s}):void 0,ps="$lit$",G=`lit$${Math.random().toFixed(9).slice(2)}$`,us="?"+G,Ir=`<${us}>`,J=document,ve=()=>J.createComment(""),_e=s=>s===null||typeof s!="object"&&typeof s!="function",ht=Array.isArray,Cr=s=>ht(s)||typeof(s==null?void 0:s[Symbol.iterator])=="function",We=`[ 	
\f\r]`,le=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,jt=/-->/g,Mt=/>/g,V=RegExp(`>|${We}(?:([^\\s"'>=/]+)(${We}*=${We}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Bt=/'/g,Nt=/"/g,fs=/^(?:script|style|textarea|title)$/i,zr=s=>(e,...t)=>({_$litType$:s,strings:e,values:t}),$=zr(1),re=Symbol.for("lit-noChange"),T=Symbol.for("lit-nothing"),Ut=new WeakMap,K=J.createTreeWalker(J,129);function gs(s,e){if(!ht(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return Lt!==void 0?Lt.createHTML(e):e}const Or=(s,e)=>{const t=s.length-1,r=[];let i,n=e===2?"<svg>":e===3?"<math>":"",o=le;for(let a=0;a<t;a++){const h=s[a];let c,d,l=-1,p=0;for(;p<h.length&&(o.lastIndex=p,d=o.exec(h),d!==null);)p=o.lastIndex,o===le?d[1]==="!--"?o=jt:d[1]!==void 0?o=Mt:d[2]!==void 0?(fs.test(d[2])&&(i=RegExp("</"+d[2],"g")),o=V):d[3]!==void 0&&(o=V):o===V?d[0]===">"?(o=i??le,l=-1):d[1]===void 0?l=-2:(l=o.lastIndex-d[2].length,c=d[1],o=d[3]===void 0?V:d[3]==='"'?Nt:Bt):o===Nt||o===Bt?o=V:o===jt||o===Mt?o=le:(o=V,i=void 0);const u=o===V&&s[a+1].startsWith("/>")?" ":"";n+=o===le?h+Ir:l>=0?(r.push(c),h.slice(0,l)+ps+h.slice(l)+G+u):h+G+(l===-2?a:u)}return[gs(s,n+(s[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]};class we{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let n=0,o=0;const a=e.length-1,h=this.parts,[c,d]=Or(e,t);if(this.el=we.createElement(c,r),K.currentNode=this.el.content,t===2||t===3){const l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(i=K.nextNode())!==null&&h.length<a;){if(i.nodeType===1){if(i.hasAttributes())for(const l of i.getAttributeNames())if(l.endsWith(ps)){const p=d[o++],u=i.getAttribute(l).split(G),m=/([.?@])?(.*)/.exec(p);h.push({type:1,index:n,name:m[2],strings:u,ctor:m[1]==="."?jr:m[1]==="?"?Mr:m[1]==="@"?Br:qe}),i.removeAttribute(l)}else l.startsWith(G)&&(h.push({type:6,index:n}),i.removeAttribute(l));if(fs.test(i.tagName)){const l=i.textContent.split(G),p=l.length-1;if(p>0){i.textContent=Be?Be.emptyScript:"";for(let u=0;u<p;u++)i.append(l[u],ve()),K.nextNode(),h.push({type:2,index:++n});i.append(l[p],ve())}}}else if(i.nodeType===8)if(i.data===us)h.push({type:2,index:n});else{let l=-1;for(;(l=i.data.indexOf(G,l+1))!==-1;)h.push({type:7,index:n}),l+=G.length-1}n++}}static createElement(e,t){const r=J.createElement("template");return r.innerHTML=e,r}}function ie(s,e,t=s,r){var o,a;if(e===re)return e;let i=r!==void 0?(o=t._$Co)==null?void 0:o[r]:t._$Cl;const n=_e(e)?void 0:e._$litDirective$;return(i==null?void 0:i.constructor)!==n&&((a=i==null?void 0:i._$AO)==null||a.call(i,!1),n===void 0?i=void 0:(i=new n(s),i._$AT(s,t,r)),r!==void 0?(t._$Co??(t._$Co=[]))[r]=i:t._$Cl=i),i!==void 0&&(e=ie(s,i._$AS(s,e.values),i,r)),e}class Lr{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,i=((e==null?void 0:e.creationScope)??J).importNode(t,!0);K.currentNode=i;let n=K.nextNode(),o=0,a=0,h=r[0];for(;h!==void 0;){if(o===h.index){let c;h.type===2?c=new Se(n,n.nextSibling,this,e):h.type===1?c=new h.ctor(n,h.name,h.strings,this,e):h.type===6&&(c=new Nr(n,this,e)),this._$AV.push(c),h=r[++a]}o!==(h==null?void 0:h.index)&&(n=K.nextNode(),o++)}return K.currentNode=J,i}p(e){let t=0;for(const r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}}class Se{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=T,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=(i==null?void 0:i.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=ie(this,e,t),_e(e)?e===T||e==null||e===""?(this._$AH!==T&&this._$AR(),this._$AH=T):e!==this._$AH&&e!==re&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Cr(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==T&&_e(this._$AH)?this._$AA.nextSibling.data=e:this.T(J.createTextNode(e)),this._$AH=e}$(e){var n;const{values:t,_$litType$:r}=e,i=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=we.createElement(gs(r.h,r.h[0]),this.options)),r);if(((n=this._$AH)==null?void 0:n._$AD)===i)this._$AH.p(t);else{const o=new Lr(i,this),a=o.u(this.options);o.p(t),this.T(a),this._$AH=o}}_$AC(e){let t=Ut.get(e.strings);return t===void 0&&Ut.set(e.strings,t=new we(e)),t}k(e){ht(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let r,i=0;for(const n of e)i===t.length?t.push(r=new Se(this.O(ve()),this.O(ve()),this,this.options)):r=t[i],r._$AI(n),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){var r;for((r=this._$AP)==null?void 0:r.call(this,!1,!0,t);e!==this._$AB;){const i=Ot(e).nextSibling;Ot(e).remove(),e=i}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class qe{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,n){this.type=1,this._$AH=T,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=n,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=T}_$AI(e,t=this,r,i){const n=this.strings;let o=!1;if(n===void 0)e=ie(this,e,t,0),o=!_e(e)||e!==this._$AH&&e!==re,o&&(this._$AH=e);else{const a=e;let h,c;for(e=n[0],h=0;h<n.length-1;h++)c=ie(this,a[r+h],t,h),c===re&&(c=this._$AH[h]),o||(o=!_e(c)||c!==this._$AH[h]),c===T?e=T:e!==T&&(e+=(c??"")+n[h+1]),this._$AH[h]=c}o&&!i&&this.j(e)}j(e){e===T?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class jr extends qe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===T?void 0:e}}class Mr extends qe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==T)}}class Br extends qe{constructor(e,t,r,i,n){super(e,t,r,i,n),this.type=5}_$AI(e,t=this){if((e=ie(this,e,t,0)??T)===re)return;const r=this._$AH,i=e===T&&r!==T||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,n=e!==T&&(r===T||i);i&&this.element.removeEventListener(this.name,this,r),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class Nr{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){ie(this,e)}}const Qe=ke.litHtmlPolyfillSupport;Qe==null||Qe(we,Se),(ke.litHtmlVersions??(ke.litHtmlVersions=[])).push("3.3.2");const Ur=(s,e,t)=>{const r=(t==null?void 0:t.renderBefore)??e;let i=r._$litPart$;if(i===void 0){const n=(t==null?void 0:t.renderBefore)??null;r._$litPart$=i=new Se(e.insertBefore(ve(),n),n,void 0,t??{})}return i._$AI(s),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const X=globalThis;class F extends se{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ur(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return re}}var hs;F._$litElement$=!0,F.finalized=!0,(hs=X.litElementHydrateSupport)==null||hs.call(X,{LitElement:F});const Ve=X.litElementPolyfillSupport;Ve==null||Ve({LitElement:F});(X.litElementVersions??(X.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Ae=s=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(s,e)}):customElements.define(s,e)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Dr={attribute:!0,type:String,converter:Me,reflect:!1,hasChanged:ct},qr=(s=Dr,e,t)=>{const{kind:r,metadata:i}=t;let n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),r==="setter"&&((s=Object.create(s)).wrapped=!0),n.set(t.name,s),r==="accessor"){const{name:o}=t;return{set(a){const h=e.get.call(this);e.set.call(this,a),this.requestUpdate(o,h,s,!0,a)},init(a){return a!==void 0&&this.C(o,void 0,s,a),a}}}if(r==="setter"){const{name:o}=t;return function(a){const h=this[o];e.call(this,a),this.requestUpdate(o,h,s,!0,a)}}throw Error("Unsupported decorator location: "+r)};function R(s){return(e,t)=>typeof t=="object"?qr(s,e,t):((r,i,n)=>{const o=i.hasOwnProperty(n);return i.constructor.createProperty(n,r),o?Object.getOwnPropertyDescriptor(i,n):void 0})(s,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function j(s){return R({...s,state:!0,attribute:!1})}function ms(){return typeof window<"u"?window.location.origin:"http://127.0.0.1:3000"}function Hr(){const s=new URL(ms());return s.protocol=s.protocol==="https:"?"wss:":"ws:",s.pathname="/ws",s.search="",s.hash="",s.toString()}function Ke(s){const e=new URLSearchParams;for(const[r,i]of Object.entries(s))i&&e.set(r,i);const t=e.toString();return t?`?${t}`:""}class Fr{constructor(e=ms()){this.baseUrl=e}endpoint(e){return new URL(e,this.baseUrl).toString()}async request(e,t){const r=new Headers(t==null?void 0:t.headers);r.has("accept")||r.set("accept","application/json");const i=await fetch(this.endpoint(e),{...t,headers:r});if(!i.ok){const n=await i.text().catch(()=>"");throw new Error(n?`${i.status} ${i.statusText}: ${n}`:`${i.status} ${i.statusText}`)}return await i.json()}listProjects(){return this.request("/api/projects")}listPlans(e,t){return this.request(`/api/projects/${encodeURIComponent(e)}/plans${Ke({status:t})}`)}listTasks(e,t,r){return this.request(`/api/projects/${encodeURIComponent(e)}/tasks${Ke({planRef:t,status:r})}`)}getPlan(e){return this.request(`/api/plans/${encodeURIComponent(e)}`)}getPlanSummary(e){return this.request(`/api/plans/${encodeURIComponent(e)}/summary`)}getTask(e){return this.request(`/api/tasks/${encodeURIComponent(e)}`)}getSelection(e,t){return this.request(`/api/projects/${encodeURIComponent(e)}/selection${Ke({planRef:t.planId,taskId:t.taskId})}`)}}class Zr{constructor(e=Hr()){this.url=e,this.socket=null,this.reconnectTimer=null,this.running=!1,this.onStatus=null,this.onMessage=null}connect(){this.running=!0,this.open()}disconnect(){var e,t;this.running=!1,this.reconnectTimer!==null&&(window.clearTimeout(this.reconnectTimer),this.reconnectTimer=null),(e=this.socket)==null||e.close(),this.socket=null,(t=this.onStatus)==null||t.call(this,"closed")}open(){var t;if(!this.running)return;(t=this.onStatus)==null||t.call(this,"connecting");const e=new WebSocket(this.url);this.socket=e,e.addEventListener("open",()=>{var r;return(r=this.onStatus)==null?void 0:r.call(this,"open")}),e.addEventListener("message",r=>{var i,n;try{(i=this.onMessage)==null||i.call(this,JSON.parse(String(r.data)))}catch{(n=this.onMessage)==null||n.call(this,{type:"invalidate",reason:"unparseable-message"})}}),e.addEventListener("error",()=>{var r;return(r=this.onStatus)==null?void 0:r.call(this,"error")}),e.addEventListener("close",()=>{var r;(r=this.onStatus)==null||r.call(this,"closed"),this.running&&(this.reconnectTimer!==null&&window.clearTimeout(this.reconnectTimer),this.reconnectTimer=window.setTimeout(()=>{this.reconnectTimer=null,this.open()},2e3))})}}const bs=["project","plan","task"];function Gr(){if(typeof window>"u")return{};const s=new URLSearchParams(window.location.search),e={};for(const t of bs){const r=s.get(t);r&&(e[`${t}Id`]=r)}return e}function Dt(s,e=!1){if(typeof window>"u")return;const t=new URL(window.location.href),r=t.searchParams;for(const o of bs){const a=s[`${o}Id`];a?r.set(o,a):r.delete(o)}const i=`${t.pathname}${r.toString()?`?${r.toString()}`:""}${t.hash}`,n={selection:s};e?history.replaceState(n,"",i):history.pushState(n,"",i)}var Wr=Object.create,dt=Object.defineProperty,Qr=Object.getOwnPropertyDescriptor,ks=(s,e)=>(e=Symbol[s])?e:Symbol.for("Symbol."+s),Pe=s=>{throw TypeError(s)},Vr=(s,e,t)=>e in s?dt(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t,qt=(s,e)=>dt(s,"name",{value:e,configurable:!0}),Kr=s=>[,,,Wr((s==null?void 0:s[ks("metadata")])??null)],$s=["class","method","getter","setter","accessor","field","value","get","set"],pe=s=>s!==void 0&&typeof s!="function"?Pe("Function expected"):s,Xr=(s,e,t,r,i)=>({kind:$s[s],name:e,metadata:r,addInitializer:n=>t._?Pe("Already initialized"):i.push(pe(n||null))}),Jr=(s,e)=>Vr(e,ks("metadata"),s[3]),M=(s,e,t,r)=>{for(var i=0,n=s[e>>1],o=n&&n.length;i<o;i++)e&1?n[i].call(t):r=n[i].call(t,r);return r},ee=(s,e,t,r,i,n)=>{var o,a,h,c,d,l=e&7,p=!!(e&8),u=!!(e&16),m=l>3?s.length+1:l?p?1:2:0,k=$s[l+5],E=l>3&&(s[m-1]=[]),L=s[m]||(s[m]=[]),g=l&&(!u&&!p&&(i=i.prototype),l<5&&(l>3||!u)&&Qr(l<4?i:{get[t](){return Ht(this,n)},set[t](f){return Ft(this,n,f)}},t));l?u&&l<4&&qt(n,(l>2?"set ":l>1?"get ":"")+t):qt(i,t);for(var y=r.length-1;y>=0;y--)c=Xr(l,t,h={},s[3],L),l&&(c.static=p,c.private=u,d=c.access={has:u?f=>Yr(i,f):f=>t in f},l^3&&(d.get=u?f=>(l^1?Ht:ei)(f,i,l^4?n:g.get):f=>f[t]),l>2&&(d.set=u?(f,S)=>Ft(f,i,S,l^4?n:g.set):(f,S)=>f[t]=S)),a=(0,r[y])(l?l<4?u?n:g[k]:l>4?void 0:{get:g.get,set:g.set}:i,c),h._=1,l^4||a===void 0?pe(a)&&(l>4?E.unshift(a):l?u?n=a:g[k]=a:i=a):typeof a!="object"||a===null?Pe("Object expected"):(pe(o=a.get)&&(g.get=o),pe(o=a.set)&&(g.set=o),pe(o=a.init)&&E.unshift(o));return l||Jr(s,i),g&&dt(i,t,g),u?l^4?n:g:i},pt=(s,e,t)=>e.has(s)||Pe("Cannot "+t),Yr=(s,e)=>Object(e)!==e?Pe('Cannot use the "in" operator on this value'):s.has(e),Ht=(s,e,t)=>(pt(s,e,"read from private field"),t?t.call(s):e.get(s)),Ft=(s,e,t,r)=>(pt(s,e,"write to private field"),r?r.call(s,t):e.set(s,t),t),ei=(s,e,t)=>(pt(s,e,"access private method"),t),vs,_s,ws,xs,ys,Ss,Je,As,A;const ti=new Intl.DateTimeFormat(void 0,{dateStyle:"medium",timeStyle:"short"});function ce(s){return s?ti.format(new Date(s)):"—"}function Zt(s){return s==null||s===""?"—":String(s)}function si(s){return s.split(",").map(e=>e.trim()).filter(Boolean)}function Gt(s){const e=s.trim();return e.includes(`
`)||e.length>220||e.includes("```")}As=[Ae("ab-detail-panel")];class U extends(Je=F,Ss=[R({type:Object})],ys=[R({type:Object})],xs=[R({type:Object})],ws=[R({type:Object})],_s=[R({type:Boolean})],vs=[R({type:String})],Je){constructor(){super(...arguments),this.project=M(A,8,this,null),M(A,11,this),this.plan=M(A,12,this,null),M(A,15,this),this.task=M(A,16,this,null),M(A,19,this),this.summary=M(A,20,this,null),M(A,23,this),this.loading=M(A,24,this,!1),M(A,27,this),this.connectionState=M(A,28,this,"closed"),M(A,31,this)}renderField(e,t,r={}){const i=Zt(t);return $`
      <div class="field">
        <span class="label">${e}</span>
        <span class=${r.mono?"mono":""}>${i}</span>
      </div>
    `}renderMarkdownBlock(e,t,r={}){const i=t.trim();return i?r.collapse??Gt(i)?$`
        <details>
          <summary>${e}</summary>
          <div class="markdown-wrap">
            <ab-markdown .content=${i}></ab-markdown>
          </div>
        </details>
      `:$`
      <div class="field field-block">
        <span class="label">${e}</span>
        <div class="markdown-wrap">
          <ab-markdown .content=${i}></ab-markdown>
        </div>
      </div>
    `:$`
        <div class="field field-block">
          <span class="label">${e}</span>
          <span class="muted">—</span>
        </div>
      `}renderChips(e){return e.length===0?$`<span class="muted">—</span>`:$`
      <div class="chips">
        ${e.map(t=>$`<span class="chip mono">${t}</span>`)}
      </div>
    `}renderProject(e){return $`
      <div class="section">
        <div class="section-header">
          <h3>Project</h3>
          <span class="badge mono">${e.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title",e.title)}
          ${this.renderField("Repository",e.name,{mono:!0})}
          ${this.renderField("Plans",e.plan_count)}
          ${this.renderField("Tasks",e.task_count)}
          ${this.renderField("Database",e.db_path,{mono:!0})}
          ${this.renderField("Updated",ce(e.updated_at))}
          ${this.renderField("Git root",e.git_root,{mono:!0})}
          ${this.renderField("Git common dir",e.git_common_dir,{mono:!0})}
        </div>

        ${this.renderMarkdownBlock("Description",e.description,{collapse:Gt(e.description)})}
      </div>
    `}renderPlan(e,t){return $`
      <div class="section">
        <div class="section-header">
          <h3>Plan</h3>
          <span class="badge mono">${e.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title",e.title)}
          ${this.renderField("Status",e.status)}
          ${this.renderField("Name",e.name,{mono:!0})}
          ${this.renderField("Owner",e.created_by||"—")}
          ${this.renderField("Created",ce(e.created_at))}
          ${this.renderField("Updated",ce(e.updated_at))}
        </div>

        <div class="progress">
          ${t?$`
                <div class="field">
                  <span class="label">Progress</span>
                  <span>${t.progress.percentage}% complete · ${t.progress.completed}/${t.progress.total} tasks</span>
                </div>
                <div class="bar"><div style=${`width:${t.progress.percentage}%`}></div></div>
                <div class="chips">
                  <span class="chip">needs guidance ${t.progress.needs_guidance}</span>
                  ${Object.entries(t.progress.by_status).sort(([r],[i])=>r.localeCompare(i)).map(([r,i])=>$`<span class="chip mono">${r}: ${i}</span>`)}
                </div>
              `:null}
        </div>

        ${this.renderMarkdownBlock("Description",e.description)}
        ${this.renderMarkdownBlock("Specification",e.spec,{collapse:!0})}
        ${this.renderMarkdownBlock("Document",e.document,{collapse:!0})}
      </div>
    `}renderTask(e){const t=si(e.depends_on);return $`
      <div class="section">
        <div class="section-header">
          <h3>Task</h3>
          <span class="badge mono">${e.id}</span>
        </div>

        <div class="meta-grid">
          ${this.renderField("Title",e.title)}
          ${this.renderField("Status",e.status)}
          ${this.renderField("Priority",e.priority)}
          ${this.renderField("Position",e.position)}
          ${this.renderField("Plan",e.plan_id,{mono:!0})}
          ${this.renderField("Assignee",e.assignee||"—")}
          ${this.renderField("Session",e.session_id||"—",{mono:!0})}
          ${this.renderField("Updated",ce(e.updated_at))}
        </div>

        <div class="task-snapshot">
          <div class="label-value"><span class="label">Worktree</span><span class="mono">${Zt(e.worktree_dir)}</span></div>
          <div class="label-value"><span class="label">Created</span><span>${ce(e.created_at)}</span></div>
          <div class="label-value"><span class="label">Depends on</span>${this.renderChips(t)}</div>
        </div>

        ${this.renderMarkdownBlock("Description",e.description)}
        ${this.renderMarkdownBlock("Notes",e.notes,{collapse:!0})}
      </div>
    `}render(){return $`
      <section class="panel">
        <div class="header">
          <h2 class="title">Details</h2>
          <div class="badge">ws: ${this.connectionState}</div>
        </div>

        ${this.project?this.renderProject(this.project):$`<div class="empty">${this.loading?"Loading project…":"Pick a project or plan to see details."}</div>`}

        ${this.plan?this.renderPlan(this.plan,this.summary):$`<div class="empty">Select a plan to inspect its details.</div>`}

        ${this.task?this.renderTask(this.task):$`<div class="empty">Select a task to inspect its details.</div>`}
      </section>
    `}}A=Kr(Je);ee(A,5,"project",Ss,U);ee(A,5,"plan",ys,U);ee(A,5,"task",xs,U);ee(A,5,"summary",ws,U);ee(A,5,"loading",_s,U);ee(A,5,"connectionState",vs,U);U=ee(A,0,"AgentbookDetailPanel",As,U);U.styles=ye`
    :host {
      display: block;
      min-height: 0;
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 100%;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.22);
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: start;
    }

    .title {
      margin: 0;
      font-size: 1rem;
    }

    .badge,
    .pill,
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      padding: 0.18rem 0.55rem;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.76rem;
    }

    .section {
      display: grid;
      gap: 0.5rem;
      padding: 0.85rem;
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.46);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    .section h3 {
      margin: 0;
      font-size: 0.92rem;
      color: #dbeafe;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: start;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .field {
      display: grid;
      gap: 0.15rem;
      color: #cbd5e1;
      font-size: 0.9rem;
    }

    .field-block {
      gap: 0.35rem;
    }

    .label {
      color: #94a3b8;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      word-break: break-word;
    }

    .muted {
      color: #94a3b8;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .chip {
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.74rem;
    }

    .progress {
      display: grid;
      gap: 0.35rem;
    }

    .bar {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.14);
      overflow: hidden;
    }

    .bar > div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
    }

    details {
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.56);
      padding: 0.5rem 0.7rem;
    }

    summary {
      cursor: pointer;
      color: #dbeafe;
      font-weight: 600;
    }

    details summary::-webkit-details-marker {
      color: #94a3b8;
    }

    .markdown-wrap {
      margin-top: 0.55rem;
    }

    .empty {
      color: #94a3b8;
      border: 1px dashed rgba(148, 163, 184, 0.24);
      border-radius: 14px;
      padding: 0.8rem;
    }

    .task-snapshot {
      display: grid;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #cbd5e1;
    }

    .task-snapshot .label-value {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    @media (max-width: 860px) {
      .meta-grid {
        grid-template-columns: 1fr;
      }
    }
  `;M(A,1,U);function ut(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var te=ut();function Ps(s){te=s}var $e={exec:()=>null};function _(s,e=""){let t=typeof s=="string"?s:s.source;const r={replace:(i,n)=>{let o=typeof n=="string"?n:n.source;return o=o.replace(z.caret,"$1"),t=t.replace(i,o),r},getRegex:()=>new RegExp(t,e)};return r}var z={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] /,listReplaceTask:/^\[[ xX]\] +/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:s=>new RegExp(`^( {0,3}${s})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}#`),htmlBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}<(?:[a-z].*>|!--)`,"i")},ri=/^(?:[ \t]*(?:\n|$))+/,ii=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,ni=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,Te=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,ai=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,ft=/(?:[*+-]|\d{1,9}[.)])/,Ts=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Es=_(Ts).replace(/bull/g,ft).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),oi=_(Ts).replace(/bull/g,ft).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),gt=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,li=/^[^\n]+/,mt=/(?!\s*\])(?:\\.|[^\[\]\\])+/,ci=_(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",mt).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),hi=_(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,ft).getRegex(),He="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",bt=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,di=_("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",bt).replace("tag",He).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Rs=_(gt).replace("hr",Te).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",He).getRegex(),pi=_(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Rs).getRegex(),kt={blockquote:pi,code:ii,def:ci,fences:ni,heading:ai,hr:Te,html:di,lheading:Es,list:hi,newline:ri,paragraph:Rs,table:$e,text:li},Wt=_("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",Te).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",He).getRegex(),ui={...kt,lheading:oi,table:Wt,paragraph:_(gt).replace("hr",Te).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Wt).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",He).getRegex()},fi={...kt,html:_(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",bt).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:$e,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:_(gt).replace("hr",Te).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Es).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},gi=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,mi=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Is=/^( {2,}|\\)\n(?!\s*$)/,bi=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,Fe=/[\p{P}\p{S}]/u,$t=/[\s\p{P}\p{S}]/u,Cs=/[^\s\p{P}\p{S}]/u,ki=_(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,$t).getRegex(),zs=/(?!~)[\p{P}\p{S}]/u,$i=/(?!~)[\s\p{P}\p{S}]/u,vi=/(?:[^\s\p{P}\p{S}]|~)/u,_i=/\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,Os=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,wi=_(Os,"u").replace(/punct/g,Fe).getRegex(),xi=_(Os,"u").replace(/punct/g,zs).getRegex(),Ls="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",yi=_(Ls,"gu").replace(/notPunctSpace/g,Cs).replace(/punctSpace/g,$t).replace(/punct/g,Fe).getRegex(),Si=_(Ls,"gu").replace(/notPunctSpace/g,vi).replace(/punctSpace/g,$i).replace(/punct/g,zs).getRegex(),Ai=_("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Cs).replace(/punctSpace/g,$t).replace(/punct/g,Fe).getRegex(),Pi=_(/\\(punct)/,"gu").replace(/punct/g,Fe).getRegex(),Ti=_(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Ei=_(bt).replace("(?:-->|$)","-->").getRegex(),Ri=_("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Ei).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Ne=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,Ii=_(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Ne).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),js=_(/^!?\[(label)\]\[(ref)\]/).replace("label",Ne).replace("ref",mt).getRegex(),Ms=_(/^!?\[(ref)\](?:\[\])?/).replace("ref",mt).getRegex(),Ci=_("reflink|nolink(?!\\()","g").replace("reflink",js).replace("nolink",Ms).getRegex(),vt={_backpedal:$e,anyPunctuation:Pi,autolink:Ti,blockSkip:_i,br:Is,code:mi,del:$e,emStrongLDelim:wi,emStrongRDelimAst:yi,emStrongRDelimUnd:Ai,escape:gi,link:Ii,nolink:Ms,punctuation:ki,reflink:js,reflinkSearch:Ci,tag:Ri,text:bi,url:$e},zi={...vt,link:_(/^!?\[(label)\]\((.*?)\)/).replace("label",Ne).getRegex(),reflink:_(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Ne).getRegex()},Ye={...vt,emStrongRDelimAst:Si,emStrongLDelim:xi,url:_(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,"i").replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,text:/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/},Oi={...Ye,br:_(Is).replace("{2,}","*").getRegex(),text:_(Ye.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},Oe={normal:kt,gfm:ui,pedantic:fi},he={normal:vt,gfm:Ye,breaks:Oi,pedantic:zi},Li={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Qt=s=>Li[s];function N(s,e){if(e){if(z.escapeTest.test(s))return s.replace(z.escapeReplace,Qt)}else if(z.escapeTestNoEncode.test(s))return s.replace(z.escapeReplaceNoEncode,Qt);return s}function Vt(s){try{s=encodeURI(s).replace(z.percentDecode,"%")}catch{return null}return s}function Kt(s,e){var n;const t=s.replace(z.findPipe,(o,a,h)=>{let c=!1,d=a;for(;--d>=0&&h[d]==="\\";)c=!c;return c?"|":" |"}),r=t.split(z.splitPipe);let i=0;if(r[0].trim()||r.shift(),r.length>0&&!((n=r.at(-1))!=null&&n.trim())&&r.pop(),e)if(r.length>e)r.splice(e);else for(;r.length<e;)r.push("");for(;i<r.length;i++)r[i]=r[i].trim().replace(z.slashPipe,"|");return r}function de(s,e,t){const r=s.length;if(r===0)return"";let i=0;for(;i<r&&s.charAt(r-i-1)===e;)i++;return s.slice(0,r-i)}function ji(s,e){if(s.indexOf(e[1])===-1)return-1;let t=0;for(let r=0;r<s.length;r++)if(s[r]==="\\")r++;else if(s[r]===e[0])t++;else if(s[r]===e[1]&&(t--,t<0))return r;return t>0?-2:-1}function Xt(s,e,t,r,i){const n=e.href,o=e.title||null,a=s[1].replace(i.other.outputLinkReplace,"$1");r.state.inLink=!0;const h={type:s[0].charAt(0)==="!"?"image":"link",raw:t,href:n,title:o,text:a,tokens:r.inlineTokens(a)};return r.state.inLink=!1,h}function Mi(s,e,t){const r=s.match(t.other.indentCodeCompensation);if(r===null)return e;const i=r[1];return e.split(`
`).map(n=>{const o=n.match(t.other.beginningSpace);if(o===null)return n;const[a]=o;return a.length>=i.length?n.slice(i.length):n}).join(`
`)}var Ue=class{constructor(s){w(this,"options");w(this,"rules");w(this,"lexer");this.options=s||te}space(s){const e=this.rules.block.newline.exec(s);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(s){const e=this.rules.block.code.exec(s);if(e){const t=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?t:de(t,`
`)}}}fences(s){const e=this.rules.block.fences.exec(s);if(e){const t=e[0],r=Mi(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:r}}}heading(s){const e=this.rules.block.heading.exec(s);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){const r=de(t,"#");(this.options.pedantic||!r||this.rules.other.endingSpaceChar.test(r))&&(t=r.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(s){const e=this.rules.block.hr.exec(s);if(e)return{type:"hr",raw:de(e[0],`
`)}}blockquote(s){const e=this.rules.block.blockquote.exec(s);if(e){let t=de(e[0],`
`).split(`
`),r="",i="";const n=[];for(;t.length>0;){let o=!1;const a=[];let h;for(h=0;h<t.length;h++)if(this.rules.other.blockquoteStart.test(t[h]))a.push(t[h]),o=!0;else if(!o)a.push(t[h]);else break;t=t.slice(h);const c=a.join(`
`),d=c.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");r=r?`${r}
${c}`:c,i=i?`${i}
${d}`:d;const l=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(d,n,!0),this.lexer.state.top=l,t.length===0)break;const p=n.at(-1);if((p==null?void 0:p.type)==="code")break;if((p==null?void 0:p.type)==="blockquote"){const u=p,m=u.raw+`
`+t.join(`
`),k=this.blockquote(m);n[n.length-1]=k,r=r.substring(0,r.length-u.raw.length)+k.raw,i=i.substring(0,i.length-u.text.length)+k.text;break}else if((p==null?void 0:p.type)==="list"){const u=p,m=u.raw+`
`+t.join(`
`),k=this.list(m);n[n.length-1]=k,r=r.substring(0,r.length-p.raw.length)+k.raw,i=i.substring(0,i.length-u.raw.length)+k.raw,t=m.substring(n.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:r,tokens:n,text:i}}}list(s){let e=this.rules.block.list.exec(s);if(e){let t=e[1].trim();const r=t.length>1,i={type:"list",raw:"",ordered:r,start:r?+t.slice(0,-1):"",loose:!1,items:[]};t=r?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=r?t:"[*+-]");const n=this.rules.other.listItemRegex(t);let o=!1;for(;s;){let h=!1,c="",d="";if(!(e=n.exec(s))||this.rules.block.hr.test(s))break;c=e[0],s=s.substring(c.length);let l=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,L=>" ".repeat(3*L.length)),p=s.split(`
`,1)[0],u=!l.trim(),m=0;if(this.options.pedantic?(m=2,d=l.trimStart()):u?m=e[1].length+1:(m=e[2].search(this.rules.other.nonSpaceChar),m=m>4?1:m,d=l.slice(m),m+=e[1].length),u&&this.rules.other.blankLine.test(p)&&(c+=p+`
`,s=s.substring(p.length+1),h=!0),!h){const L=this.rules.other.nextBulletRegex(m),g=this.rules.other.hrRegex(m),y=this.rules.other.fencesBeginRegex(m),f=this.rules.other.headingBeginRegex(m),S=this.rules.other.htmlBeginRegex(m);for(;s;){const Ze=s.split(`
`,1)[0];let oe;if(p=Ze,this.options.pedantic?(p=p.replace(this.rules.other.listReplaceNesting,"  "),oe=p):oe=p.replace(this.rules.other.tabCharGlobal,"    "),y.test(p)||f.test(p)||S.test(p)||L.test(p)||g.test(p))break;if(oe.search(this.rules.other.nonSpaceChar)>=m||!p.trim())d+=`
`+oe.slice(m);else{if(u||l.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||y.test(l)||f.test(l)||g.test(l))break;d+=`
`+p}!u&&!p.trim()&&(u=!0),c+=Ze+`
`,s=s.substring(Ze.length+1),l=oe.slice(m)}}i.loose||(o?i.loose=!0:this.rules.other.doubleBlankLine.test(c)&&(o=!0));let k=null,E;this.options.gfm&&(k=this.rules.other.listIsTask.exec(d),k&&(E=k[0]!=="[ ] ",d=d.replace(this.rules.other.listReplaceTask,""))),i.items.push({type:"list_item",raw:c,task:!!k,checked:E,loose:!1,text:d,tokens:[]}),i.raw+=c}const a=i.items.at(-1);if(a)a.raw=a.raw.trimEnd(),a.text=a.text.trimEnd();else return;i.raw=i.raw.trimEnd();for(let h=0;h<i.items.length;h++)if(this.lexer.state.top=!1,i.items[h].tokens=this.lexer.blockTokens(i.items[h].text,[]),!i.loose){const c=i.items[h].tokens.filter(l=>l.type==="space"),d=c.length>0&&c.some(l=>this.rules.other.anyLine.test(l.raw));i.loose=d}if(i.loose)for(let h=0;h<i.items.length;h++)i.items[h].loose=!0;return i}}html(s){const e=this.rules.block.html.exec(s);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(s){const e=this.rules.block.def.exec(s);if(e){const t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),r=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",i=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:e[0],href:r,title:i}}}table(s){var o;const e=this.rules.block.table.exec(s);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;const t=Kt(e[1]),r=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),i=(o=e[3])!=null&&o.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],n={type:"table",raw:e[0],header:[],align:[],rows:[]};if(t.length===r.length){for(const a of r)this.rules.other.tableAlignRight.test(a)?n.align.push("right"):this.rules.other.tableAlignCenter.test(a)?n.align.push("center"):this.rules.other.tableAlignLeft.test(a)?n.align.push("left"):n.align.push(null);for(let a=0;a<t.length;a++)n.header.push({text:t[a],tokens:this.lexer.inline(t[a]),header:!0,align:n.align[a]});for(const a of i)n.rows.push(Kt(a,n.header.length).map((h,c)=>({text:h,tokens:this.lexer.inline(h),header:!1,align:n.align[c]})));return n}}lheading(s){const e=this.rules.block.lheading.exec(s);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(s){const e=this.rules.block.paragraph.exec(s);if(e){const t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(s){const e=this.rules.block.text.exec(s);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(s){const e=this.rules.inline.escape.exec(s);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(s){const e=this.rules.inline.tag.exec(s);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(s){const e=this.rules.inline.link.exec(s);if(e){const t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;const n=de(t.slice(0,-1),"\\");if((t.length-n.length)%2===0)return}else{const n=ji(e[2],"()");if(n===-2)return;if(n>-1){const a=(e[0].indexOf("!")===0?5:4)+e[1].length+n;e[2]=e[2].substring(0,n),e[0]=e[0].substring(0,a).trim(),e[3]=""}}let r=e[2],i="";if(this.options.pedantic){const n=this.rules.other.pedanticHrefTitle.exec(r);n&&(r=n[1],i=n[3])}else i=e[3]?e[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?r=r.slice(1):r=r.slice(1,-1)),Xt(e,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:i&&i.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(s,e){let t;if((t=this.rules.inline.reflink.exec(s))||(t=this.rules.inline.nolink.exec(s))){const r=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),i=e[r.toLowerCase()];if(!i){const n=t[0].charAt(0);return{type:"text",raw:n,text:n}}return Xt(t,i,t[0],this.lexer,this.rules)}}emStrong(s,e,t=""){let r=this.rules.inline.emStrongLDelim.exec(s);if(!r||r[3]&&t.match(this.rules.other.unicodeAlphaNumeric))return;if(!(r[1]||r[2]||"")||!t||this.rules.inline.punctuation.exec(t)){const n=[...r[0]].length-1;let o,a,h=n,c=0;const d=r[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(d.lastIndex=0,e=e.slice(-1*s.length+n);(r=d.exec(e))!=null;){if(o=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!o)continue;if(a=[...o].length,r[3]||r[4]){h+=a;continue}else if((r[5]||r[6])&&n%3&&!((n+a)%3)){c+=a;continue}if(h-=a,h>0)continue;a=Math.min(a,a+h+c);const l=[...r[0]][0].length,p=s.slice(0,n+r.index+l+a);if(Math.min(n,a)%2){const m=p.slice(1,-1);return{type:"em",raw:p,text:m,tokens:this.lexer.inlineTokens(m)}}const u=p.slice(2,-2);return{type:"strong",raw:p,text:u,tokens:this.lexer.inlineTokens(u)}}}}codespan(s){const e=this.rules.inline.code.exec(s);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," ");const r=this.rules.other.nonSpaceChar.test(t),i=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return r&&i&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(s){const e=this.rules.inline.br.exec(s);if(e)return{type:"br",raw:e[0]}}del(s){const e=this.rules.inline.del.exec(s);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(s){const e=this.rules.inline.autolink.exec(s);if(e){let t,r;return e[2]==="@"?(t=e[1],r="mailto:"+t):(t=e[1],r=t),{type:"link",raw:e[0],text:t,href:r,tokens:[{type:"text",raw:t,text:t}]}}}url(s){var t;let e;if(e=this.rules.inline.url.exec(s)){let r,i;if(e[2]==="@")r=e[0],i="mailto:"+r;else{let n;do n=e[0],e[0]=((t=this.rules.inline._backpedal.exec(e[0]))==null?void 0:t[0])??"";while(n!==e[0]);r=e[0],e[1]==="www."?i="http://"+e[0]:i=e[0]}return{type:"link",raw:e[0],text:r,href:i,tokens:[{type:"text",raw:r,text:r}]}}}inlineText(s){const e=this.rules.inline.text.exec(s);if(e){const t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},q=class et{constructor(e){w(this,"tokens");w(this,"options");w(this,"state");w(this,"tokenizer");w(this,"inlineQueue");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||te,this.options.tokenizer=this.options.tokenizer||new Ue,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};const t={other:z,block:Oe.normal,inline:he.normal};this.options.pedantic?(t.block=Oe.pedantic,t.inline=he.pedantic):this.options.gfm&&(t.block=Oe.gfm,this.options.breaks?t.inline=he.breaks:t.inline=he.gfm),this.tokenizer.rules=t}static get rules(){return{block:Oe,inline:he}}static lex(e,t){return new et(t).lex(e)}static lexInline(e,t){return new et(t).inlineTokens(e)}lex(e){e=e.replace(z.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){const r=this.inlineQueue[t];this.inlineTokens(r.src,r.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],r=!1){var i,n,o;for(this.options.pedantic&&(e=e.replace(z.tabCharGlobal,"    ").replace(z.spaceLine,""));e;){let a;if((n=(i=this.options.extensions)==null?void 0:i.block)!=null&&n.some(c=>(a=c.call({lexer:this},e,t))?(e=e.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.space(e)){e=e.substring(a.raw.length);const c=t.at(-1);a.raw.length===1&&c!==void 0?c.raw+=`
`:t.push(a);continue}if(a=this.tokenizer.code(e)){e=e.substring(a.raw.length);const c=t.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=`
`+a.raw,c.text+=`
`+a.text,this.inlineQueue.at(-1).src=c.text):t.push(a);continue}if(a=this.tokenizer.fences(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.heading(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.hr(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.blockquote(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.list(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.html(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.def(e)){e=e.substring(a.raw.length);const c=t.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=`
`+a.raw,c.text+=`
`+a.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[a.tag]||(this.tokens.links[a.tag]={href:a.href,title:a.title});continue}if(a=this.tokenizer.table(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.lheading(e)){e=e.substring(a.raw.length),t.push(a);continue}let h=e;if((o=this.options.extensions)!=null&&o.startBlock){let c=1/0;const d=e.slice(1);let l;this.options.extensions.startBlock.forEach(p=>{l=p.call({lexer:this},d),typeof l=="number"&&l>=0&&(c=Math.min(c,l))}),c<1/0&&c>=0&&(h=e.substring(0,c+1))}if(this.state.top&&(a=this.tokenizer.paragraph(h))){const c=t.at(-1);r&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=`
`+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):t.push(a),r=h.length!==e.length,e=e.substring(a.raw.length);continue}if(a=this.tokenizer.text(e)){e=e.substring(a.raw.length);const c=t.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=`
`+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):t.push(a);continue}if(e){const c="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(c);break}else throw new Error(c)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var a,h,c;let r=e,i=null;if(this.tokens.links){const d=Object.keys(this.tokens.links);if(d.length>0)for(;(i=this.tokenizer.rules.inline.reflinkSearch.exec(r))!=null;)d.includes(i[0].slice(i[0].lastIndexOf("[")+1,-1))&&(r=r.slice(0,i.index)+"["+"a".repeat(i[0].length-2)+"]"+r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(i=this.tokenizer.rules.inline.anyPunctuation.exec(r))!=null;)r=r.slice(0,i.index)+"++"+r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);for(;(i=this.tokenizer.rules.inline.blockSkip.exec(r))!=null;)r=r.slice(0,i.index)+"["+"a".repeat(i[0].length-2)+"]"+r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);let n=!1,o="";for(;e;){n||(o=""),n=!1;let d;if((h=(a=this.options.extensions)==null?void 0:a.inline)!=null&&h.some(p=>(d=p.call({lexer:this},e,t))?(e=e.substring(d.raw.length),t.push(d),!0):!1))continue;if(d=this.tokenizer.escape(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.tag(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.link(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(d.raw.length);const p=t.at(-1);d.type==="text"&&(p==null?void 0:p.type)==="text"?(p.raw+=d.raw,p.text+=d.text):t.push(d);continue}if(d=this.tokenizer.emStrong(e,r,o)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.codespan(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.br(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.del(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.autolink(e)){e=e.substring(d.raw.length),t.push(d);continue}if(!this.state.inLink&&(d=this.tokenizer.url(e))){e=e.substring(d.raw.length),t.push(d);continue}let l=e;if((c=this.options.extensions)!=null&&c.startInline){let p=1/0;const u=e.slice(1);let m;this.options.extensions.startInline.forEach(k=>{m=k.call({lexer:this},u),typeof m=="number"&&m>=0&&(p=Math.min(p,m))}),p<1/0&&p>=0&&(l=e.substring(0,p+1))}if(d=this.tokenizer.inlineText(l)){e=e.substring(d.raw.length),d.raw.slice(-1)!=="_"&&(o=d.raw.slice(-1)),n=!0;const p=t.at(-1);(p==null?void 0:p.type)==="text"?(p.raw+=d.raw,p.text+=d.text):t.push(d);continue}if(e){const p="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(p);break}else throw new Error(p)}}return t}},De=class{constructor(s){w(this,"options");w(this,"parser");this.options=s||te}space(s){return""}code({text:s,lang:e,escaped:t}){var n;const r=(n=(e||"").match(z.notSpaceStart))==null?void 0:n[0],i=s.replace(z.endingNewline,"")+`
`;return r?'<pre><code class="language-'+N(r)+'">'+(t?i:N(i,!0))+`</code></pre>
`:"<pre><code>"+(t?i:N(i,!0))+`</code></pre>
`}blockquote({tokens:s}){return`<blockquote>
${this.parser.parse(s)}</blockquote>
`}html({text:s}){return s}heading({tokens:s,depth:e}){return`<h${e}>${this.parser.parseInline(s)}</h${e}>
`}hr(s){return`<hr>
`}list(s){const e=s.ordered,t=s.start;let r="";for(let o=0;o<s.items.length;o++){const a=s.items[o];r+=this.listitem(a)}const i=e?"ol":"ul",n=e&&t!==1?' start="'+t+'"':"";return"<"+i+n+`>
`+r+"</"+i+`>
`}listitem(s){var t;let e="";if(s.task){const r=this.checkbox({checked:!!s.checked});s.loose?((t=s.tokens[0])==null?void 0:t.type)==="paragraph"?(s.tokens[0].text=r+" "+s.tokens[0].text,s.tokens[0].tokens&&s.tokens[0].tokens.length>0&&s.tokens[0].tokens[0].type==="text"&&(s.tokens[0].tokens[0].text=r+" "+N(s.tokens[0].tokens[0].text),s.tokens[0].tokens[0].escaped=!0)):s.tokens.unshift({type:"text",raw:r+" ",text:r+" ",escaped:!0}):e+=r+" "}return e+=this.parser.parse(s.tokens,!!s.loose),`<li>${e}</li>
`}checkbox({checked:s}){return"<input "+(s?'checked="" ':"")+'disabled="" type="checkbox">'}paragraph({tokens:s}){return`<p>${this.parser.parseInline(s)}</p>
`}table(s){let e="",t="";for(let i=0;i<s.header.length;i++)t+=this.tablecell(s.header[i]);e+=this.tablerow({text:t});let r="";for(let i=0;i<s.rows.length;i++){const n=s.rows[i];t="";for(let o=0;o<n.length;o++)t+=this.tablecell(n[o]);r+=this.tablerow({text:t})}return r&&(r=`<tbody>${r}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+r+`</table>
`}tablerow({text:s}){return`<tr>
${s}</tr>
`}tablecell(s){const e=this.parser.parseInline(s.tokens),t=s.header?"th":"td";return(s.align?`<${t} align="${s.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:s}){return`<strong>${this.parser.parseInline(s)}</strong>`}em({tokens:s}){return`<em>${this.parser.parseInline(s)}</em>`}codespan({text:s}){return`<code>${N(s,!0)}</code>`}br(s){return"<br>"}del({tokens:s}){return`<del>${this.parser.parseInline(s)}</del>`}link({href:s,title:e,tokens:t}){const r=this.parser.parseInline(t),i=Vt(s);if(i===null)return r;s=i;let n='<a href="'+s+'"';return e&&(n+=' title="'+N(e)+'"'),n+=">"+r+"</a>",n}image({href:s,title:e,text:t,tokens:r}){r&&(t=this.parser.parseInline(r,this.parser.textRenderer));const i=Vt(s);if(i===null)return N(t);s=i;let n=`<img src="${s}" alt="${t}"`;return e&&(n+=` title="${N(e)}"`),n+=">",n}text(s){return"tokens"in s&&s.tokens?this.parser.parseInline(s.tokens):"escaped"in s&&s.escaped?s.text:N(s.text)}},_t=class{strong({text:s}){return s}em({text:s}){return s}codespan({text:s}){return s}del({text:s}){return s}html({text:s}){return s}text({text:s}){return s}link({text:s}){return""+s}image({text:s}){return""+s}br(){return""}},H=class tt{constructor(e){w(this,"options");w(this,"renderer");w(this,"textRenderer");this.options=e||te,this.options.renderer=this.options.renderer||new De,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new _t}static parse(e,t){return new tt(t).parse(e)}static parseInline(e,t){return new tt(t).parseInline(e)}parse(e,t=!0){var i,n;let r="";for(let o=0;o<e.length;o++){const a=e[o];if((n=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&n[a.type]){const c=a,d=this.options.extensions.renderers[c.type].call({parser:this},c);if(d!==!1||!["space","hr","heading","code","table","blockquote","list","html","paragraph","text"].includes(c.type)){r+=d||"";continue}}const h=a;switch(h.type){case"space":{r+=this.renderer.space(h);continue}case"hr":{r+=this.renderer.hr(h);continue}case"heading":{r+=this.renderer.heading(h);continue}case"code":{r+=this.renderer.code(h);continue}case"table":{r+=this.renderer.table(h);continue}case"blockquote":{r+=this.renderer.blockquote(h);continue}case"list":{r+=this.renderer.list(h);continue}case"html":{r+=this.renderer.html(h);continue}case"paragraph":{r+=this.renderer.paragraph(h);continue}case"text":{let c=h,d=this.renderer.text(c);for(;o+1<e.length&&e[o+1].type==="text";)c=e[++o],d+=`
`+this.renderer.text(c);t?r+=this.renderer.paragraph({type:"paragraph",raw:d,text:d,tokens:[{type:"text",raw:d,text:d,escaped:!0}]}):r+=d;continue}default:{const c='Token with "'+h.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return r}parseInline(e,t=this.renderer){var i,n;let r="";for(let o=0;o<e.length;o++){const a=e[o];if((n=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&n[a.type]){const c=this.options.extensions.renderers[a.type].call({parser:this},a);if(c!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(a.type)){r+=c||"";continue}}const h=a;switch(h.type){case"escape":{r+=t.text(h);break}case"html":{r+=t.html(h);break}case"link":{r+=t.link(h);break}case"image":{r+=t.image(h);break}case"strong":{r+=t.strong(h);break}case"em":{r+=t.em(h);break}case"codespan":{r+=t.codespan(h);break}case"br":{r+=t.br(h);break}case"del":{r+=t.del(h);break}case"text":{r+=t.text(h);break}default:{const c='Token with "'+h.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return r}},Xe,je=(Xe=class{constructor(s){w(this,"options");w(this,"block");this.options=s||te}preprocess(s){return s}postprocess(s){return s}processAllTokens(s){return s}provideLexer(){return this.block?q.lex:q.lexInline}provideParser(){return this.block?H.parse:H.parseInline}},w(Xe,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens"])),Xe),Bi=class{constructor(...s){w(this,"defaults",ut());w(this,"options",this.setOptions);w(this,"parse",this.parseMarkdown(!0));w(this,"parseInline",this.parseMarkdown(!1));w(this,"Parser",H);w(this,"Renderer",De);w(this,"TextRenderer",_t);w(this,"Lexer",q);w(this,"Tokenizer",Ue);w(this,"Hooks",je);this.use(...s)}walkTokens(s,e){var r,i;let t=[];for(const n of s)switch(t=t.concat(e.call(this,n)),n.type){case"table":{const o=n;for(const a of o.header)t=t.concat(this.walkTokens(a.tokens,e));for(const a of o.rows)for(const h of a)t=t.concat(this.walkTokens(h.tokens,e));break}case"list":{const o=n;t=t.concat(this.walkTokens(o.items,e));break}default:{const o=n;(i=(r=this.defaults.extensions)==null?void 0:r.childTokens)!=null&&i[o.type]?this.defaults.extensions.childTokens[o.type].forEach(a=>{const h=o[a].flat(1/0);t=t.concat(this.walkTokens(h,e))}):o.tokens&&(t=t.concat(this.walkTokens(o.tokens,e)))}}return t}use(...s){const e=this.defaults.extensions||{renderers:{},childTokens:{}};return s.forEach(t=>{const r={...t};if(r.async=this.defaults.async||r.async||!1,t.extensions&&(t.extensions.forEach(i=>{if(!i.name)throw new Error("extension name required");if("renderer"in i){const n=e.renderers[i.name];n?e.renderers[i.name]=function(...o){let a=i.renderer.apply(this,o);return a===!1&&(a=n.apply(this,o)),a}:e.renderers[i.name]=i.renderer}if("tokenizer"in i){if(!i.level||i.level!=="block"&&i.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");const n=e[i.level];n?n.unshift(i.tokenizer):e[i.level]=[i.tokenizer],i.start&&(i.level==="block"?e.startBlock?e.startBlock.push(i.start):e.startBlock=[i.start]:i.level==="inline"&&(e.startInline?e.startInline.push(i.start):e.startInline=[i.start]))}"childTokens"in i&&i.childTokens&&(e.childTokens[i.name]=i.childTokens)}),r.extensions=e),t.renderer){const i=this.defaults.renderer||new De(this.defaults);for(const n in t.renderer){if(!(n in i))throw new Error(`renderer '${n}' does not exist`);if(["options","parser"].includes(n))continue;const o=n,a=t.renderer[o],h=i[o];i[o]=(...c)=>{let d=a.apply(i,c);return d===!1&&(d=h.apply(i,c)),d||""}}r.renderer=i}if(t.tokenizer){const i=this.defaults.tokenizer||new Ue(this.defaults);for(const n in t.tokenizer){if(!(n in i))throw new Error(`tokenizer '${n}' does not exist`);if(["options","rules","lexer"].includes(n))continue;const o=n,a=t.tokenizer[o],h=i[o];i[o]=(...c)=>{let d=a.apply(i,c);return d===!1&&(d=h.apply(i,c)),d}}r.tokenizer=i}if(t.hooks){const i=this.defaults.hooks||new je;for(const n in t.hooks){if(!(n in i))throw new Error(`hook '${n}' does not exist`);if(["options","block"].includes(n))continue;const o=n,a=t.hooks[o],h=i[o];je.passThroughHooks.has(n)?i[o]=c=>{if(this.defaults.async)return Promise.resolve(a.call(i,c)).then(l=>h.call(i,l));const d=a.call(i,c);return h.call(i,d)}:i[o]=(...c)=>{let d=a.apply(i,c);return d===!1&&(d=h.apply(i,c)),d}}r.hooks=i}if(t.walkTokens){const i=this.defaults.walkTokens,n=t.walkTokens;r.walkTokens=function(o){let a=[];return a.push(n.call(this,o)),i&&(a=a.concat(i.call(this,o))),a}}this.defaults={...this.defaults,...r}}),this}setOptions(s){return this.defaults={...this.defaults,...s},this}lexer(s,e){return q.lex(s,e??this.defaults)}parser(s,e){return H.parse(s,e??this.defaults)}parseMarkdown(s){return(t,r)=>{const i={...r},n={...this.defaults,...i},o=this.onError(!!n.silent,!!n.async);if(this.defaults.async===!0&&i.async===!1)return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return o(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return o(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));n.hooks&&(n.hooks.options=n,n.hooks.block=s);const a=n.hooks?n.hooks.provideLexer():s?q.lex:q.lexInline,h=n.hooks?n.hooks.provideParser():s?H.parse:H.parseInline;if(n.async)return Promise.resolve(n.hooks?n.hooks.preprocess(t):t).then(c=>a(c,n)).then(c=>n.hooks?n.hooks.processAllTokens(c):c).then(c=>n.walkTokens?Promise.all(this.walkTokens(c,n.walkTokens)).then(()=>c):c).then(c=>h(c,n)).then(c=>n.hooks?n.hooks.postprocess(c):c).catch(o);try{n.hooks&&(t=n.hooks.preprocess(t));let c=a(t,n);n.hooks&&(c=n.hooks.processAllTokens(c)),n.walkTokens&&this.walkTokens(c,n.walkTokens);let d=h(c,n);return n.hooks&&(d=n.hooks.postprocess(d)),d}catch(c){return o(c)}}}onError(s,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,s){const r="<p>An error occurred:</p><pre>"+N(t.message+"",!0)+"</pre>";return e?Promise.resolve(r):r}if(e)return Promise.reject(t);throw t}}},Y=new Bi;function v(s,e){return Y.parse(s,e)}v.options=v.setOptions=function(s){return Y.setOptions(s),v.defaults=Y.defaults,Ps(v.defaults),v};v.getDefaults=ut;v.defaults=te;v.use=function(...s){return Y.use(...s),v.defaults=Y.defaults,Ps(v.defaults),v};v.walkTokens=function(s,e){return Y.walkTokens(s,e)};v.parseInline=Y.parseInline;v.Parser=H;v.parser=H.parse;v.Renderer=De;v.TextRenderer=_t;v.Lexer=q;v.lexer=q.lex;v.Tokenizer=Ue;v.Hooks=je;v.parse=v;v.options;v.setOptions;v.use;v.walkTokens;v.parseInline;H.parse;q.lex;var Ni=Object.create,wt=Object.defineProperty,Ui=Object.getOwnPropertyDescriptor,Bs=(s,e)=>(e=Symbol[s])?e:Symbol.for("Symbol."+s),Ee=s=>{throw TypeError(s)},Di=(s,e,t)=>e in s?wt(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t,Jt=(s,e)=>wt(s,"name",{value:e,configurable:!0}),qi=s=>[,,,Ni((s==null?void 0:s[Bs("metadata")])??null)],Ns=["class","method","getter","setter","accessor","field","value","get","set"],ue=s=>s!==void 0&&typeof s!="function"?Ee("Function expected"):s,Hi=(s,e,t,r,i)=>({kind:Ns[s],name:e,metadata:r,addInitializer:n=>t._?Ee("Already initialized"):i.push(ue(n||null))}),Fi=(s,e)=>Di(e,Bs("metadata"),s[3]),st=(s,e,t,r)=>{for(var i=0,n=s[e>>1],o=n&&n.length;i<o;i++)e&1?n[i].call(t):r=n[i].call(t,r);return r},Us=(s,e,t,r,i,n)=>{var o,a,h,c,d,l=e&7,p=!!(e&8),u=!!(e&16),m=l>3?s.length+1:l?p?1:2:0,k=Ns[l+5],E=l>3&&(s[m-1]=[]),L=s[m]||(s[m]=[]),g=l&&(!u&&!p&&(i=i.prototype),l<5&&(l>3||!u)&&Ui(l<4?i:{get[t](){return Yt(this,n)},set[t](f){return es(this,n,f)}},t));l?u&&l<4&&Jt(n,(l>2?"set ":l>1?"get ":"")+t):Jt(i,t);for(var y=r.length-1;y>=0;y--)c=Hi(l,t,h={},s[3],L),l&&(c.static=p,c.private=u,d=c.access={has:u?f=>Zi(i,f):f=>t in f},l^3&&(d.get=u?f=>(l^1?Yt:Gi)(f,i,l^4?n:g.get):f=>f[t]),l>2&&(d.set=u?(f,S)=>es(f,i,S,l^4?n:g.set):(f,S)=>f[t]=S)),a=(0,r[y])(l?l<4?u?n:g[k]:l>4?void 0:{get:g.get,set:g.set}:i,c),h._=1,l^4||a===void 0?ue(a)&&(l>4?E.unshift(a):l?u?n=a:g[k]=a:i=a):typeof a!="object"||a===null?Ee("Object expected"):(ue(o=a.get)&&(g.get=o),ue(o=a.set)&&(g.set=o),ue(o=a.init)&&E.unshift(o));return l||Fi(s,i),g&&wt(i,t,g),u?l^4?n:g:i},xt=(s,e,t)=>e.has(s)||Ee("Cannot "+t),Zi=(s,e)=>Object(e)!==e?Ee('Cannot use the "in" operator on this value'):s.has(e),Yt=(s,e,t)=>(xt(s,e,"read from private field"),t?t.call(s):e.get(s)),es=(s,e,t,r)=>(xt(s,e,"write to private field"),r?r.call(s,t):e.set(s,t),t),Gi=(s,e,t)=>(xt(s,e,"access private method"),t),Ds,rt,qs,ne;v.setOptions({gfm:!0,breaks:!0});function Wi(s){const e=s.trim();return!!(!e||/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(e)||/^data:image\//i.test(e))}function Qi(s){if(!s||typeof document>"u")return s;const e=document.createElement("template");e.innerHTML=s;const t=new Set(["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","LINK","META","BASE","FORM","INPUT","BUTTON","TEXTAREA","SELECT","OPTION","NOSCRIPT","TEMPLATE"]),r=i=>{if(i.nodeType!==Node.ELEMENT_NODE)return;const n=i;if(t.has(n.tagName)){n.remove();return}for(const o of[...n.attributes]){const a=o.name.toLowerCase(),h=o.value.trim();if(a.startsWith("on")){n.removeAttribute(o.name);continue}if(a==="style"){n.removeAttribute(o.name);continue}(a==="href"||a==="src"||a==="xlink:href"||a==="srcset"||a==="action"||a==="formaction"||a==="poster")&&!Wi(h)&&n.removeAttribute(o.name)}for(const o of[...n.childNodes])r(o)};for(const i of[...e.content.childNodes])r(i);return e.innerHTML}qs=[Ae("ab-markdown")];class xe extends(rt=F,Ds=[R({type:String})],rt){constructor(){super(...arguments),this.content=st(ne,8,this,""),st(ne,11,this)}render(){const e=Qi(v.parse(this.content||""));return $`<div class="markdown" .innerHTML=${e}></div>`}}ne=qi(rt);Us(ne,5,"content",Ds,xe);xe=Us(ne,0,"AgentbookMarkdown",qs,xe);xe.styles=ye`
    :host {
      display: block;
    }

    .markdown {
      color: #dbeafe;
      line-height: 1.55;
      word-break: break-word;
    }

    .markdown :is(h1, h2, h3, h4, h5, h6) {
      margin: 1rem 0 0.5rem;
      color: #f8fafc;
    }

    .markdown p,
    .markdown ul,
    .markdown ol,
    .markdown pre {
      margin: 0.5rem 0;
    }

    .markdown pre {
      padding: 0.85rem;
      border-radius: 12px;
      overflow: auto;
      background: #020617;
      border: 1px solid rgba(148, 163, 184, 0.18);
    }

    .markdown code {
      padding: 0.1rem 0.3rem;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
    }
  `;st(ne,1,xe);var Vi=Object.create,yt=Object.defineProperty,Ki=Object.getOwnPropertyDescriptor,Hs=(s,e)=>(e=Symbol[s])?e:Symbol.for("Symbol."+s),Re=s=>{throw TypeError(s)},Xi=(s,e,t)=>e in s?yt(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t,ts=(s,e)=>yt(s,"name",{value:e,configurable:!0}),Ji=s=>[,,,Vi((s==null?void 0:s[Hs("metadata")])??null)],Fs=["class","method","getter","setter","accessor","field","value","get","set"],fe=s=>s!==void 0&&typeof s!="function"?Re("Function expected"):s,Yi=(s,e,t,r,i)=>({kind:Fs[s],name:e,metadata:r,addInitializer:n=>t._?Re("Already initialized"):i.push(fe(n||null))}),en=(s,e)=>Xi(e,Hs("metadata"),s[3]),B=(s,e,t,r)=>{for(var i=0,n=s[e>>1],o=n&&n.length;i<o;i++)e&1?n[i].call(t):r=n[i].call(t,r);return r},ae=(s,e,t,r,i,n)=>{var o,a,h,c,d,l=e&7,p=!!(e&8),u=!!(e&16),m=l>3?s.length+1:l?p?1:2:0,k=Fs[l+5],E=l>3&&(s[m-1]=[]),L=s[m]||(s[m]=[]),g=l&&(!u&&!p&&(i=i.prototype),l<5&&(l>3||!u)&&Ki(l<4?i:{get[t](){return ss(this,n)},set[t](f){return rs(this,n,f)}},t));l?u&&l<4&&ts(n,(l>2?"set ":l>1?"get ":"")+t):ts(i,t);for(var y=r.length-1;y>=0;y--)c=Yi(l,t,h={},s[3],L),l&&(c.static=p,c.private=u,d=c.access={has:u?f=>tn(i,f):f=>t in f},l^3&&(d.get=u?f=>(l^1?ss:sn)(f,i,l^4?n:g.get):f=>f[t]),l>2&&(d.set=u?(f,S)=>rs(f,i,S,l^4?n:g.set):(f,S)=>f[t]=S)),a=(0,r[y])(l?l<4?u?n:g[k]:l>4?void 0:{get:g.get,set:g.set}:i,c),h._=1,l^4||a===void 0?fe(a)&&(l>4?E.unshift(a):l?u?n=a:g[k]=a:i=a):typeof a!="object"||a===null?Re("Object expected"):(fe(o=a.get)&&(g.get=o),fe(o=a.set)&&(g.set=o),fe(o=a.init)&&E.unshift(o));return l||en(s,i),g&&yt(i,t,g),u?l^4?n:g:i},St=(s,e,t)=>e.has(s)||Re("Cannot "+t),tn=(s,e)=>Object(e)!==e?Re('Cannot use the "in" operator on this value'):s.has(e),ss=(s,e,t)=>(St(s,e,"read from private field"),t?t.call(s):e.get(s)),rs=(s,e,t,r)=>(St(s,e,"write to private field"),r?r.call(s,t):e.set(s,t),t),sn=(s,e,t)=>(St(s,e,"access private method"),t),Zs,Gs,Ws,Qs,Vs,it,Ks,P;Ks=[Ae("ab-project-browser")];class Z extends(it=F,Vs=[R({type:Array})],Qs=[R({type:Array})],Ws=[R({type:String})],Gs=[R({type:String})],Zs=[R({type:Boolean})],it){constructor(){super(...arguments),this.projects=B(P,8,this,[]),B(P,11,this),this.plans=B(P,12,this,[]),B(P,15,this),this.selectedProjectId=B(P,16,this,""),B(P,19,this),this.selectedPlanId=B(P,20,this,""),B(P,23,this),this.loading=B(P,24,this,!1),B(P,27,this)}selectProject(e){this.dispatchEvent(new CustomEvent("project-selected",{detail:{projectId:e},bubbles:!0,composed:!0}))}selectPlan(e){this.dispatchEvent(new CustomEvent("plan-selected",{detail:{planId:e},bubbles:!0,composed:!0}))}requestRefresh(){this.dispatchEvent(new CustomEvent("refresh-requested",{bubbles:!0,composed:!0}))}render(){const e=this.projects.find(t=>t.id===this.selectedProjectId)??null;return $`
      <section class="panel">
        <div class="header">
          <h2 class="title">Projects & plans</h2>
          <button class="refresh" type="button" @click=${this.requestRefresh}>Refresh</button>
        </div>

        <div class="project-list">
          ${this.projects.map(t=>$`
              <button
                class="project-card"
                type="button"
                ?selected=${t.id===this.selectedProjectId}
                @click=${()=>this.selectProject(t.id)}
              >
                <div class="project-name">${t.title}</div>
                <div class="meta">${t.description}</div>
                <div class="submeta">${t.plan_count} plans · ${t.task_count} tasks</div>
              </button>
            `)}
        </div>

        <div>
          <div class="section-title">Selected project</div>
          ${e?$`
                <div class="meta">${e.name}</div>
                <div class="submeta">${e.db_path}</div>
              `:$`<div class="empty">Choose a project to browse its plans.</div>`}
        </div>

        <div>
          <div class="section-title">Plans</div>
          ${this.plans.length?$`
                <div class="plan-list">
                  ${this.plans.map(t=>$`
                      <button
                        class="plan-card"
                        type="button"
                        ?selected=${t.id===this.selectedPlanId}
                        @click=${()=>this.selectPlan(t.id)}
                      >
                        <div class="plan-name">${t.title}</div>
                        <div class="meta">${t.description||t.name}</div>
                        <div class="submeta">${t.status}</div>
                      </button>
                    `)}
                </div>
              `:$`<div class="empty">No plans available for this project.</div>`}
        </div>
      </section>
    `}}P=Ji(it);ae(P,5,"projects",Vs,Z);ae(P,5,"plans",Qs,Z);ae(P,5,"selectedProjectId",Ws,Z);ae(P,5,"selectedPlanId",Gs,Z);ae(P,5,"loading",Zs,Z);Z=ae(P,0,"AgentbookProjectBrowser",Ks,Z);Z.styles=ye`
    :host {
      display: block;
      min-height: 0;
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 100%;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.22);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .title {
      margin: 0;
      font-size: 1rem;
    }

    .refresh {
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      border-radius: 999px;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
    }

    .project-list,
    .plan-list {
      display: grid;
      gap: 0.6rem;
    }

    .project-card,
    .plan-card {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.86);
      color: inherit;
      border-radius: 14px;
      padding: 0.75rem;
      cursor: pointer;
    }

    .project-card[selected],
    .plan-card[selected] {
      border-color: rgba(96, 165, 250, 0.7);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    .project-name,
    .plan-name {
      font-weight: 650;
      margin-bottom: 0.2rem;
    }

    .meta,
    .submeta {
      color: #94a3b8;
      font-size: 0.85rem;
      line-height: 1.35;
    }

    .section-title {
      margin: 0.4rem 0 0.15rem;
      font-size: 0.92rem;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .empty {
      color: #94a3b8;
      border: 1px dashed rgba(148, 163, 184, 0.28);
      border-radius: 14px;
      padding: 0.8rem;
    }
  `;B(P,1,Z);var rn=Object.create,At=Object.defineProperty,nn=Object.getOwnPropertyDescriptor,Xs=(s,e)=>(e=Symbol[s])?e:Symbol.for("Symbol."+s),Ie=s=>{throw TypeError(s)},an=(s,e,t)=>e in s?At(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t,is=(s,e)=>At(s,"name",{value:e,configurable:!0}),on=s=>[,,,rn((s==null?void 0:s[Xs("metadata")])??null)],Js=["class","method","getter","setter","accessor","field","value","get","set"],ge=s=>s!==void 0&&typeof s!="function"?Ie("Function expected"):s,ln=(s,e,t,r,i)=>({kind:Js[s],name:e,metadata:r,addInitializer:n=>t._?Ie("Already initialized"):i.push(ge(n||null))}),cn=(s,e)=>an(e,Xs("metadata"),s[3]),D=(s,e,t,r)=>{for(var i=0,n=s[e>>1],o=n&&n.length;i<o;i++)e&1?n[i].call(t):r=n[i].call(t,r);return r},Ce=(s,e,t,r,i,n)=>{var o,a,h,c,d,l=e&7,p=!!(e&8),u=!!(e&16),m=l>3?s.length+1:l?p?1:2:0,k=Js[l+5],E=l>3&&(s[m-1]=[]),L=s[m]||(s[m]=[]),g=l&&(!u&&!p&&(i=i.prototype),l<5&&(l>3||!u)&&nn(l<4?i:{get[t](){return ns(this,n)},set[t](f){return as(this,n,f)}},t));l?u&&l<4&&is(n,(l>2?"set ":l>1?"get ":"")+t):is(i,t);for(var y=r.length-1;y>=0;y--)c=ln(l,t,h={},s[3],L),l&&(c.static=p,c.private=u,d=c.access={has:u?f=>hn(i,f):f=>t in f},l^3&&(d.get=u?f=>(l^1?ns:dn)(f,i,l^4?n:g.get):f=>f[t]),l>2&&(d.set=u?(f,S)=>as(f,i,S,l^4?n:g.set):(f,S)=>f[t]=S)),a=(0,r[y])(l?l<4?u?n:g[k]:l>4?void 0:{get:g.get,set:g.set}:i,c),h._=1,l^4||a===void 0?ge(a)&&(l>4?E.unshift(a):l?u?n=a:g[k]=a:i=a):typeof a!="object"||a===null?Ie("Object expected"):(ge(o=a.get)&&(g.get=o),ge(o=a.set)&&(g.set=o),ge(o=a.init)&&E.unshift(o));return l||cn(s,i),g&&At(i,t,g),u?l^4?n:g:i},Pt=(s,e,t)=>e.has(s)||Ie("Cannot "+t),hn=(s,e)=>Object(e)!==e?Ie('Cannot use the "in" operator on this value'):s.has(e),ns=(s,e,t)=>(Pt(s,e,"read from private field"),t?t.call(s):e.get(s)),as=(s,e,t,r)=>(Pt(s,e,"write to private field"),r?r.call(s,t):e.set(s,t),t),dn=(s,e,t)=>(Pt(s,e,"access private method"),t),Ys,er,tr,sr,nt,rr,C;rr=[Ae("ab-task-list")];class Q extends(nt=F,sr=[R({type:Array})],tr=[R({type:String})],er=[R({type:String})],Ys=[R({type:Boolean})],nt){constructor(){super(...arguments),this.tasks=D(C,8,this,[]),D(C,11,this),this.selectedTaskId=D(C,12,this,""),D(C,15,this),this.selectedPlanTitle=D(C,16,this,""),D(C,19,this),this.loading=D(C,20,this,!1),D(C,23,this)}selectTask(e){this.dispatchEvent(new CustomEvent("task-selected",{detail:{taskId:e},bubbles:!0,composed:!0}))}render(){return $`
      <section class="panel">
        <div class="header">
          <div>
            <h2 class="title">Tasks</h2>
            <div class="subtitle">${this.selectedPlanTitle||"Select a plan to view tasks."}</div>
          </div>
          <div class="pill">${this.tasks.length} items</div>
        </div>

        ${this.tasks.length?$`
              <div class="task-list">
                ${this.tasks.map(e=>$`
                    <button
                      class="task-card"
                      type="button"
                      ?selected=${e.id===this.selectedTaskId}
                      @click=${()=>this.selectTask(e.id)}
                    >
                      <div class="task-title">${e.title}</div>
                      <div class="task-meta">
                        <span class="pill">${e.status}</span>
                        <span>priority ${e.priority}</span>
                        <span>position ${e.position}</span>
                        ${e.assignee?$`<span>assignee ${e.assignee}</span>`:null}
                      </div>
                    </button>
                  `)}
              </div>
            `:$`<div class="empty">${this.loading?"Loading tasks…":"No tasks to show yet."}</div>`}
      </section>
    `}}C=on(nt);Ce(C,5,"tasks",sr,Q);Ce(C,5,"selectedTaskId",tr,Q);Ce(C,5,"selectedPlanTitle",er,Q);Ce(C,5,"loading",Ys,Q);Q=Ce(C,0,"AgentbookTaskList",rr,Q);Q.styles=ye`
    :host {
      display: block;
      min-height: 0;
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 100%;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.22);
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      align-items: start;
    }

    .title {
      margin: 0;
      font-size: 1rem;
    }

    .subtitle,
    .empty {
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .task-list {
      display: grid;
      gap: 0.6rem;
    }

    .task-card {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.86);
      color: inherit;
      border-radius: 14px;
      padding: 0.75rem;
      cursor: pointer;
    }

    .task-card[selected] {
      border-color: rgba(96, 165, 250, 0.7);
      box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
    }

    .task-title {
      font-weight: 650;
      margin-bottom: 0.25rem;
    }

    .task-meta {
      color: #94a3b8;
      font-size: 0.85rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      padding: 0.18rem 0.55rem;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.76rem;
    }
  `;D(C,1,Q);var pn=Object.create,Tt=Object.defineProperty,un=Object.getOwnPropertyDescriptor,ir=(s,e)=>(e=Symbol[s])?e:Symbol.for("Symbol."+s),ze=s=>{throw TypeError(s)},fn=(s,e,t)=>e in s?Tt(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t,os=(s,e)=>Tt(s,"name",{value:e,configurable:!0}),gn=s=>[,,,pn((s==null?void 0:s[ir("metadata")])??null)],nr=["class","method","getter","setter","accessor","field","value","get","set"],me=s=>s!==void 0&&typeof s!="function"?ze("Function expected"):s,mn=(s,e,t,r,i)=>({kind:nr[s],name:e,metadata:r,addInitializer:n=>t._?ze("Already initialized"):i.push(me(n||null))}),bn=(s,e)=>fn(e,ir("metadata"),s[3]),x=(s,e,t,r)=>{for(var i=0,n=s[e>>1],o=n&&n.length;i<o;i++)e&1?n[i].call(t):r=n[i].call(t,r);return r},O=(s,e,t,r,i,n)=>{var o,a,h,c,d,l=e&7,p=!!(e&8),u=!!(e&16),m=l>3?s.length+1:l?p?1:2:0,k=nr[l+5],E=l>3&&(s[m-1]=[]),L=s[m]||(s[m]=[]),g=l&&(!u&&!p&&(i=i.prototype),l<5&&(l>3||!u)&&un(l<4?i:{get[t](){return ls(this,n)},set[t](f){return cs(this,n,f)}},t));l?u&&l<4&&os(n,(l>2?"set ":l>1?"get ":"")+t):os(i,t);for(var y=r.length-1;y>=0;y--)c=mn(l,t,h={},s[3],L),l&&(c.static=p,c.private=u,d=c.access={has:u?f=>kn(i,f):f=>t in f},l^3&&(d.get=u?f=>(l^1?ls:$n)(f,i,l^4?n:g.get):f=>f[t]),l>2&&(d.set=u?(f,S)=>cs(f,i,S,l^4?n:g.set):(f,S)=>f[t]=S)),a=(0,r[y])(l?l<4?u?n:g[k]:l>4?void 0:{get:g.get,set:g.set}:i,c),h._=1,l^4||a===void 0?me(a)&&(l>4?E.unshift(a):l?u?n=a:g[k]=a:i=a):typeof a!="object"||a===null?ze("Object expected"):(me(o=a.get)&&(g.get=o),me(o=a.set)&&(g.set=o),me(o=a.init)&&E.unshift(o));return l||bn(s,i),g&&Tt(i,t,g),u?l^4?n:g:i},Et=(s,e,t)=>e.has(s)||ze("Cannot "+t),kn=(s,e)=>Object(e)!==e?ze('Cannot use the "in" operator on this value'):s.has(e),ls=(s,e,t)=>(Et(s,e,"read from private field"),t?t.call(s):e.get(s)),cs=(s,e,t,r)=>(Et(s,e,"write to private field"),r?r.call(s,t):e.set(s,t),t),$n=(s,e,t)=>(Et(s,e,"access private method"),t),ar,or,lr,cr,hr,dr,pr,ur,fr,gr,mr,br,kr,at,$r,b;$r=[Ae("ab-app")];class I extends(at=F,kr=[j()],br=[j()],mr=[j()],gr=[j()],fr=[j()],ur=[j()],pr=[j()],dr=[j()],hr=[j()],cr=[j()],lr=[j()],or=[j()],ar=[j()],at){constructor(){super(...arguments),this.projects=x(b,8,this,[]),x(b,11,this),this.plans=x(b,12,this,[]),x(b,15,this),this.tasks=x(b,16,this,[]),x(b,19,this),this.selectedProject=x(b,20,this,null),x(b,23,this),this.selectedPlan=x(b,24,this,null),x(b,27,this),this.selectedTask=x(b,28,this,null),x(b,31,this),this.summary=x(b,32,this,null),x(b,35,this),this.selectedProjectId=x(b,36,this,""),x(b,39,this),this.selectedPlanId=x(b,40,this,""),x(b,43,this),this.selectedTaskId=x(b,44,this,""),x(b,47,this),this.loading=x(b,48,this,!0),x(b,51,this),this.error=x(b,52,this,null),x(b,55,this),this.connectionState=x(b,56,this,"closed"),x(b,59,this),this.api=new Fr,this.socket=new Zr,this.activeRequest=0,this.bootstrapped=!1,this.handlePopState=()=>{this.loadFromLocation({replaceHistory:!0,refreshProjects:!0})},this.handleProjectSelected=e=>{this.loadSelection({projectId:e.detail.projectId},!0)},this.handlePlanSelected=e=>{this.loadSelection({projectId:this.selectedProjectId,planId:e.detail.planId},!0)},this.handleTaskSelected=e=>{this.loadSelection({projectId:this.selectedProjectId,taskId:e.detail.taskId},!0)},this.handleRefreshRequested=()=>{this.refreshCurrentSelection()}}connectedCallback(){super.connectedCallback(),window.addEventListener("popstate",this.handlePopState),this.bootstrapped||(this.bootstrapped=!0,this.bootstrap())}disconnectedCallback(){window.removeEventListener("popstate",this.handlePopState),this.socket.disconnect(),super.disconnectedCallback()}async bootstrap(){this.socket.onStatus=e=>{this.connectionState=e},this.socket.onMessage=e=>{e.type==="invalidate"&&this.refreshCurrentSelection()},this.socket.connect(),await this.loadFromLocation({replaceHistory:!0,refreshProjects:!0})}async refreshCurrentSelection(){await this.loadFromLocation({replaceHistory:!0,refreshProjects:!0})}async loadFromLocation(e){const t=++this.activeRequest;this.loading=!0,this.error=null;try{const r=e.refreshProjects||this.projects.length===0?await this.api.listProjects():null;if(t!==this.activeRequest)return;r&&(this.projects=r.projects);const i=e.selection??Gr(),n=this.projects.length?this.projects:(r==null?void 0:r.projects)??[],o=this.resolveProjectId(i.projectId,n,r==null?void 0:r.currentProjectId);if(!o){this.clearSelection(),this.loading=!1;return}const a=await this.api.listPlans(o);if(t!==this.activeRequest)return;const h=a.plans;let c=null,d=this.resolvePlanId(i.planId,h);if(i.taskId)try{const l=await this.api.getTask(i.taskId);if(t!==this.activeRequest)return;c=l.task,d=c.plan_id}catch{c=null}if(!d&&h.length>0&&(d=h[0].id),this.selectedProjectId=o,this.selectedProject=a.project,this.plans=h,this.selectedTask=c,this.selectedTaskId=(c==null?void 0:c.id)??"",this.selectedPlanId=d,d){const[l,p,u]=await Promise.all([this.api.getPlan(d),this.api.getPlanSummary(d),this.api.listTasks(o,d)]);if(t!==this.activeRequest)return;if(this.selectedPlan=l.plan,this.summary=p,this.tasks=u.tasks,this.selectedTaskId){const m=this.tasks.find(k=>k.id===this.selectedTaskId)??null;this.selectedTask=m??this.selectedTask,this.selectedTaskId=(m==null?void 0:m.id)??this.selectedTaskId}else this.selectedTask=null}else this.selectedPlan=null,this.summary=null,this.tasks=[],this.selectedTask=null,this.selectedTaskId="";Dt({projectId:this.selectedProjectId,planId:this.selectedPlanId||void 0,taskId:this.selectedTaskId||void 0},e.replaceHistory)}catch(r){if(t!==this.activeRequest)return;this.error=r instanceof Error?r.message:"Failed to load agentbook data"}finally{t===this.activeRequest&&(this.loading=!1)}}resolveProjectId(e,t,r){var i;return e&&t.some(n=>n.id===e)?e:r&&t.some(n=>n.id===r)?r:((i=t[0])==null?void 0:i.id)??""}resolvePlanId(e,t){return e&&t.some(r=>r.id===e)?e:""}clearSelection(){this.selectedProjectId="",this.selectedProject=null,this.plans=[],this.selectedPlanId="",this.selectedPlan=null,this.selectedTaskId="",this.selectedTask=null,this.summary=null,this.tasks=[],Dt({},!0)}async loadSelection(e,t){await this.loadFromLocation({replaceHistory:!t,refreshProjects:!1,selection:e})}render(){var t;const e=((t=this.selectedPlan)==null?void 0:t.title)??"";return $`
      <div class="shell">
        <header class="topbar">
          <div>
            <h1>agentbook browser</h1>
            <div class="subtle">Browse projects, plans, tasks, and live updates from the SQLite store.</div>
          </div>
          <div class="status">${this.connectionState}</div>
        </header>

        ${this.error?$`<div class="message">${this.error}</div>`:null}

        <main class="grid">
          <ab-project-browser
            .projects=${this.projects}
            .plans=${this.plans}
            .selectedProjectId=${this.selectedProjectId}
            .selectedPlanId=${this.selectedPlanId}
            .loading=${this.loading}
            @project-selected=${this.handleProjectSelected}
            @plan-selected=${this.handlePlanSelected}
            @refresh-requested=${this.handleRefreshRequested}
          ></ab-project-browser>

          <ab-task-list
            .tasks=${this.tasks}
            .selectedTaskId=${this.selectedTaskId}
            .selectedPlanTitle=${e}
            .loading=${this.loading}
            @task-selected=${this.handleTaskSelected}
          ></ab-task-list>

          <ab-detail-panel
            .project=${this.selectedProject}
            .plan=${this.selectedPlan}
            .task=${this.selectedTask}
            .summary=${this.summary}
            .loading=${this.loading}
            .connectionState=${this.connectionState}
          ></ab-detail-panel>
        </main>
      </div>
    `}}b=gn(at);O(b,5,"projects",kr,I);O(b,5,"plans",br,I);O(b,5,"tasks",mr,I);O(b,5,"selectedProject",gr,I);O(b,5,"selectedPlan",fr,I);O(b,5,"selectedTask",ur,I);O(b,5,"summary",pr,I);O(b,5,"selectedProjectId",dr,I);O(b,5,"selectedPlanId",hr,I);O(b,5,"selectedTaskId",cr,I);O(b,5,"loading",lr,I);O(b,5,"error",or,I);O(b,5,"connectionState",ar,I);I=O(b,0,"AgentbookApp",$r,I);I.styles=ye`
    :host {
      display: block;
      min-height: 100vh;
      color: #e2e8f0;
    }

    .shell {
      min-height: 100vh;
      padding: 1rem;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 1rem;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(15, 23, 42, 0.72);
      box-shadow: 0 18px 50px rgba(2, 6, 23, 0.2);
    }

    h1 {
      margin: 0;
      font-size: 1.1rem;
    }

    .subtle {
      color: #94a3b8;
      font-size: 0.88rem;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      font-size: 0.82rem;
      text-transform: capitalize;
    }

    .grid {
      min-height: 0;
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(280px, 0.95fr) minmax(280px, 1fr) minmax(320px, 1.2fr);
      align-items: stretch;
    }

    .message {
      margin-top: 0.75rem;
      padding: 0.75rem 0.95rem;
      border-radius: 14px;
      border: 1px solid rgba(248, 113, 113, 0.32);
      background: rgba(127, 29, 29, 0.22);
      color: #fecaca;
    }

    @media (max-width: 1180px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `;x(b,1,I);const vn=document.createElement("ab-app");document.body.append(vn);

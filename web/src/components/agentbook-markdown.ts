import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import { marked } from "marked"

marked.setOptions({ gfm: true, breaks: true })

function isSafeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) return true
  if (/^data:image\//i.test(trimmed)) return true
  return false
}

function sanitizeRenderedHtml(htmlText: string) {
  if (!htmlText || typeof document === "undefined") return htmlText

  const template = document.createElement("template")
  template.innerHTML = htmlText
  const unsafeTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "BASE", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "OPTION", "NOSCRIPT", "TEMPLATE"])

  const walk = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as Element
    if (unsafeTags.has(element.tagName)) {
      element.remove()
      return
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name)
        continue
      }
      if (name === "style") {
        element.removeAttribute(attribute.name)
        continue
      }
      if ((name === "href" || name === "src" || name === "xlink:href" || name === "srcset" || name === "action" || name === "formaction" || name === "poster") && !isSafeUrl(value)) {
        element.removeAttribute(attribute.name)
      }
    }

    for (const child of [...element.childNodes]) walk(child)
  }

  for (const child of [...template.content.childNodes]) walk(child)
  return template.innerHTML
}

@customElement("ab-markdown")
export class AgentbookMarkdown extends LitElement {
  static properties = {
    content: { type: String },
  }

  static styles = css`
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
  `

  content = ""

  render() {
    const rendered = sanitizeRenderedHtml(marked.parse(this.content || "") as string)
    return html`<div class="markdown" .innerHTML=${rendered}></div>`
  }
}

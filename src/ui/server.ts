import { Database } from "bun:sqlite"
import fs from "fs"
import os from "os"
import path from "path"
import { execSync } from "child_process"

type OpenCodeProjectRow = {
  id: string
  worktree: string
  name: string | null
  icon_color: string | null
  time_created: number
}

type AgentbookPlanRow = {
  id: string
  name: string
  title: string
  description: string | null
  spec: string | null
  document: string | null
  status: string
  created_at: number
  updated_at: number
}

type AgentbookTaskRow = {
  id: string
  plan_id: string
  title: string
  description: string | null
  status: string
  priority: number
  assignee: string | null
  session_id: string | null
  notes: string | null
  created_at: number
  updated_at: number
}

type CountRow = { count: number }

const DEFAULT_PORT = 3141
const OPENCODE_DB_PATH = path.join(os.homedir(), ".local", "share", "opencode", "opencode.db")
const STREAM_POLL_MS = 3_000
const STREAM_KEEPALIVE_MS = 15_000
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

const LEGACY_TASK_STATUS_ALIASES: Record<string, string> = {
  needs_review: "needs_guidance",
}

function canonicalTaskStatus(status: string): string {
  return LEGACY_TASK_STATUS_ALIASES[status] || status
}

const TASK_ICONS: Record<string, string> = {
  pending: "⏳",
  in_progress: "🔄",
  completed: "✅",
  blocked: "🚫",
  needs_guidance: "🟣",
  cancelled: "❌",
}

const TASK_STATUS_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "blocked", label: "Blocked" },
  { key: "needs_guidance", label: "Needs Guidance" },
  { key: "cancelled", label: "Cancelled" },
] as const

const PLAN_STATUS_COLUMNS = [
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const

const APP_CSS = String.raw`
    :root {
      color-scheme: dark;
      --bg: #1a1a2e;
      --panel: #16213e;
      --panel-2: #13203a;
      --panel-3: #0f3460;
      --text: #e0e0e0;
      --muted: #9ca3af;
      --border: rgba(255, 255, 255, 0.08);
      --shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      --highlight: #e94560;
      --active: #3b82f6;
      --draft: #6b7280;
      --completed: #22c55e;
      --paused: #eab308;
      --cancelled: #ef4444;
      --pending: #9ca3af;
      --in-progress: #3b82f6;
      --blocked: #f97316;
      --radius: 8px;
      --max-width: 1180px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: linear-gradient(180deg, #19192b 0%, #121726 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    .page {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: clamp(16px, 2vw, 28px);
    }

    .hero,
    .panel,
    .project-card,
    .plan-card,
    .timeline-item,
    .empty,
    .error {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, rgba(15, 52, 96, 0.95), rgba(22, 33, 62, 0.95));
    }

    .hero-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.7rem;
    }

    .hero-icon {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(233, 69, 96, 0.15);
      color: var(--highlight);
      font-size: 1.1rem;
    }

    .hero-subtitle,
    .muted,
    .project-path,
    .meta,
    .timeline-meta {
      color: var(--muted);
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .subtle-button,
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
    }

    .subtle-button:hover,
    .back-link:hover,
    .project-card:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }

    .project-card {
      padding: 18px;
      transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
    }

    .project-card:hover {
      transform: translateY(-2px);
      border-color: rgba(233, 69, 96, 0.35);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .row-between {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .project-name,
    .section-title,
    .plan-title,
    .detail-title {
      margin: 0;
      font-weight: 700;
    }

    .project-name {
      font-size: 1.05rem;
    }

    .project-path {
      margin-top: 8px;
      font-size: 0.92rem;
      word-break: break-all;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      flex: none;
      background: var(--highlight);
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
    }

    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      white-space: nowrap;
    }

    .badge.status-active,
    .badge.status-in_progress { background: rgba(59, 130, 246, 0.18); color: #bfdbfe; }
    .badge.status-draft,
    .badge.status-pending { background: rgba(107, 114, 128, 0.2); color: #d1d5db; }
    .badge.status-completed { background: rgba(34, 197, 94, 0.18); color: #bbf7d0; }
    .badge.status-paused { background: rgba(234, 179, 8, 0.18); color: #fde68a; }
    .badge.status-cancelled { background: rgba(239, 68, 68, 0.18); color: #fecaca; }
    .badge.status-blocked { background: rgba(249, 115, 22, 0.18); color: #fed7aa; }
    .badge.status-needs_guidance { background: rgba(233, 69, 96, 0.18); color: #fda4af; }
    .badge.status-needs_review { background: rgba(233, 69, 96, 0.18); color: #fda4af; }
    .badge.action {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border-color: rgba(255, 255, 255, 0.12);
    }
    .label-empty {
      margin-top: 14px;
      font-size: 0.88rem;
      color: var(--muted);
    }

    .detail-header {
      display: grid;
      gap: 18px;
      margin-bottom: 24px;
    }

    .panel {
      padding: 18px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 1.1rem;
    }

    .stack {
      display: grid;
      gap: 14px;
    }

    .board-layout {
      display: grid;
      gap: 18px;
    }

    .board-workspace {
      display: grid;
      gap: 20px;
      align-items: start;
      grid-template-columns: minmax(0, 1fr);
    }

    .board-main,
    .board-sidebar {
      min-width: 0;
    }

    .board-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .board-grid {
      display: grid;
      gap: 18px;
    }

    .project-lane {
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: linear-gradient(180deg, rgba(22, 33, 62, 0.92), rgba(15, 52, 96, 0.14));
      box-shadow: var(--shadow);
      display: grid;
      gap: 16px;
    }

    .project-lane-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .project-lane-name {
      margin: 0;
      font-size: 1.05rem;
    }

    .project-lane-path {
      margin-top: 6px;
      color: var(--muted);
      font-size: 0.9rem;
      word-break: break-all;
    }

    .lane-stats,
    .card-meta,
    .detail-panel-empty {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .lane-body {
      display: grid;
      gap: 16px;
    }

    .lane-section {
      display: grid;
      gap: 12px;
    }

    .status-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .status-column {
      padding: 12px;
      border-radius: calc(var(--radius) - 1px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      min-width: 0;
      container-type: inline-size;
    }

    .status-column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .status-column-title {
      margin: 0;
      font-size: 0.86rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .status-column-count {
      color: var(--muted);
      font-size: 0.8rem;
    }

    .card-stack {
      display: grid;
      gap: 10px;
    }

    .board-card {
      padding: 12px;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      min-width: 0;
    }

    .board-card-title-line {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px 12px;
      align-items: start;
    }

    .board-card-title-line > div {
      min-width: 0;
    }

    .board-card-title-line > .badge {
      justify-self: end;
    }

    @container (max-width: 390px) {
      .board-card-title-line {
        grid-template-columns: 1fr;
      }

      .board-card-title-line > .badge {
        justify-self: start;
      }
    }

    .board-card-title {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .board-card-snippet {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .board-card-subtitle {
      color: var(--muted);
      font-size: 0.8rem;
    }

    .board-card-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }

    .board-card-link {
      cursor: pointer;
    }

    .board-sidebar {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 40;
      padding: clamp(12px, 2vw, 24px);
      align-items: stretch;
      justify-content: stretch;
    }

    body.board-detail-open {
      overflow: hidden;
    }

    .board-sidebar.is-open {
      display: flex;
    }

    .board-modal-backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      padding: 0;
      appearance: none;
      -webkit-appearance: none;
      background: rgba(4, 10, 20, 0.74);
      backdrop-filter: blur(10px);
      cursor: pointer;
    }

    .detail-panel-shell {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(9, 14, 26, 0.98), rgba(13, 20, 38, 0.98));
      padding: clamp(16px, 2vw, 24px);
      min-height: 0;
      overflow: auto;
      scroll-margin-top: 18px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    }

    .detail-panel-empty {
      min-height: 204px;
      align-content: center;
      justify-content: center;
      text-align: center;
      color: var(--muted);
    }

    .relative-time {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    @media (min-width: 1180px) {
      .board-sidebar.is-open {
        display: flex;
      }
    }

    @media (max-width: 1179px) {
      .board-sidebar {
        display: none !important;
      }

      .board-card-title-line {
        grid-template-columns: 1fr;
      }

      .board-card-actions {
        justify-content: flex-start;
      }
    }

    .detail-stack {
      display: grid;
      gap: 14px;
    }

    .detail-section {
      display: grid;
      gap: 12px;
    }

    .detail-kicker {
      margin: 0 0 6px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .detail-grid {
      display: grid;
      gap: 10px;
    }

    .detail-field {
      display: grid;
      gap: 6px;
    }

    .detail-field-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--muted);
    }

    .detail-field-value {
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    turbo-frame {
      display: block;
    }

    .plan-list {
      display: grid;
      gap: 14px;
    }

    .plan-card {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: linear-gradient(180deg, rgba(22, 33, 62, 0.94), rgba(19, 32, 58, 0.98));
    }

    .plan-summary {
      list-style: none;
      cursor: pointer;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: rgba(255, 255, 255, 0.02);
    }

    .plan-summary::-webkit-details-marker { display: none; }

    .plan-summary-main {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: 12px;
      min-width: 0;
    }

    .plan-chevron {
      width: 16px;
      flex: none;
      color: var(--muted);
    }

    .plan-card[open] .plan-chevron {
      color: var(--text);
    }

    .plan-chevron .when-open {
      display: none;
    }

    .plan-card[open] .plan-chevron .when-open {
      display: inline;
    }

    .plan-card[open] .plan-chevron .when-closed {
      display: none;
    }

    .plan-summary-copy {
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .copy-plan-button {
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: var(--muted);
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 0.8rem;
      line-height: 1;
      cursor: pointer;
      flex: none;
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
    }

    .copy-plan-button:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .copy-plan-button.copied {
      color: #7ee787;
      border-color: rgba(126, 231, 135, 0.35);
      background: rgba(126, 231, 135, 0.12);
    }

    .plan-title {
      font-size: 1rem;
      overflow-wrap: anywhere;
    }

    .plan-summary-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }

    .plan-summary-stat {
      font-size: 0.84rem;
      color: var(--muted);
      white-space: nowrap;
    }

    .progress-inline {
      width: 140px;
      min-width: 140px;
    }

    .plan-body {
      border-top: 1px solid var(--border);
      padding: 16px 18px 18px;
      display: grid;
      gap: 16px;
      background: rgba(0, 0, 0, 0.08);
    }

    .plan-description {
      margin: 0;
    }

    .progress {
      width: 100%;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
    }

    .progress > span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--highlight), #ff7a8b);
    }

    .description,
    .timeline-detail {
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .document-details {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.03);
      overflow: hidden;
    }

    .document-summary {
      list-style: none;
      cursor: pointer;
      padding: 10px 12px;
      font-weight: 600;
      color: var(--muted);
    }

    .document-summary::-webkit-details-marker { display: none; }

    .document-body {
      margin: 0;
      padding: 0 12px 12px;
      white-space: pre-wrap;
      word-break: break-word;
      font: 0.9rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--text);
    }

    .task-title-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .task-icon {
      flex: none;
      width: 1.2rem;
      text-align: center;
    }

    .task-title {
      font-weight: 600;
    }

    .plan-task-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      align-items: start;
    }

    .task-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 132px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
    }

    .task-column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .task-column-title {
      margin: 0;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--muted);
    }

    .task-column-count {
      font-size: 0.76rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--muted);
    }

    .task-column-body {
      display: grid;
      gap: 8px;
    }

    .task-card {
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(10, 14, 25, 0.28);
    }

    .task-card-meta {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .task-column-empty {
      font-size: 0.82rem;
      color: var(--muted);
      padding: 4px 0;
    }

    .timeline {
      display: grid;
      gap: 12px;
    }

    .timeline-item {
      padding: 14px 16px;
    }

    .timeline-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .error,
    .empty {
      padding: 24px;
      text-align: center;
    }

    .error-title,
    .empty-title {
      margin: 0 0 8px;
      font-size: 1.1rem;
    }

    .error-message,
    .empty-copy {
      margin: 0;
      color: var(--muted);
    }

    .pill-count {
      font-weight: 700;
    }

    @media (max-width: 860px) {
      .hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .section-header,
      .row-between {
        flex-direction: column;
        align-items: flex-start;
      }

      .plan-summary {
        flex-direction: column;
        align-items: flex-start;
      }

      .plan-summary-meta {
        justify-content: flex-start;
      }

      .progress-inline {
        width: min(100%, 220px);
        min-width: 0;
      }
    }

    @media (max-width: 640px) {
      .page {
        padding: 16px;
      }

      .hero-title {
        font-size: 1.4rem;
      }

      .project-grid {
        grid-template-columns: 1fr;
      }

      .status-columns {
        grid-template-columns: 1fr;
      }

      .board-summary,
      .project-lane-header,
      .status-column-header {
        align-items: flex-start;
      }
    }

    /* Fresh board polish */
    :root {
      color-scheme: light;
      --bg: #f3f6fb;
      --panel: rgba(255, 255, 255, 0.92);
      --panel-2: #f8fafc;
      --panel-3: #eef2ff;
      --text: #0f172a;
      --muted: #64748b;
      --border: rgba(15, 23, 42, 0.08);
      --shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
      --highlight: #4f46e5;
      --active: #4f46e5;
      --draft: #94a3b8;
      --completed: #16a34a;
      --paused: #d97706;
      --cancelled: #dc2626;
      --pending: #94a3b8;
      --in-progress: #2563eb;
      --blocked: #ea580c;
      --radius: 16px;
      --max-width: 1680px;
    }

    body {
      background:
        radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 28%),
        linear-gradient(180deg, #f8fbff 0%, #eef3fb 100%);
      color: var(--text);
    }

    .page {
      padding: 28px 24px 36px;
    }

    .hero {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 255, 0.96));
      border-radius: 24px;
      border-color: rgba(79, 70, 229, 0.12);
    }

    .hero-title {
      font-size: clamp(1.45rem, 2vw, 2rem);
      letter-spacing: -0.03em;
    }

    .hero-subtitle {
      max-width: 72ch;
      line-height: 1.5;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .hero-chip,
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 13px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.72);
      color: var(--text);
      box-shadow: none;
    }

    .hero-chip {
      background: rgba(79, 70, 229, 0.1);
      border-color: rgba(79, 70, 229, 0.16);
      color: var(--highlight);
      font-weight: 600;
    }

    .back-link:hover,
    .subtle-button:hover,
    .project-card:hover {
      transform: translateY(-1px);
    }

    .board-layout {
      gap: 22px;
    }

    .board-summary {
      padding: 18px 20px;
      border-radius: 22px;
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }

    .board-summary-title {
      margin: 0 0 6px;
      font-size: 1.25rem;
      letter-spacing: -0.02em;
    }

    .board-grid {
      gap: 20px;
    }

    .project-lane {
      padding: 20px;
      border-radius: 24px;
      border-top: 4px solid var(--swatch, var(--highlight));
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 255, 0.94));
    }

    .project-card {
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.9));
    }

    .project-card,
    .project-lane,
    .panel,
    .empty,
    .error,
    .timeline-item,
    .status-column,
    .plan-card,
    .task-card,
    .detail-panel-shell {
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }

    .project-card .color-dot,
    .project-lane .color-dot,
    .detail-header .color-dot {
      background: var(--swatch, var(--highlight));
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08);
    }

    .lane-stats,
    .card-meta,
    .detail-panel-empty,
    .badge-row {
      gap: 10px;
    }

    .card-meta {
      margin-top: 12px;
    }

    .board-card {
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.9));
      border: 1px solid var(--border);
    }

    .board-card-title {
      font-size: 1rem;
      letter-spacing: -0.01em;
    }

    .board-card-subtitle,
    .board-card-snippet,
    .project-lane-path,
    .project-path {
      color: var(--muted);
    }

    .board-card-snippet,
    .description,
    .document-body {
      line-height: 1.55;
    }

    .board-card-actions {
      margin-top: 12px;
    }

    .board-card-link {
      border-color: rgba(79, 70, 229, 0.2);
      color: var(--highlight);
    }

    .badge.action {
      background: rgba(79, 70, 229, 0.1);
      border-color: rgba(79, 70, 229, 0.16);
      color: var(--highlight);
    }

    .status-columns {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .status-column {
      border-radius: 18px;
      background: rgba(248, 250, 252, 0.92);
    }

    .status-column-title,
    .task-column-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .task-column-empty {
      color: var(--muted);
    }

    .detail-panel-shell {
      display: grid;
      gap: 16px;
      width: 100%;
      height: 100%;
      min-height: 0;
      padding: clamp(16px, 2vw, 24px);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(9, 14, 26, 0.98), rgba(13, 20, 38, 0.98));
      overflow: auto;
    }

    .detail-stack {
      gap: 16px;
    }

    .detail-kicker {
      margin: 0 0 6px;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .detail-title {
      font-size: clamp(1.3rem, 2vw, 1.9rem);
      letter-spacing: -0.03em;
    }

    .detail-section {
      display: grid;
      gap: 12px;
    }

    .detail-field,
    .description,
    .plan-description,
    .document-body,
    .document-summary,
    .task-card,
    .task-column,
    .task-column-body,
    .panel {
      background: rgba(248, 250, 252, 0.92);
    }

    .detail-field,
    .description,
    .plan-description,
    .document-body {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px 16px;
    }

    .detail-field-label {
      margin-bottom: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .detail-grid {
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .task-card {
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.94));
    }

    .task-title-line {
      align-items: flex-start;
    }

    .task-status-meta {
      margin-top: 6px;
    }

    .task-card-meta {
      color: var(--muted);
    }

    .plan-card {
      border-radius: 20px;
    }

    .plan-body {
      gap: 14px;
    }

    .plan-description {
      color: var(--text);
    }

    .plan-summary-meta {
      gap: 12px;
    }

    .progress {
      background: rgba(148, 163, 184, 0.16);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-inline {
      height: 8px;
    }

    .progress-inline span {
      background: linear-gradient(90deg, var(--highlight), #22c55e);
      border-radius: 999px;
    }

    .empty,
    .error {
      padding: 24px;
      background: var(--panel);
    }

    .empty-title,
    .error-title {
      margin: 0 0 8px;
    }

    .empty-copy,
    .error-message,
    .detail-help {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .detail-panel-empty {
      display: grid;
      padding: 18px;
      border-radius: 20px;
      border: 1px dashed var(--border);
      background: rgba(248, 250, 252, 0.92);
    }

    .document-details {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.72);
    }

    .document-summary {
      cursor: pointer;
      padding: 12px 14px;
    }

    .document-body {
      margin: 0;
      border-radius: 0 0 16px 16px;
      border-top: 1px solid var(--border);
      white-space: pre-wrap;
      overflow: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    @media (max-width: 860px) {
      .page {
        padding: 18px 16px 24px;
      }

      .hero {
        align-items: flex-start;
        flex-direction: column;
      }

      .hero-actions {
        width: 100%;
      }

      .row-between,
      .section-header,
      .project-lane-header,
      .status-column-header {
        align-items: flex-start;
      }

      .board-card-title-line {
        gap: 8px;
      }
    }

    @media (max-width: 640px) {
      .board-summary,
      .project-lane,
      .detail-panel-shell {
        padding: 16px;
      }

      .project-grid,
      .status-columns {
        grid-template-columns: 1fr;
      }

      .board-summary-title,
      .hero-title {
        font-size: 1.3rem;
      }
    }
`

type ProjectSummary = {
  id: string
  worktree: string
  name: string
  icon_color: string | null
  has_agentbook: boolean
  active_plans: number
  active_tasks: number
  pending_tasks: number
  completed_tasks: number
}

type TaskDetails = {
  id: string
  title: string
  description: string
  status: string
  priority: number
  assignee: string
  session_id: string
  worktree_dir: string
  depends_on: string
  notes: string
  created_at: number
  updated_at: number
}

type PlanDetails = {
  id: string
  name: string
  title: string
  status: string
  description: string
  spec: string
  document: string
  created_at: number
  updated_at: number
  tasks: TaskDetails[]
}

type ProjectDetails = {
  project: {
    id: string
    worktree: string
    name: string
    icon_color: string | null
    has_agentbook: boolean
  }
  plans: PlanDetails[]
}

type BoardProject = {
  summary: ProjectSummary
  plans: PlanDetails[]
  tasks: Array<{ plan: PlanDetails; task: TaskDetails }>
}

type BoardModel = {
  projects: BoardProject[]
  planCount: number
  taskCount: number
}

type BoardSelection = {
  projectId: string
  planId?: string
  taskId?: string
}

type ProjectDetailSelection = {
  planId?: string
  taskId?: string
}

type DetailNavigationMode = "board" | "page"

type ProjectDbInfo = {
  project: OpenCodeProjectRow
  agentbookDbPath: string | null
}

type DataVersionRow = {
  data_version: number
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function projectName(name: string | null | undefined, worktree: string): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : path.basename(worktree)
}

function openReadonlyDatabase(databasePath: string): Database {
  return new Database(databasePath, { readonly: true })
}

function withReadonlyDatabase<T>(databasePath: string, fn: (db: Database) => T): T {
  const db = openReadonlyDatabase(databasePath)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

function readDataVersion(db: Database): number {
  const row = db.query("PRAGMA data_version").get() as DataVersionRow | null
  return Number(row?.data_version ?? 0)
}

function getDataVersion(databasePath: string): number {
  return withReadonlyDatabase(databasePath, (db) => {
    return readDataVersion(db)
  })
}

function safeDirectoryExists(directoryPath: string): boolean {
  try {
    return fs.statSync(directoryPath).isDirectory()
  } catch {
    return false
  }
}

function resolveGitCommonDir(worktree: string): string | null {
  try {
    const raw = execSync(`git -C ${shellQuote(worktree)} rev-parse --git-common-dir`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return path.resolve(worktree, raw)
  } catch {
    return null
  }
}

function findAgentbookDbPath(worktree: string): string | null {
  if (!safeDirectoryExists(worktree)) return null

  const gitCommonDir = resolveGitCommonDir(worktree)
  if (gitCommonDir) {
    const sharedDbPath = path.join(gitCommonDir, "agentbook", "agentbook.db")
    if (fs.existsSync(sharedDbPath)) return sharedDbPath
  }

  const fallbackDbPath = path.join(worktree, ".opencode", "agentbook.db")
  return fs.existsSync(fallbackDbPath) ? fallbackDbPath : null
}

function openProjectDb(projectId: string): ProjectDbInfo {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const project = openCodeDb
      .query(`SELECT id, worktree, name, icon_color, time_created FROM project WHERE id = ?`)
      .get(projectId) as OpenCodeProjectRow | null

    if (!project) {
      throw new Response("Project not found", { status: 404 })
    }

    if (!safeDirectoryExists(project.worktree)) {
      throw new Response("Project worktree not found", { status: 404 })
    }

    return {
      project,
      agentbookDbPath: findAgentbookDbPath(project.worktree),
    }
  })
}

function htmlResponse(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "text/html; charset=utf-8")
  return new Response(body, { ...init, headers })
}

function textResponse(body: string, status = 500): Response {
  const headers = new Headers()
  headers.set("Content-Type", "text/plain; charset=utf-8")
  return new Response(body, { status, headers })
}

function getCount(db: Database, sql: string): number {
  const row = db.query(sql).get() as CountRow | null
  return row?.count ?? 0
}

function loadProjectSummaries(): ProjectSummary[] {
  return withReadonlyDatabase(OPENCODE_DB_PATH, (openCodeDb) => {
    const projects = openCodeDb
      .query(
        `SELECT id, worktree, name, icon_color, time_created
         FROM project
         WHERE id != 'global'
         ORDER BY time_created DESC`,
      )
      .all() as OpenCodeProjectRow[]

    const results: ProjectSummary[] = []

    for (const project of projects) {
      if (!safeDirectoryExists(project.worktree)) continue

      const agentbookDbPath = findAgentbookDbPath(project.worktree)
      const summary = {
        id: project.id,
        worktree: project.worktree,
        name: projectName(project.name, project.worktree),
        icon_color: project.icon_color,
        has_agentbook: agentbookDbPath !== null,
        active_plans: 0,
        active_tasks: 0,
        pending_tasks: 0,
        completed_tasks: 0,
      }

      if (agentbookDbPath) {
        withReadonlyDatabase(agentbookDbPath, (agentbookDb) => {
          summary.active_plans = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM plan WHERE status IN ('active', 'draft')`,
          )
          summary.active_tasks = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM task WHERE status = 'in_progress'`,
          )
          summary.pending_tasks = getCount(agentbookDb, `SELECT COUNT(*) AS count FROM task WHERE status = 'pending'`)
          summary.completed_tasks = getCount(
            agentbookDb,
            `SELECT COUNT(*) AS count FROM task WHERE status = 'completed'`,
          )
        })
      }

      results.push(summary)
    }

    return results
  })
}

function loadProjectDetails(projectId: string): ProjectDetails {
  const { project, agentbookDbPath } = openProjectDb(projectId)

  const response = {
    project: {
      id: project.id,
      worktree: project.worktree,
      name: projectName(project.name, project.worktree),
      icon_color: project.icon_color,
      has_agentbook: agentbookDbPath !== null,
    },
    plans: [] as PlanDetails[],
  }

  if (!agentbookDbPath) return response

  return withReadonlyDatabase(agentbookDbPath, (agentbookDb) => {
    const plans = agentbookDb.query(`SELECT * FROM plan ORDER BY created_at DESC`).all() as AgentbookPlanRow[]

    response.plans = plans.map((plan) => {
      const tasks = agentbookDb.query(`SELECT * FROM task WHERE plan_id = ? ORDER BY position`).all(plan.id) as AgentbookTaskRow[]

      return {
        id: plan.id,
        name: plan.name,
        title: plan.title,
        status: plan.status,
        description: plan.description ?? "",
        spec: plan.spec ?? "",
        document: plan.document ?? "",
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description ?? "",
          status: canonicalTaskStatus(task.status),
          priority: task.priority ?? 0,
          assignee: task.assignee ?? "",
          session_id: task.session_id ?? "",
          worktree_dir: task.worktree_dir ?? "",
          depends_on: task.depends_on ?? "",
          notes: task.notes ?? "",
          created_at: task.created_at,
          updated_at: task.updated_at,
        })),
      }
    })
    return response
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function safeColor(value: string | null | undefined): string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#e94560"
}

function formatRelative(value: number): string {
  const timestamp = Number(value)
  if (!timestamp) return "unknown"

  const diff = Date.now() - timestamp
  const abs = Math.abs(diff)
  const units: Array<[string, number]> = [
    ["y", 365 * 24 * 60 * 60 * 1000],
    ["mo", 30 * 24 * 60 * 60 * 1000],
    ["d", 24 * 60 * 60 * 1000],
    ["h", 60 * 60 * 1000],
    ["m", 60 * 1000],
    ["s", 1000],
  ]

  for (const [label, size] of units) {
    if (abs >= size || label === "s") {
      const amount = Math.max(1, Math.floor(abs / size))
      return diff >= 0 ? `${amount}${label} ago` : `in ${amount}${label}`
    }
  }

  return "just now"
}

function renderRelativeTime(prefix: string, value: number, className = "badge"): string {
  const timestamp = Number(value)
  const hasTimestamp = Number.isFinite(timestamp) && timestamp > 0
  const relative = hasTimestamp ? formatRelative(timestamp) : "unknown"
  const classes = [className, "relative-time"].filter(Boolean).join(" ")
  const datetime = hasTimestamp ? new Date(timestamp).toISOString() : ""
  const label = `${prefix} ${relative}`

  return `<time class="${escapeHtml(classes)}" data-relative-time data-relative-prefix="${escapeHtml(prefix)}" data-relative-timestamp="${escapeHtml(timestamp)}"${datetime ? ` datetime="${escapeHtml(datetime)}"` : ""}>${escapeHtml(label)}</time>`
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function humanizeStatus(status: string): string {
  return String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function statusBadge(status: string, label?: string): string {
  const normalized = canonicalTaskStatus(status)
  return `<span class="badge status-${escapeHtml(normalized)}">${escapeHtml(label ?? humanizeStatus(normalized))}</span>`
}

function statusSortPriority(status: string): number {
  if (["active", "draft", "paused"].includes(status)) return 0
  if (status === "completed") return 1
  if (status === "cancelled") return 2
  return 3
}

function filterPlans(plans: PlanDetails[]): PlanDetails[] {
  const now = Date.now()
  return plans.filter(
    (plan) =>
      plan.status !== "archived" && !(plan.status === "completed" && now - Number(plan.updated_at) > TWO_DAYS_MS),
  )
}

function frameId(planId: string): string {
  return `plan-${planId}`
}

function planCardId(planId: string): string {
  return `plan-card-${planId}`
}

function planSummaryId(planId: string): string {
  return `plan-summary-${planId}`
}

function taskCardId(taskId: string): string {
  return `task-card-${taskId}`
}

function projectLaneId(projectId: string): string {
  return `project-lane-${projectId}`
}

function boardDetailFrameId(): string {
  return "board-detail-panel"
}

function boardSelectionHref(projectId: string, planId?: string, taskId?: string): string {
  if (!planId && !taskId) return "/"

  const params = new URLSearchParams()
  params.set("project", projectId)
  if (planId) params.set("plan", planId)
  if (taskId) params.set("task", taskId)
  return `/?${params.toString()}`
}

function parseBoardSelection(url: URL): BoardSelection | null {
  const projectId = url.searchParams.get("project")?.trim() || ""
  const planId = url.searchParams.get("plan")?.trim() || ""
  const taskId = url.searchParams.get("task")?.trim() || ""

  if (!projectId || (!planId && !taskId)) return null

  const selection: BoardSelection = { projectId }
  if (planId) selection.planId = planId
  if (taskId) selection.taskId = taskId
  return selection
}

function parseProjectDetailSelection(url: URL): ProjectDetailSelection | null {
  const planId = url.searchParams.get("plan")?.trim() || ""
  const taskId = url.searchParams.get("task")?.trim() || ""

  if (!planId && !taskId) return null

  const selection: ProjectDetailSelection = {}
  if (planId) selection.planId = planId
  if (taskId) selection.taskId = taskId
  return selection
}

function renderBoardDetailEmpty(): string {
  return `
    <div>
      <strong>Select a plan or task</strong>
      <div class="muted detail-help">Its full details will render here without losing context when the board updates.</div>
    </div>
  `
}

function renderBoardDetailError(title: string, message: string): string {
  return `
    <div class="empty">
      <h4 class="empty-title">${escapeHtml(title)}</h4>
      <p class="empty-copy">${escapeHtml(message)}</p>
    </div>
  `
}

function renderBoardDetailPanel(selection: BoardSelection | null): string {
  if (!selection) {
    return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" class="detail-panel-empty">${renderBoardDetailEmpty()}</turbo-frame>`
  }

  try {
    const detail = loadProjectDetails(selection.projectId)
    const project = detail.project
    const plan = selection.planId ? detail.plans.find((entry) => entry.id === selection.planId) : undefined
    const resolvedHref = boardSelectionHref(selection.projectId, selection.planId, selection.taskId)

    if (selection.taskId) {
      const locatedPlan = plan ?? detail.plans.find((entry) => entry.tasks.some((task) => task.id === selection.taskId))
      const task = locatedPlan?.tasks.find((entry) => entry.id === selection.taskId)

      if (!locatedPlan || !task) {
        return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" data-board-selection-href="${escapeHtml(resolvedHref)}">${renderBoardDetailError("Task not found", "The selected task no longer exists in this project.")}</turbo-frame>`
      }

      return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" data-board-selection-href="${escapeHtml(resolvedHref)}">${renderTaskDetailPanel(project, locatedPlan, task)}</turbo-frame>`
    }

    if (!plan) {
      return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" data-board-selection-href="${escapeHtml(resolvedHref)}">${renderBoardDetailError("Plan not found", "The selected plan no longer exists in this project.")}</turbo-frame>`
    }

    return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" data-board-selection-href="${escapeHtml(resolvedHref)}">${renderPlanDetailPanel(project, plan)}</turbo-frame>`
  } catch (error) {
    if (error instanceof Response && error.status === 404) {
      const resolvedHref = boardSelectionHref(selection.projectId, selection.planId, selection.taskId)
      return `<turbo-frame id="${escapeHtml(boardDetailFrameId())}" data-board-selection-href="${escapeHtml(resolvedHref)}">${renderBoardDetailError("Project not found", "The selected project is unavailable.")}</turbo-frame>`
    }

    throw error
  }
}

function renderBoardSelectionScript(): string {
  return `
  <script>
    (function () {
      var stateKey = "__agentbookBoardSelectionState";
      var previousState = window[stateKey];
      if (previousState && typeof previousState.cleanup === "function") {
        previousState.cleanup();
      }

      var frameId = ${JSON.stringify(boardDetailFrameId())};
      var controller = new AbortController();
      var refreshQueued = false;
      var refreshTimer = null;
      var observer = null;
      var cleanedUp = false;

      var state = {
        cleanup: cleanup,
      };
      window[stateKey] = state;

      function detailFrame() {
        return document.getElementById(frameId);
      }

      function detailShell() {
        return document.getElementById("board-detail-shell");
      }

      function detailModal() {
        return document.getElementById("board-detail-modal");
      }

      function setDetailOpen(open) {
        var modal = detailModal();
        if (modal) {
          modal.classList.toggle("is-open", open);
          modal.setAttribute("aria-hidden", open ? "false" : "true");
        }

        if (document.body && document.body.classList) {
          document.body.classList.toggle("board-detail-open", open);
        }
      }

      function emptyMarkup() {
        var template = document.getElementById("board-detail-empty-template");
        return template ? template.innerHTML : "";
      }

      function selectionHrefFromLocation() {
        var url = new URL(window.location.href);
        if (!url.searchParams.get("project")) return null;
        if (!url.searchParams.get("plan") && !url.searchParams.get("task")) return null;
        return url.pathname + url.search;
      }

      function mobileDetailHrefFromUrl(url) {
        if (url.pathname !== "/") return null;

        var projectId = url.searchParams.get("project");
        var planId = url.searchParams.get("plan");
        var taskId = url.searchParams.get("task");
        if (!projectId || (!planId && !taskId)) return null;

        var detailUrl = "/projects/" + encodeURIComponent(projectId);
        var params = new URLSearchParams();
        if (planId) params.set("plan", planId);
        if (taskId) params.set("task", taskId);

        var query = params.toString();
        return query ? detailUrl + "?" + query : detailUrl;
      }

      var detailMediaQuery = window.matchMedia ? window.matchMedia("(max-width: 1179px)") : null;

      function shouldUseDetailPage() {
        return Boolean(detailMediaQuery && detailMediaQuery.matches);
      }

      function handleViewportModeChange() {
        syncFrame(true, false);
      }

      function clearFrame(frame) {
        frame.classList.add("detail-panel-empty");
        frame.removeAttribute("src");
        frame.removeAttribute("data-board-selection-href");
        var empty = emptyMarkup();
        if (empty) frame.innerHTML = empty;
        setDetailOpen(false);
      }

      function loadFrame(frame, href, force) {
        setDetailOpen(true);
        frame.classList.remove("detail-panel-empty");
        if (force) {
          frame.removeAttribute("src");
          frame.removeAttribute("data-board-selection-href");
        }

        if (!force && frame.getAttribute("data-board-selection-href") === href) {
          return;
        }

        frame.setAttribute("src", href);
      }

      function shouldFocusDetail() {
        return !shouldUseDetailPage();
      }

      function focusDetailPanel() {
        var shell = detailShell() || detailFrame();
        if (!shell) return;

        if (shouldFocusDetail() && typeof shell.focus === "function") {
          try {
            shell.focus({ preventScroll: true });
            return;
          } catch {
            // Ignore focus option failures in older browsers.
          }
        }

        if (shouldUseDetailPage() && typeof shell.scrollIntoView === "function") {
          shell.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }

      function closeDetailPanel() {
        var url = new URL(window.location.href);
        if (!url.searchParams.get("project")) return;

        window.history.replaceState({}, "", url.pathname);
        syncFrame(false, false);
      }

      function syncFrame(force, focus) {
        var frame = detailFrame();
        if (!frame) return;

        if (shouldUseDetailPage()) {
          var detailHref = mobileDetailHrefFromUrl(new URL(window.location.href));
          if (detailHref) {
            window.location.replace(detailHref);
            return;
          }
        }

        var href = selectionHrefFromLocation();
        if (!href) {
          clearFrame(frame);
          return;
        }

        loadFrame(frame, href, Boolean(force));

        if (focus) {
          focusDetailPanel();
        }
      }

      function scheduleSync(force) {
        if (refreshQueued) return;
        refreshQueued = true;
        refreshTimer = window.setTimeout(function () {
          refreshQueued = false;
          refreshTimer = null;
          syncFrame(Boolean(force), false);
        }, 0);
      }

      function nodeIsInsideDetail(node) {
        var element = node && node.nodeType === 1 ? node : node && node.parentElement ? node.parentElement : null;
        return Boolean(element && element.closest && element.closest("#" + frameId));
      }

      function nodeContainsSelectionLink(node, href) {
        var element = node && node.nodeType === 1 ? node : node && node.parentElement ? node.parentElement : null;
        if (!element) return false;

        if (element.matches && element.matches('a[data-board-detail-link]') && element.getAttribute("href") === href) {
          return true;
        }

        if (!element.querySelectorAll) return false;

        var links = element.querySelectorAll('a[data-board-detail-link]');
        for (var i = 0; i < links.length; i++) {
          if (links[i].getAttribute("href") === href) return true;
        }

        return false;
      }

      function mutationTouchesSelection(mutation, href) {
        if (nodeIsInsideDetail(mutation.target)) return false;

        if (nodeContainsSelectionLink(mutation.target, href)) return true;

        for (var i = 0; i < mutation.addedNodes.length; i++) {
          if (nodeIsInsideDetail(mutation.addedNodes[i])) continue;
          if (nodeContainsSelectionLink(mutation.addedNodes[i], href)) return true;
        }

        for (var j = 0; j < mutation.removedNodes.length; j++) {
          if (nodeIsInsideDetail(mutation.removedNodes[j])) continue;
          if (nodeContainsSelectionLink(mutation.removedNodes[j], href)) return true;
        }

        return false;
      }

      var boardRoot = document.getElementById("board-root");
      if (boardRoot && window.MutationObserver) {
        observer = new MutationObserver(function (mutations) {
          var selectionHref = selectionHrefFromLocation();
          if (!selectionHref) return;

          for (var i = 0; i < mutations.length; i++) {
            if (mutationTouchesSelection(mutations[i], selectionHref)) {
              scheduleSync(true);
              return;
            }
          }
        });

        observer.observe(boardRoot, { childList: true, subtree: true, characterData: true });
      }

      if (detailMediaQuery) {
        if (detailMediaQuery.addEventListener) {
          detailMediaQuery.addEventListener("change", handleViewportModeChange);
          controller.signal.addEventListener("abort", function () {
            detailMediaQuery.removeEventListener("change", handleViewportModeChange);
          }, { once: true });
        } else if (detailMediaQuery.addListener) {
          detailMediaQuery.addListener(handleViewportModeChange);
          controller.signal.addEventListener("abort", function () {
            detailMediaQuery.removeListener(handleViewportModeChange);
          }, { once: true });
        }
      }

      document.addEventListener("click", function (event) {
        var closeTarget = event.target && event.target.closest ? event.target.closest("[data-board-detail-close]") : null;
        if (closeTarget) {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          closeDetailPanel();
          return;
        }

        var target = event.target && event.target.closest ? event.target.closest("a[data-board-detail-link]") : null;
        if (!target) return;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var href = target.getAttribute("href");
        if (!href) return;

        var url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        if (shouldUseDetailPage()) {
          var mobileHref = mobileDetailHrefFromUrl(url);
          if (mobileHref) {
            event.preventDefault();
            window.location.assign(mobileHref);
            return;
          }
        }

        if (url.pathname === "/" && !url.search) {
          event.preventDefault();
          closeDetailPanel();
          return;
        }

        event.preventDefault();
        window.history.pushState({ boardDetail: true }, "", url.pathname + url.search);
        syncFrame(false, true);
      }, { signal: controller.signal });

      window.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (!selectionHrefFromLocation()) return;

        event.preventDefault();
        closeDetailPanel();
      }, { signal: controller.signal });


      window.addEventListener("popstate", function () {
        syncFrame(false, true);
      }, { signal: controller.signal });

      document.addEventListener("turbo:before-cache", cleanup, { signal: controller.signal });
      window.addEventListener("pagehide", cleanup, { signal: controller.signal });

      syncFrame(false, true);

      function cleanup() {
        if (cleanedUp) return;
        cleanedUp = true;

        if (refreshTimer !== null) {
          window.clearTimeout(refreshTimer);
          refreshTimer = null;
        }

        if (observer) {
          observer.disconnect();
          observer = null;
        }

        controller.abort();
        if (window[stateKey] === state) {
          delete window[stateKey];
        }
      }
    })();
  </script>`
}

function excerpt(value: string, limit = 140): string {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ")
  if (!trimmed) return ""
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, limit - 1).trimEnd()}…`
}

function planColumnKey(status: string): (typeof PLAN_STATUS_COLUMNS)[number]["key"] {
  if (PLAN_STATUS_COLUMNS.some((column) => column.key === status)) {
    return status as (typeof PLAN_STATUS_COLUMNS)[number]["key"]
  }

  if (status === "archived") return "completed"
  return "draft"
}

function projectHref(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`
}

function projectDetailHref(projectId: string, planId?: string, taskId?: string): string {
  const params = new URLSearchParams()
  if (planId) params.set("plan", planId)
  if (taskId) params.set("task", taskId)

  const query = params.toString()
  return query ? `${projectHref(projectId)}?${query}` : projectHref(projectId)
}

function planFrameHref(projectId: string, planId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/plans/${encodeURIComponent(planId)}`
}

function decodePathSegment(value: string, label: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new Response(`${label} is not a valid URL path segment`, { status: 400 })
  }
}

function renderShell(
  title: string,
  subtitle: string,
  currentPath: string,
  content: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="turbo-refresh-method" content="morph">
  <meta name="turbo-refresh-scroll" content="preserve">
  <style>${APP_CSS}</style>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@hotwired/turbo@8/dist/turbo.es2017-esm.js"></script>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div>
        <h1 class="hero-title"><span class="hero-icon">◈</span> Agentbook Dashboard</h1>
        <div class="hero-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="hero-actions">
        <span class="hero-chip">Live streams</span>
        ${currentPath === "/" ? "" : `<a class="back-link" href="/">← Board</a>`}
      </div>
    </header>
    ${content}
  </main>
  <script>
    (function () {
      var stateKey = "__agentbookRelativeTimeState";
      var previousState = window[stateKey];
      if (previousState && typeof previousState.cleanup === "function") {
        previousState.cleanup();
      }

      var controller = new AbortController();
      var timerId = null;
      var cleanedUp = false;

      var state = {
        cleanup: cleanup,
      };
      window[stateKey] = state;

      function formatRelative(timestamp) {
        var diff = Date.now() - timestamp;
        var abs = Math.abs(diff);
        var units = [
          ["y", 365 * 24 * 60 * 60 * 1000],
          ["mo", 30 * 24 * 60 * 60 * 1000],
          ["d", 24 * 60 * 60 * 1000],
          ["h", 60 * 60 * 1000],
          ["m", 60 * 1000],
          ["s", 1000],
        ];

        for (var i = 0; i < units.length; i++) {
          var unit = units[i];
          var label = unit[0];
          var size = unit[1];
          if (abs >= size || label === "s") {
            var amount = Math.max(1, Math.floor(abs / size));
            return diff >= 0 ? amount + label + " ago" : "in " + amount + label;
          }
        }

        return "just now";
      }

      function refreshRelativeTimes() {
        var nodes = document.querySelectorAll("[data-relative-time]");
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var timestamp = Number(node.getAttribute("data-relative-timestamp"));
          if (!timestamp) continue;

          var prefix = node.getAttribute("data-relative-prefix") || "";
          var text = prefix ? prefix + " " + formatRelative(timestamp) : formatRelative(timestamp);
          node.textContent = text;

          var exact = new Date(timestamp);
          if (!Number.isNaN(exact.getTime())) {
            node.setAttribute("datetime", exact.toISOString());
            node.setAttribute("title", exact.toLocaleString());
          }
        }
      }

      window.refreshRelativeTimes = refreshRelativeTimes;

      function flashCopied(button) {
        if (!button || !button.classList) return;
        button.classList.add('copied');
        setTimeout(function () { button.classList.remove('copied'); }, 1500);
      }

      function fallbackCopy(text, button) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '0';
          ta.style.left = '0';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) { flashCopied(button); return true; }
        } catch (err) {
          console.warn('Clipboard fallback failed:', err);
        }
        return false;
      }

      window.copyToClipboard = function (text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            flashCopied(button);
          }).catch(function (err) {
            console.warn('Clipboard API failed, falling back:', err);
            fallbackCopy(text, button);
          });
        } else {
          fallbackCopy(text, button);
        }
      };

      refreshRelativeTimes();

      timerId = setInterval(refreshRelativeTimes, 30000);
      document.addEventListener('turbo:load', refreshRelativeTimes, { signal: controller.signal });
      document.addEventListener('turbo:render', refreshRelativeTimes, { signal: controller.signal });
      document.addEventListener('turbo:frame-load', refreshRelativeTimes, { signal: controller.signal });
      document.addEventListener('turbo:before-cache', cleanup, { signal: controller.signal });
      window.addEventListener('pagehide', cleanup, { signal: controller.signal });

      function cleanup() {
        if (cleanedUp) return;
        cleanedUp = true;

        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }

        controller.abort();
        if (window[stateKey] === state) {
          delete window[stateKey];
        }
      }
    })();
  </script>
</body>
</html>`
}

function renderProjectCard(project: ProjectSummary): string {
  const badges = project.has_agentbook
    ? `
      <div class="badge-row">
        <span class="badge"><span class="pill-count">${project.active_plans}</span> active plans</span>
        <span class="badge"><span class="pill-count">${project.active_tasks}</span> active tasks</span>
        <span class="badge"><span class="pill-count">${project.pending_tasks}</span> pending</span>
        <span class="badge"><span class="pill-count">${project.completed_tasks}</span> completed</span>
      </div>
    `
    : `<div class="label-empty">No plans yet</div>`

  return `
    <a href="${projectHref(project.id)}" aria-label="Open project ${escapeHtml(project.name)}">
      <article class="project-card">
        <div class="row-between">
          <div>
            <div class="row">
              <span class="color-dot" style="--swatch:${escapeHtml(safeColor(project.icon_color))}"></span>
              <h2 class="project-name">${escapeHtml(project.name)}</h2>
            </div>
            <div class="project-path">${escapeHtml(project.worktree)}</div>
          </div>
          ${project.has_agentbook ? '<span class="badge status-active">Agentbook</span>' : '<span class="badge status-draft">OpenCode</span>'}
        </div>
        ${badges}
      </article>
    </a>
  `
}

function renderProjects(projects: ProjectSummary[]): string {
  const sortedProjects = [...projects].sort((left, right) => {
    if (Boolean(right.has_agentbook) !== Boolean(left.has_agentbook)) {
      return Number(Boolean(right.has_agentbook)) - Number(Boolean(left.has_agentbook))
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  })

  const content = sortedProjects.length
    ? `<section class="project-grid">${sortedProjects.map(renderProjectCard).join("")}</section>`
    : `
      <section class="empty">
        <h2 class="empty-title">No projects found</h2>
        <p class="empty-copy">Once OpenCode projects exist, they will appear here automatically.</p>
      </section>
    `

  return renderShell(
    "Agentbook Dashboard",
    `${pluralize(sortedProjects.length, "project")} discovered.`,
    "/",
    content,
  )
}

function sortProjectsForBoard(projects: ProjectSummary[]): ProjectSummary[] {
  return [...projects].sort((left, right) => {
    if (Boolean(right.has_agentbook) !== Boolean(left.has_agentbook)) {
      return Number(Boolean(right.has_agentbook)) - Number(Boolean(left.has_agentbook))
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
  })
}

function sortPlansForBoard(plans: PlanDetails[]): PlanDetails[] {
  return [...plans].sort((left, right) => {
    const leftColumn = PLAN_STATUS_COLUMNS.findIndex((column) => column.key === planColumnKey(left.status))
    const rightColumn = PLAN_STATUS_COLUMNS.findIndex((column) => column.key === planColumnKey(right.status))
    if (leftColumn !== rightColumn) return leftColumn - rightColumn

    const timestampDiff = Number(right.updated_at) - Number(left.updated_at)
    if (timestampDiff !== 0) return timestampDiff

    return left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
  })
}

function sortBoardTasks(tasks: Array<{ plan: PlanDetails; task: TaskDetails }>): Array<{ plan: PlanDetails; task: TaskDetails }> {
  return [...tasks].sort((left, right) => {
    const leftColumn = TASK_STATUS_COLUMNS.findIndex((column) => column.key === taskColumnKey(left.task.status))
    const rightColumn = TASK_STATUS_COLUMNS.findIndex((column) => column.key === taskColumnKey(right.task.status))
    if (leftColumn !== rightColumn) return leftColumn - rightColumn

    const priorityDiff = Number(left.task.priority || 0) - Number(right.task.priority || 0)
    if (priorityDiff !== 0) return priorityDiff

    const timestampDiff = Number(right.task.updated_at || right.task.created_at) - Number(left.task.updated_at || left.task.created_at)
    if (timestampDiff !== 0) return timestampDiff

    return left.task.title.localeCompare(right.task.title, undefined, { sensitivity: "base" })
  })
}

function loadBoardModel(): BoardModel {
  const projects = sortProjectsForBoard(loadProjectSummaries())
  const boardProjects: BoardProject[] = []
  let planCount = 0
  let taskCount = 0

  for (const summary of projects) {
    if (!summary.has_agentbook) {
      boardProjects.push({ summary, plans: [], tasks: [] })
      continue
    }

    try {
      const detail = loadProjectDetails(summary.id)
      const plans = sortPlansForBoard(filterPlans(detail.plans))
      const tasks = sortBoardTasks(
        plans.flatMap((plan) => plan.tasks.map((task) => ({ plan, task }))),
      )

      planCount += plans.length
      taskCount += tasks.length
      boardProjects.push({ summary, plans, tasks })
    } catch (error) {
      if (error instanceof Response && error.status === 404) {
        boardProjects.push({ summary, plans: [], tasks: [] })
        continue
      }

      throw error
    }
  }

  return { projects: boardProjects, planCount, taskCount }
}

function renderPlanBoardCard(project: ProjectSummary, plan: PlanDetails): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const completed = tasks.filter((task) => task.status === "completed").length
  const summary = excerpt(plan.description || plan.document || "", 120)
  const detailHref = boardSelectionHref(project.id, plan.id)

  return `
    <article class="board-card plan-board-card" id="${escapeHtml(planCardId(plan.id))}" data-plan-id="${escapeHtml(plan.id)}" data-project-id="${escapeHtml(project.id)}">
      <div class="board-card-title-line" id="${escapeHtml(planSummaryId(plan.id))}">
        <div>
          <h4 class="board-card-title">${escapeHtml(plan.title || "Untitled plan")}</h4>
          <div class="board-card-subtitle">${escapeHtml(plan.name || plan.id)}</div>
        </div>
        ${statusBadge(plan.status || "draft")}
      </div>
      ${summary ? `<p class="board-card-snippet">${escapeHtml(summary)}</p>` : ""}
      <div class="board-card-actions">
        <a class="badge action board-card-link" href="${escapeHtml(detailHref)}" data-board-detail-link>Open detail</a>
      </div>
      <div class="card-meta">
        <span class="badge"><span class="pill-count">${completed}/${tasks.length}</span> tasks</span>
        ${renderRelativeTime("Updated", plan.updated_at || plan.created_at)}
      </div>
    </article>
  `
}

function renderPlanStatusColumns(project: ProjectSummary, plans: PlanDetails[]): string {
  const grouped = new Map<(typeof PLAN_STATUS_COLUMNS)[number]["key"], PlanDetails[]>()
  for (const column of PLAN_STATUS_COLUMNS) grouped.set(column.key, [])

  for (const plan of plans) {
    grouped.get(planColumnKey(plan.status))?.push(plan)
  }

  return `
    <div class="status-columns">
      ${PLAN_STATUS_COLUMNS.map((column) => {
        const columnPlans = grouped.get(column.key) ?? []
        return `
          <section class="status-column">
            <div class="status-column-header">
              <h5 class="status-column-title">${escapeHtml(column.label)}</h5>
              <span class="status-column-count">${columnPlans.length}</span>
            </div>
            <div class="card-stack">
              ${columnPlans.length ? columnPlans.map((plan) => renderPlanBoardCard(project, plan)).join("") : '<div class="task-column-empty">No plans</div>'}
            </div>
          </section>
        `
      }).join("")}
    </div>
  `
}

function renderTaskBoardCard(project: ProjectSummary, plan: PlanDetails, task: TaskDetails): string {
  const snippet = excerpt(task.description || task.notes || "", 120)
  const metadata = [
    plan.title || plan.name || "Untitled plan",
    task.assignee ? `@${task.assignee}` : "Unassigned",
    `P${task.priority || 0}`,
  ]
  const detailHref = boardSelectionHref(project.id, plan.id, task.id)

  return `
    <article class="board-card task-board-card" id="${escapeHtml(taskCardId(task.id))}" data-task-id="${escapeHtml(task.id)}" data-plan-id="${escapeHtml(plan.id)}" data-project-id="${escapeHtml(project.id)}">
      <div class="board-card-title-line">
        <div>
          <h4 class="board-card-title">${escapeHtml(task.title || "Untitled task")}</h4>
          <div class="board-card-subtitle">${escapeHtml(plan.title || plan.name || "Untitled plan")}</div>
        </div>
        ${statusBadge(task.status || "pending")}
      </div>
      ${snippet ? `<p class="board-card-snippet">${escapeHtml(snippet)}</p>` : ""}
      <div class="board-card-actions">
        <a class="badge action board-card-link" href="${escapeHtml(detailHref)}" data-board-detail-link>Open detail</a>
      </div>
      <div class="card-meta">
        ${metadata.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        ${renderRelativeTime("Updated", task.updated_at || task.created_at)}
      </div>
    </article>
  `
}

function renderTaskStatusColumns(project: ProjectSummary, tasks: Array<{ plan: PlanDetails; task: TaskDetails }>): string {
  const grouped = new Map<(typeof TASK_STATUS_COLUMNS)[number]["key"], Array<{ plan: PlanDetails; task: TaskDetails }>>()
  for (const column of TASK_STATUS_COLUMNS) grouped.set(column.key, [])

  for (const entry of tasks) {
    grouped.get(taskColumnKey(entry.task.status))?.push(entry)
  }

  return `
    <div class="status-columns">
      ${TASK_STATUS_COLUMNS.map((column) => {
        const columnTasks = grouped.get(column.key) ?? []
        return `
          <section class="status-column">
            <div class="status-column-header">
              <h5 class="status-column-title">${escapeHtml(column.label)}</h5>
              <span class="status-column-count">${columnTasks.length}</span>
            </div>
            <div class="card-stack">
              ${columnTasks.length ? columnTasks.map(({ plan, task }) => renderTaskBoardCard(project, plan, task)).join("") : '<div class="task-column-empty">No tasks</div>'}
            </div>
          </section>
        `
      }).join("")}
    </div>
  `
}

function renderProjectLane(project: BoardProject): string {
  const { summary, plans, tasks } = project

  const stats = summary.has_agentbook
    ? [
        `<span class="badge"><span class="pill-count">${summary.active_plans}</span> active plans</span>`,
        `<span class="badge"><span class="pill-count">${summary.active_tasks}</span> active tasks</span>`,
        `<span class="badge"><span class="pill-count">${summary.pending_tasks}</span> pending</span>`,
        `<span class="badge"><span class="pill-count">${summary.completed_tasks}</span> completed</span>`,
      ].join("")
    : '<span class="badge status-draft">OpenCode only</span>'

  return `
    <article class="project-lane" id="${escapeHtml(projectLaneId(summary.id))}" data-project-id="${escapeHtml(summary.id)}">
      <header class="project-lane-header">
        <div>
        <div class="row">
            <span class="color-dot" style="--swatch:${escapeHtml(safeColor(summary.icon_color))}"></span>
            <h2 class="project-lane-name">${escapeHtml(summary.name)}</h2>
          </div>
          <div class="project-lane-path">${escapeHtml(summary.worktree)}</div>
        </div>
        <div class="lane-stats">${stats}</div>
      </header>

      <div class="lane-body">
        <section class="lane-section" aria-labelledby="${escapeHtml(`${projectLaneId(summary.id)}-plans`) }">
          <div class="section-header" id="${escapeHtml(`${projectLaneId(summary.id)}-plans`)}">
            <h3 class="section-title">Plans</h3>
            <div class="meta">${pluralize(plans.length, "plan")}</div>
          </div>
          ${renderPlanStatusColumns(summary, plans)}
        </section>

        <section class="lane-section" aria-labelledby="${escapeHtml(`${projectLaneId(summary.id)}-tasks`) }">
          <div class="section-header" id="${escapeHtml(`${projectLaneId(summary.id)}-tasks`)}">
            <h3 class="section-title">Tasks</h3>
            <div class="meta">${pluralize(tasks.length, "task")}</div>
          </div>
          ${renderTaskStatusColumns(summary, tasks)}
        </section>
      </div>
    </article>
  `
}

function renderBoardSummary(model: BoardModel): string {
  return `
    <section class="board-summary" id="board-summary">
      <div>
        <h2 class="section-title board-summary-title">Project board</h2>
        <div class="meta">Server-rendered board shell with stable fragments for live updates.</div>
      </div>
      <div class="lane-stats">
        <span class="badge"><span class="pill-count">${model.projects.length}</span> projects</span>
        <span class="badge"><span class="pill-count">${model.planCount}</span> plans</span>
        <span class="badge"><span class="pill-count">${model.taskCount}</span> tasks</span>
      </div>
    </section>
  `
}

function renderBoardGrid(model: BoardModel): string {
  return `
    <div class="board-grid" id="board-grid">
      ${model.projects.length ? model.projects.map(renderProjectLane).join("") : '<section class="empty"><h2 class="empty-title">No projects found</h2><p class="empty-copy">Once OpenCode projects exist, they will appear here automatically.</p></section>'}
    </div>
  `
}

function boardProjectFingerprint(project: BoardProject): string {
  return JSON.stringify({
    summary: {
      id: project.summary.id,
      worktree: project.summary.worktree,
      name: project.summary.name,
      icon_color: project.summary.icon_color,
      has_agentbook: project.summary.has_agentbook,
      active_plans: project.summary.active_plans,
      active_tasks: project.summary.active_tasks,
      pending_tasks: project.summary.pending_tasks,
      completed_tasks: project.summary.completed_tasks,
    },
    plans: project.plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      title: plan.title,
      status: plan.status,
      description: plan.description,
      document: plan.document,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      tasks: plan.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        session_id: task.session_id,
        notes: task.notes,
        created_at: task.created_at,
        updated_at: task.updated_at,
      })),
    })),
    tasks: project.tasks.map(({ plan, task }) => ({
      planId: plan.id,
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      session_id: task.session_id,
      notes: task.notes,
      created_at: task.created_at,
      updated_at: task.updated_at,
    })),
  })
}

function renderBoard(model: BoardModel, selection: BoardSelection | null): string {
  const detailFrame = renderBoardDetailPanel(selection)
  const content = `
    <section class="board-layout" id="board-root">
      ${renderBoardSummary(model)}

      <div class="board-workspace">
        <div class="board-main">
          ${renderBoardGrid(model)}
        </div>
      </div>
      <aside class="board-sidebar" id="board-detail-modal" aria-hidden="true">
        <button type="button" class="board-modal-backdrop" aria-label="Close detail view" data-board-detail-close></button>
        <section class="detail-panel-shell" id="board-detail-shell" role="dialog" aria-modal="true" tabindex="-1">
            <div class="section-header">
              <h3 class="section-title">Detail modal</h3>
              <div class="meta">Target: #${escapeHtml(boardDetailFrameId())}</div>
            </div>
            <template id="board-detail-empty-template">${renderBoardDetailEmpty()}</template>
            ${detailFrame}
        </section>
      </aside>
      <turbo-stream-source src="/streams/board"></turbo-stream-source>
      ${renderBoardSelectionScript()}
    </section>
  `

  return renderShell(
    "Agentbook Board",
    `${pluralize(model.projects.length, "project")} · ${pluralize(model.planCount, "plan")} · ${pluralize(model.taskCount, "task")} visible. Incremental updates stay live without page refreshes.`,
    "/",
    content,
  )
}

function renderBoardStreamResponse(request: Request): Response {
  let previousModel = loadBoardModel()
  let previousFingerprints = new Map(previousModel.projects.map((project) => [project.summary.id, boardProjectFingerprint(project)]))
  let previousProjectIds = previousModel.projects.map((project) => project.summary.id)

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const encoder = new TextEncoder()
  let cleanup = () => {}

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false
        let polling = false
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let keepAliveTimer: ReturnType<typeof setInterval> | null = null

        const send = (payload: string) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(payload))
          } catch {
            cleanup()
          }
        }

        cleanup = () => {
          if (closed) return
          closed = true
          if (pollTimer) clearInterval(pollTimer)
          if (keepAliveTimer) clearInterval(keepAliveTimer)
          request.signal.removeEventListener("abort", cleanup)
          try {
            controller.close()
          } catch {}
        }

        const poll = async () => {
          if (closed || polling) return
          polling = true

          try {
            const nextModel = loadBoardModel()
            const nextProjectIds = nextModel.projects.map((project) => project.summary.id)
            const nextFingerprints = new Map(nextModel.projects.map((project) => [project.summary.id, boardProjectFingerprint(project)]))
            const orderChanged =
              previousProjectIds.length !== nextProjectIds.length ||
              nextProjectIds.some((projectId, index) => previousProjectIds[index] !== projectId)

            if (
              previousModel.projects.length !== nextModel.projects.length ||
              previousModel.planCount !== nextModel.planCount ||
              previousModel.taskCount !== nextModel.taskCount
            ) {
              send(sseEvent(turboStream("replace", "board-summary", renderBoardSummary(nextModel), "morph")))
            }

            if (orderChanged) {
              send(sseEvent(turboStream("replace", "board-grid", renderBoardGrid(nextModel), "morph")))
            } else {
              for (const project of nextModel.projects) {
                const previousFingerprint = previousFingerprints.get(project.summary.id)
                const nextFingerprint = nextFingerprints.get(project.summary.id)
                if (previousFingerprint !== nextFingerprint) {
                  send(sseEvent(turboStream("replace", projectLaneId(project.summary.id), renderProjectLane(project), "morph")))
                }
              }
            }

            previousModel = nextModel
            previousProjectIds = nextProjectIds
            previousFingerprints = nextFingerprints
          } catch (error) {
            console.error("Board stream error:", error)
            cleanup()
          } finally {
            polling = false
          }
        }

        send(sseComment())
        pollTimer = setInterval(() => {
          void poll()
        }, STREAM_POLL_MS)
        keepAliveTimer = setInterval(() => send(sseComment()), STREAM_KEEPALIVE_MS)
        request.signal.addEventListener("abort", cleanup)
      },
      cancel() {
        cleanup()
      },
    }),
    { headers },
  )
}

function planShouldStartOpen(status: string): boolean {
  return ["active", "draft", "paused"].includes(status)
}

function renderPlanDetailPanel(project: { id: string; name: string }, plan: PlanDetails, navigationMode: DetailNavigationMode = "board"): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const completed = tasks.filter((task) => task.status === "completed").length
  const clearHref = navigationMode === "page" ? projectDetailHref(project.id) : boardSelectionHref(project.id)
  const closeLabel = navigationMode === "page" ? "Back to project" : "Close"

  return `
    <div class="detail-stack">
      <section class="panel">
        <div class="row-between">
          <div>
            <p class="detail-kicker">Plan detail</p>
            <h3 class="detail-title">${escapeHtml(plan.title || "Untitled plan")}</h3>
            <div class="meta">${escapeHtml(project.name)} · ${escapeHtml(plan.name || plan.id)} · ${renderRelativeTime("Updated", plan.updated_at || plan.created_at, "meta")}</div>
          </div>
          <div class="detail-actions">
            <a class="badge action" href="${escapeHtml(clearHref)}"${navigationMode === "board" ? ' data-board-detail-close' : ""}>${escapeHtml(closeLabel)}</a>
          </div>
        </div>
        <div class="badge-row detail-badges">
          ${statusBadge(plan.status || "draft")}
          <span class="badge"><span class="pill-count">${completed}/${tasks.length}</span> tasks</span>
          ${renderRelativeTime("Created", plan.created_at)}
        </div>
      </section>

      <section class="panel detail-section">
        <h4 class="section-title">Plan content</h4>
        ${renderPlanBody(plan)}
      </section>
    </div>
  `
}

function renderTaskDetailPanel(project: { id: string; name: string }, plan: PlanDetails, task: TaskDetails, navigationMode: DetailNavigationMode = "board"): string {
  const clearHref = navigationMode === "page" ? projectDetailHref(project.id) : boardSelectionHref(project.id)
  const planHref = navigationMode === "page" ? projectDetailHref(project.id, plan.id) : boardSelectionHref(project.id, plan.id)
  const closeLabel = navigationMode === "page" ? "Back to project" : "Close"
  const hasDescription = Boolean(String(task.description || "").trim())
  const hasNotes = Boolean(String(task.notes || "").trim())

  return `
    <div class="detail-stack">
      <section class="panel">
        <div class="row-between">
          <div>
            <p class="detail-kicker">Task detail</p>
            <h3 class="detail-title">${escapeHtml(task.title || "Untitled task")}</h3>
            <div class="meta">${escapeHtml(project.name)} · ${escapeHtml(plan.title || plan.name || plan.id)} · ${renderRelativeTime("Updated", task.updated_at || task.created_at, "meta")}</div>
          </div>
          <div class="detail-actions">
            <a class="badge action" href="${escapeHtml(planHref)}"${navigationMode === "board" ? ' data-board-detail-link' : ""}>Open plan</a>
            <a class="badge action" href="${escapeHtml(clearHref)}"${navigationMode === "board" ? ' data-board-detail-close' : ""}>${escapeHtml(closeLabel)}</a>
          </div>
        </div>
        <div class="badge-row detail-badges">
          ${statusBadge(task.status || "pending")}
          <span class="badge">P${escapeHtml(task.priority || 0)}</span>
          <span class="badge">${task.assignee ? `@${escapeHtml(task.assignee)}` : "Unassigned"}</span>
          ${task.session_id ? `<span class="badge">Session ${escapeHtml(task.session_id)}</span>` : ""}
        </div>
      </section>

      <section class="panel detail-section">
        <h4 class="section-title">Description</h4>
        ${hasDescription ? `<div class="detail-field-value">${escapeHtml(task.description)}</div>` : '<div class="muted">No description</div>'}
      </section>

      <section class="panel detail-section">
        <h4 class="section-title">Notes</h4>
        ${hasNotes ? `<div class="detail-field-value">${escapeHtml(task.notes)}</div>` : '<div class="muted">No notes</div>'}
      </section>

      <section class="panel detail-section">
        <h4 class="section-title">Task metadata</h4>
        <div class="detail-grid">
          <div class="detail-field">
            <div class="detail-field-label">Plan</div>
            <div class="detail-field-value">${escapeHtml(plan.title || plan.name || plan.id)}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">Depends on</div>
            <div class="detail-field-value">${task.depends_on ? escapeHtml(task.depends_on) : "None"}</div>
          </div>
          <div class="detail-field">
            <div class="detail-field-label">Worktree</div>
            <div class="detail-field-value">${task.worktree_dir ? escapeHtml(task.worktree_dir) : "—"}</div>
          </div>
        </div>
      </section>
    </div>
  `
}

function taskColumnKey(status: string): (typeof TASK_STATUS_COLUMNS)[number]["key"] {
  const normalized = canonicalTaskStatus(status)
  if (TASK_STATUS_COLUMNS.some((column) => column.key === normalized)) {
    return normalized as (typeof TASK_STATUS_COLUMNS)[number]["key"]
  }

  return "pending"
}

function renderTaskCard(task: TaskDetails): string {
  const description = String(task.description || "")
  const hasDescription = Boolean(description.trim())
  const status = canonicalTaskStatus(task.status || "pending")
  const metadata = [
    task.assignee ? `@${escapeHtml(task.assignee)}` : "Unassigned",
    renderRelativeTime("Updated", task.updated_at || task.created_at, "task-card-meta-time"),
  ]

  return `
    <article class="task-card">
      <div class="task-title-line">
        <span class="task-icon">${escapeHtml(TASK_ICONS[status] ?? "•")}</span>
        <div>
          <div class="task-title">${escapeHtml(task.title || "Untitled task")}</div>
          <div class="meta task-status-meta">${statusBadge(status)}</div>
        </div>
      </div>
      ${
        hasDescription
          ? `
            <details class="document-details">
              <summary class="document-summary">Description</summary>
              <pre class="document-body">${escapeHtml(description)}</pre>
            </details>
          `
          : ""
      }
      <div class="task-card-meta">
        ${metadata.map((item) => `<span>${item}</span>`).join("")}
      </div>
    </article>
  `
}

function renderTaskColumns(tasks: TaskDetails[]): string {
  const grouped = new Map<(typeof TASK_STATUS_COLUMNS)[number]["key"], TaskDetails[]>()
  for (const column of TASK_STATUS_COLUMNS) grouped.set(column.key, [])

  for (const task of tasks) {
    grouped.get(taskColumnKey(task.status))?.push(task)
  }

  return `
    <div class="plan-task-columns">
      ${TASK_STATUS_COLUMNS.map((column) => {
        const columnTasks = grouped.get(column.key) ?? []

        return `
          <section class="task-column">
            <div class="task-column-header">
              <h5 class="task-column-title">${escapeHtml(column.label)}</h5>
              <span class="task-column-count">${columnTasks.length}</span>
            </div>
            <div class="task-column-body">
              ${columnTasks.length ? columnTasks.map(renderTaskCard).join("") : '<div class="task-column-empty">No tasks</div>'}
            </div>
          </section>
        `
      }).join("")}
    </div>
  `
}

function renderPlanSummary(plan: PlanDetails): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const completed = tasks.filter((task) => task.status === "completed").length
  const total = tasks.length
  const percentage = total ? Math.round((completed / total) * 100) : 0
  const copyText = JSON.stringify(`${plan.id} ${plan.name}`)

  return `
    <summary class="plan-summary" id="${escapeHtml(planSummaryId(plan.id))}">
      <div class="plan-summary-main">
        <span class="plan-chevron" aria-hidden="true"><span class="when-closed">▶</span><span class="when-open">▼</span></span>
        <div class="plan-summary-copy">
          <h4 class="plan-title">${escapeHtml(plan.title || "Untitled plan")}</h4>
          ${statusBadge(plan.status || "draft")}
        </div>
        <button
          type="button"
          class="copy-plan-button"
          title="Copy UUID + name"
          aria-label="Copy UUID and name for ${escapeHtml(plan.title || plan.name || "plan")}"
          onclick="event.preventDefault(); event.stopPropagation(); window.copyToClipboard(${escapeHtml(copyText)}, this)"
        ><span class="copy-plan-button-text">📋</span></button>
      </div>
        <div class="plan-summary-meta">
        <span class="plan-summary-stat">${completed}/${total} tasks</span>
        <div class="progress progress-inline" aria-label="${escapeHtml(`${percentage}% complete`)}"><span style="width:${percentage}%;"></span></div>
        ${renderRelativeTime("created", plan.created_at, "plan-summary-stat")}
      </div>
    </summary>
  `
}

function renderPlanBody(plan: PlanDetails): string {
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : []
  const description = String(plan.description || "").trim()
  const spec = String(plan.spec || "").trim()
  const document = String(plan.document || "").trim()

  return `
    <div class="plan-body">
      ${description ? `<div class="detail-field"><div class="detail-field-label">Description</div><div class="detail-field-value">${escapeHtml(description)}</div></div>` : ""}
      ${spec ? `<div class="detail-field"><div class="detail-field-label">Spec</div><div class="detail-field-value">${escapeHtml(spec)}</div></div>` : ""}
      ${
        document
          ? `
            <div class="detail-field">
              <div class="detail-field-label">Document</div>
              <details class="document-details" id="${escapeHtml(`plan-doc-${plan.id}`)}">
                <summary class="document-summary">Plan document</summary>
                <pre class="document-body">${escapeHtml(document)}</pre>
              </details>
            </div>
          `
          : ""
      }
      ${renderTaskColumns(tasks)}
    </div>
  `
}

function renderPlanFrame(projectId: string, plan: PlanDetails, includeSrc = true): string {
  const openAttribute = planShouldStartOpen(plan.status) ? " open" : ""
  const srcAttribute = includeSrc ? ` src="${escapeHtml(planFrameHref(projectId, plan.id))}"` : ""

  return `
    <details class="plan-card" id="${escapeHtml(planCardId(plan.id))}"${openAttribute}>
      ${renderPlanSummary(plan)}
      <turbo-frame id="${escapeHtml(frameId(plan.id))}"${srcAttribute}>
        ${renderPlanBody(plan)}
      </turbo-frame>
    </details>
  `
}

function planFingerprint(plan: PlanDetails): number {
  const taskTimestamps = Array.isArray(plan.tasks) ? plan.tasks.map((task) => Number(task.updated_at) || 0) : []
  return Math.max(Number(plan.updated_at) || 0, ...taskTimestamps)
}

function sseEvent(payload: string): string {
  const normalized = payload.replaceAll("\r\n", "\n")
  return `${normalized.split("\n").map((line) => `data: ${line}`).join("\n")}\n\n`
}

function sseComment(): string {
  return `:\n\n`
}

function turboStream(action: string, target: string, template?: string, method?: "morph"): string {
  const methodAttribute = method ? ` method="${method}"` : ""
  if (template === undefined) {
    return `<turbo-stream action="${action}"${methodAttribute} target="${escapeHtml(target)}"></turbo-stream>`
  }

  return `<turbo-stream action="${action}"${methodAttribute} target="${escapeHtml(target)}">\n<template>\n${template}\n</template>\n</turbo-stream>`
}

function renderProjectStreamResponse(projectId: string, request: Request): Response {
  const initialSnapshot = loadProjectDetails(projectId)
  let { agentbookDbPath } = openProjectDb(projectId)
  let previousPlans = filterPlans(initialSnapshot.plans)
  let previousFingerprints = new Map(previousPlans.map((plan) => [plan.id, planFingerprint(plan)]))

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  const encoder = new TextEncoder()
  let cleanup = () => {}

  return new Response(
    new ReadableStream({
      start(controller) {
        let closed = false
        let polling = false
        let pollTimer: ReturnType<typeof setInterval> | null = null
        let keepAliveTimer: ReturnType<typeof setInterval> | null = null
        const openCodeDb = openReadonlyDatabase(OPENCODE_DB_PATH)
        let agentbookDb = agentbookDbPath ? openReadonlyDatabase(agentbookDbPath) : null
        let openCodeVersion = readDataVersion(openCodeDb)
        let agentbookVersion = agentbookDb ? readDataVersion(agentbookDb) : null

        const send = (payload: string) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(payload))
          } catch {
            cleanup()
          }
        }

        cleanup = () => {
          if (closed) return
          closed = true
          if (pollTimer) clearInterval(pollTimer)
          if (keepAliveTimer) clearInterval(keepAliveTimer)
          try {
            agentbookDb?.close()
          } catch {}
          try {
            openCodeDb.close()
          } catch {}
          request.signal.removeEventListener("abort", cleanup)
          try {
            controller.close()
          } catch {}
        }

        const poll = async () => {
          if (closed || polling) return
          polling = true

          try {
            const hadPlansBefore = previousPlans.length > 0
            const currentProject = openProjectDb(projectId)
            const nextOpenCodeVersion = readDataVersion(openCodeDb)
            const nextAgentbookDbPath = currentProject.agentbookDbPath

            if (nextAgentbookDbPath !== agentbookDbPath) {
              try {
                agentbookDb?.close()
              } catch {}
              agentbookDb = nextAgentbookDbPath ? openReadonlyDatabase(nextAgentbookDbPath) : null
            }

            const nextAgentbookVersion = agentbookDb ? readDataVersion(agentbookDb) : null

            if (
              nextOpenCodeVersion === openCodeVersion &&
              nextAgentbookVersion === agentbookVersion &&
              nextAgentbookDbPath === agentbookDbPath
            ) {
              return
            }

            const nextSnapshot = loadProjectDetails(projectId)
            const nextPlans = filterPlans(nextSnapshot.plans)
            const nextFingerprints = new Map(nextPlans.map((plan) => [plan.id, planFingerprint(plan)]))
            const nextPlanMap = new Map(nextPlans.map((plan) => [plan.id, plan]))

            if (previousPlans.length === 0 && nextPlans.length > 0) {
              send(sseEvent(turboStream("remove", "plan-list-empty")))
            }

            for (const plan of nextPlans) {
              const previousFingerprint = previousFingerprints.get(plan.id)
              if (previousFingerprint === undefined) {
                send(sseEvent(turboStream("prepend", "plan-list", renderPlanFrame(projectId, plan, false))))
                continue
              }

              const currentFingerprint = nextFingerprints.get(plan.id)
              if (previousFingerprint !== currentFingerprint) {
                send(sseEvent(turboStream("replace", planSummaryId(plan.id), renderPlanSummary(plan), "morph")))
                send(sseEvent(turboStream("replace", frameId(plan.id), renderPlanBody(plan), "morph")))
              }
            }

            for (const plan of previousPlans) {
              if (!nextPlanMap.has(plan.id)) {
                send(sseEvent(turboStream("remove", planCardId(plan.id))))
              }
            }
            previousPlans = nextPlans
            previousFingerprints = nextFingerprints
            openCodeVersion = nextOpenCodeVersion
            agentbookDbPath = nextAgentbookDbPath
            agentbookVersion = nextAgentbookVersion

            if (hadPlansBefore && nextPlans.length === 0) {
              send(
                sseEvent(
                  turboStream(
                    "prepend",
                    "plan-list",
                    '<div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div>',
                  ),
                ),
              )
            }
          } catch (error) {
            console.error("Project stream error:", error)
            cleanup()
          } finally {
            polling = false
          }
        }

        send(sseComment())
        pollTimer = setInterval(() => {
          void poll()
        }, STREAM_POLL_MS)
        keepAliveTimer = setInterval(() => send(sseComment()), STREAM_KEEPALIVE_MS)
        request.signal.addEventListener("abort", cleanup)
      },
      cancel() {
        cleanup()
      },
    }),
    { headers },
  )
}

function renderDetail(detail: ProjectDetails, focusSelection: ProjectDetailSelection | null = null): string {
  const project = detail.project
  const allPlans = Array.isArray(detail.plans) ? detail.plans : []
  const now = Date.now()
  const archivedCount = allPlans.filter((plan) => plan.status === "archived").length
  const olderCompletedHiddenCount = allPlans.filter(
    (plan) => plan.status === "completed" && now - Number(plan.updated_at) > TWO_DAYS_MS,
  ).length
  const hiddenDetails = [
    olderCompletedHiddenCount ? `${pluralize(olderCompletedHiddenCount, "older completed plan")} hidden` : "",
    archivedCount ? pluralize(archivedCount, "archived plan") : "",
  ].filter(Boolean)
  const plans = filterPlans(allPlans).sort((left, right) => {
    const priorityDiff = statusSortPriority(left.status) - statusSortPriority(right.status)
    if (priorityDiff !== 0) return priorityDiff
    return Number(right.updated_at) - Number(left.updated_at)
  })
  const searchablePlans = allPlans

  const focusedDetail = focusSelection
    ? (() => {
        const selectedPlan = focusSelection.planId ? searchablePlans.find((plan) => plan.id === focusSelection.planId) : undefined

        if (focusSelection.taskId) {
          const locatedPlan = selectedPlan ?? searchablePlans.find((entry) => entry.tasks.some((task) => task.id === focusSelection.taskId))
          const task = locatedPlan?.tasks.find((entry) => entry.id === focusSelection.taskId)

          if (!locatedPlan || !task) {
            return `<section class="panel detail-section">${renderBoardDetailError("Task not found", "The selected task no longer exists in this project.")}</section>`
          }

          return renderTaskDetailPanel(project, locatedPlan, task, "page")
        }

        if (!selectedPlan) {
          return `<section class="panel detail-section">${renderBoardDetailError("Plan not found", "The selected plan no longer exists in this project.")}</section>`
        }

        return renderPlanDetailPanel(project, selectedPlan, "page")
      })()
    : ""

  const header = `
    <section class="detail-header">
      <div>
        <a class="back-link" href="/">← All Projects</a>
      </div>
      <div class="panel">
        <div class="row-between">
          <div>
            <div class="row">
            <span class="color-dot" style="--swatch:${escapeHtml(safeColor(project.icon_color))}"></span>
              <h2 class="detail-title">${escapeHtml(project.name)}</h2>
            </div>
            <div class="project-path">${escapeHtml(project.worktree)}</div>
          </div>
          <div class="badge-row">
            ${project.has_agentbook ? '<span class="badge status-active">Agentbook enabled</span>' : '<span class="badge status-draft">No agentbook data</span>'}
          </div>
        </div>
      </div>
    </section>
  `

  const plansHtml = plans.map((plan) => renderPlanFrame(project.id, plan)).join("")

  const plansSection = plans.length || allPlans.length
    ? `
      <section>
        <div class="section-header">
          <h3 class="section-title">Plans</h3>
          <div class="meta">${pluralize(plans.length, "plan")}${hiddenDetails.length ? ` (${hiddenDetails.join(", ")})` : ""}</div>
        </div>
        <div class="plan-list" id="plan-list">${plansHtml || '<div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div>'}</div>
      </section>
    `
    : `
      <section>
        <div class="section-header">
          <h3 class="section-title">Plans</h3>
          <div class="meta">0 plans</div>
        </div>
        <div class="plan-list" id="plan-list"><div class="empty" id="plan-list-empty"><h4 class="empty-title">No plans yet</h4><p class="empty-copy">This project does not have any tracked plans.</p></div></div>
      </section>
    `
  return renderShell(
    `${project.name} · Agentbook Dashboard`,
    `Viewing ${project.name}. Live updates enabled.`,
    projectHref(project.id),
    `${header}${focusedDetail}<div class="stack">${plansSection}</div><turbo-stream-source src="/streams/projects/${escapeHtml(encodeURIComponent(project.id))}"></turbo-stream-source>`,
  )
}

function renderPlanFrameResponse(projectId: string, planId: string): string {
  const detail = loadProjectDetails(projectId)
  const plan = detail.plans.find((entry) => entry.id === planId)
  if (!plan) throw new Response("Plan not found", { status: 404 })
  return `<turbo-frame id="${escapeHtml(frameId(plan.id))}">${renderPlanBody(plan)}</turbo-frame>`
}

function renderErrorPage(title: string, message: string, status = 500): Response {
  const body = renderShell(
    `${title} · Agentbook Dashboard`,
    message,
    "/",
    `
      <section class="error">
        <h2 class="error-title">${escapeHtml(title)}</h2>
        <p class="error-message">${escapeHtml(message)}</p>
      </section>
    `,
  )
  return htmlResponse(body, { status })
}

function resolvePort(argv: string[] = process.argv.slice(2)): number {
  const flagIndex = argv.indexOf("--port")
  const rawPort = flagIndex >= 0 ? argv[flagIndex + 1] : process.env.PORT
  const parsed = Number.parseInt(rawPort ?? `${DEFAULT_PORT}`, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

export function startServer(port: number) {
  return Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)

      try {
        const selection = parseBoardSelection(url)

        if (request.method === "GET" && url.pathname === "/" && request.headers.get("Turbo-Frame") === boardDetailFrameId()) {
          return htmlResponse(renderBoardDetailPanel(selection))
        }

        if (request.method === "GET" && url.pathname === "/") {
          return htmlResponse(renderBoard(loadBoardModel(), selection))
        }

        const planMatch = url.pathname.match(/^\/projects\/([^/]+)\/plans\/([^/]+)$/)
        if (request.method === "GET" && planMatch) {
          const [, rawProjectId, rawPlanId] = planMatch
          const projectId = decodePathSegment(rawProjectId, "Project id")
          const planId = decodePathSegment(rawPlanId, "Plan id")

          if (request.headers.get("Turbo-Frame") !== frameId(planId)) {
            return Response.redirect(projectHref(projectId), 302)
          }

          return htmlResponse(renderPlanFrameResponse(projectId, planId))
        }

        const streamMatch = url.pathname.match(/^\/streams\/projects\/([^/]+)$/)
        if (request.method === "GET" && streamMatch) {
          const projectId = decodePathSegment(streamMatch[1], "Project id")
          return renderProjectStreamResponse(projectId, request)
        }

        if (request.method === "GET" && url.pathname === "/streams/board") {
          return renderBoardStreamResponse(request)
        }

        const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/)
        if (request.method === "GET" && projectMatch) {
          const projectId = decodePathSegment(projectMatch[1], "Project id")
          return htmlResponse(renderDetail(loadProjectDetails(projectId), parseProjectDetailSelection(url)))
        }

        if (request.method !== "GET") {
          return textResponse("Method not allowed", 405)
        }

        return renderErrorPage("Not found", "The requested page could not be found.", 404)
      } catch (error) {
        if (error instanceof Response) return error
        console.error("UI server error:", error)
        return renderErrorPage("Internal server error", "Something went wrong while rendering the dashboard.", 500)
      }
    },
  })
}

if (import.meta.main) {
  const port = resolvePort()
  startServer(port)
  console.log(`Agentbook UI server listening on http://localhost:${port}`)
}

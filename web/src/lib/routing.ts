import type { SelectionState } from "./types"

const selectionKeys = ["project", "plan", "task"] as const

export function readSelectionFromLocation(): SelectionState {
  if (typeof window === "undefined") return {}

  const search = new URLSearchParams(window.location.search)
  const selection: SelectionState = {}

  for (const key of selectionKeys) {
    const value = search.get(key)
    if (value) selection[`${key}Id` as keyof SelectionState] = value
  }

  return selection
}

export function writeSelectionToLocation(selection: SelectionState, replace = false) {
  if (typeof window === "undefined") return

  const url = new URL(window.location.href)
  const search = url.searchParams

  for (const key of selectionKeys) {
    const value = selection[`${key}Id` as keyof SelectionState]
    if (value) search.set(key, value)
    else search.delete(key)
  }

  const next = `${url.pathname}${search.toString() ? `?${search.toString()}` : ""}${url.hash}`
  const state = { selection }

  if (replace) history.replaceState(state, "", next)
  else history.pushState(state, "", next)
}

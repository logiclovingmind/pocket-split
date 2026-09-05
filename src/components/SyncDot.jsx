import { useSyncExternalStore } from 'react'
import { subscribeStatus, getStatus } from '../lib/sync'

const COLORS = {
  synced: 'bg-cyan',
  queued: 'bg-pink',
  offline: 'bg-fog',
}

export default function SyncDot() {
  const status = useSyncExternalStore(subscribeStatus, getStatus)
  return (
    <span className="flex items-center gap-1.5" title={status}>
      <span className={`h-2 w-2 rounded-full ${COLORS[status]}`} />
    </span>
  )
}

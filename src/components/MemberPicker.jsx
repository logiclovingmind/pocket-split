import { setMe } from '../lib/room'

export default function MemberPicker({ group, onPicked, onBack }) {
  const pick = (memberId) => {
    setMe(group.id, memberId)
    onPicked()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-8">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold">Who are you?</h1>
        <p className="mt-1 text-sm text-fog">in {group.name}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {group.members.map((m) => (
          <button
            key={m.id}
            onClick={() => pick(m.id)}
            className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-4 text-left text-lg font-semibold transition-colors active:border-pink"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: m.color }}
            >
              {m.name[0]?.toUpperCase()}
            </span>
            {m.name}
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-xs text-fog">
        ← back to groups
      </button>
      <p className="text-center text-xs text-fog">Asked once per group on this device.</p>
    </div>
  )
}

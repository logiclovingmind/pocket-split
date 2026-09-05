import { useState } from 'react'
import { createRoom, joinRoom } from '../lib/room'

export default function RoomGate() {
  const [link, setLink] = useState('')
  const [error, setError] = useState(false)

  function handleJoin(e) {
    e.preventDefault()
    if (!joinRoom(link)) setError(true)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8 text-center">
      <h1 className="font-heading text-3xl font-bold">
        Pocket{' '}
        <span className="bg-linear-to-r from-pink via-violet to-cyan bg-clip-text text-transparent">
          Split
        </span>
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-mist">
        Your groups live at a secret link. Paste the link you were sent to
        join, or start a fresh space and share its URL with the others.
      </p>
      <form onSubmit={handleJoin} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setError(false)
          }}
          placeholder="Paste room link here"
          className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white placeholder:text-fog focus:border-violet focus:outline-none"
        />
        {error && (
          <p className="text-xs text-pink">
            That doesn&apos;t look like a room link — paste the full URL.
          </p>
        )}
        {link.trim() && (
          <button
            type="submit"
            className="rounded-full bg-linear-to-r from-pink via-violet to-cyan px-8 py-3 font-semibold text-white active:scale-95"
          >
            Join room
          </button>
        )}
      </form>
      {!link.trim() && (
        <button
          onClick={createRoom}
          className="rounded-full border border-white/15 px-8 py-3 font-semibold text-mist active:scale-95"
        >
          Start a new space
        </button>
      )}
      <p className="text-xs text-fog">
        Anyone with the link can see and edit — share it only with your group.
      </p>
    </div>
  )
}

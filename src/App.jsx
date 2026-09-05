import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { getRoom, getMe } from './lib/room'
import { initSync } from './lib/sync'
import RoomGate from './components/RoomGate'
import GroupsScreen from './components/GroupsScreen'
import MemberPicker from './components/MemberPicker'
import GroupView from './components/GroupView'

const GROUP_KEY = 'ps_group'

export default function App() {
  const room = getRoom()
  const [groupId, setGroupId] = useState(() => localStorage.getItem(GROUP_KEY))
  const [meVersion, setMeVersion] = useState(0) // bump to re-read getMe

  useEffect(() => {
    if (room) return initSync(room)
  }, [room])

  const groups = useLiveQuery(
    () => (room ? db.groups.where('room').equals(room).toArray() : []),
    [room]
  )

  const openGroup = (id) => {
    localStorage.setItem(GROUP_KEY, id)
    setGroupId(id)
  }
  const leaveGroup = () => {
    localStorage.removeItem(GROUP_KEY)
    setGroupId(null)
  }

  if (!room) return <RoomGate />
  if (!groups) return null

  const live = groups.filter((g) => !g.deleted)
  const group = live.find((g) => g.id === groupId)

  if (!group) return <GroupsScreen room={room} groups={live} onOpen={openGroup} />

  const me = getMe(group.id)
  if (!me || !group.members.some((m) => m.id === me)) {
    return (
      <MemberPicker
        group={group}
        onPicked={() => setMeVersion((v) => v + 1)}
        onBack={leaveGroup}
      />
    )
  }

  return <GroupView key={meVersion} group={group} me={me} onLeave={leaveGroup} />
}

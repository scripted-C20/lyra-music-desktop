type MusicInfoLike = LX.Music.MusicInfo | LX.Download.ListItem

export const getToggleMusicIdentity = (musicInfo?: LX.Music.MusicInfoOnline | null) => {
  return musicInfo ? `${musicInfo.source}_${musicInfo.id}` : ''
}

export const getMusicIdentity = (musicInfo: MusicInfoLike) => {
  if ('progress' in musicInfo) {
    const targetMusicInfo = musicInfo.metadata.musicInfo
    return `download_${musicInfo.id}_${targetMusicInfo.source}_${targetMusicInfo.id}`
  }

  if (musicInfo.source == 'local') return `local_${musicInfo.id}`

  return `${musicInfo.source}_${musicInfo.id}`
}

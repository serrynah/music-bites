"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, Upload, Trash2, Plus, Music, Clock, PlusCircle, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSupabase } from "../lib/supabase"

interface MusicSnippet {
  id: string
  song_name: string
  audio_type: "file" | "spotify" | "soundcloud"
  audio_url: string | null
  spotify_url: string
  soundcloud_url: string
  start_time: string
  notes: string
  position: number
}

// Separate component for Spotify embed with ref-based approach
function SpotifyEmbed({ trackId, startTime }: { trackId: string; startTime: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.split(":")
      if (parts.length === 2) {
        const minutes = Number.parseInt(parts[0]) || 0
        const seconds = Number.parseInt(parts[1]) || 0
        return minutes * 60 + seconds
      }
      return 0
    }

    const startTimeSeconds = timeToSeconds(startTime)
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0${startTimeSeconds > 0 ? `&t=${startTimeSeconds}` : ""}`

    // Clear existing content
    containerRef.current.innerHTML = ""

    // Create iframe
    const iframe = document.createElement("iframe")
    iframe.src = embedUrl
    iframe.width = "100%"
    iframe.height = "232"
    iframe.frameBorder = "0"
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    iframe.loading = "eager"
    iframe.className = "rounded-md"

    containerRef.current.appendChild(iframe)
  }, [trackId, startTime])

  return <div ref={containerRef} className="w-full" />
}

// Separate component for SoundCloud embed with ref-based approach
function SoundCloudEmbed({ url, startTime }: { url: string; startTime: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.split(":")
      if (parts.length === 2) {
        const minutes = Number.parseInt(parts[0]) || 0
        const seconds = Number.parseInt(parts[1]) || 0
        return minutes * 60 + seconds
      }
      return 0
    }

    const startTimeSeconds = timeToSeconds(startTime)
    const normalizedUrl = url.trim()
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true${startTimeSeconds > 0 ? `#t=${startTimeSeconds}` : ""}`

    // Clear existing content
    containerRef.current.innerHTML = ""

    // Create iframe
    const iframe = document.createElement("iframe")
    iframe.src = embedUrl
    iframe.width = "100%"
    iframe.height = "166"
    iframe.scrolling = "no"
    iframe.frameBorder = "no"
    iframe.allow = "autoplay"
    iframe.className = "rounded-md"
    iframe.title = "SoundCloud player"

    containerRef.current.appendChild(iframe)
  }, [url, startTime])

  return <div ref={containerRef} className="w-full" />
}

export function MusicInspirationRepo() {
  const [snippets, setSnippets] = useState<MusicSnippet[]>([])
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [useLocalStorage, setUseLocalStorage] = useState(false)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement }>({})
  const supabase = getSupabase()

  // Load snippets on mount
  useEffect(() => {
    if (supabase) {
      loadSnippetsFromDatabase()
    } else {
      loadSnippetsFromLocalStorage()
      setUseLocalStorage(true)
    }
  }, [])

  // Save to localStorage when using fallback mode
  useEffect(() => {
    if (useLocalStorage && snippets.length > 0) {
      localStorage.setItem("musicSnippets", JSON.stringify(snippets))
    }
  }, [snippets, useLocalStorage])

  const loadSnippetsFromLocalStorage = () => {
    try {
      setLoading(true)
      const saved = localStorage.getItem("musicSnippets")
      if (saved) {
        const parsed = JSON.parse(saved)
        setSnippets(parsed)
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSnippetsFromDatabase = async () => {
    if (!supabase) return

    try {
      setLoading(true)
      const { data, error } = await supabase.from("music_snippets").select("*").order("position", { ascending: true })

      if (error) throw error

      setSnippets(data || [])
    } catch (error) {
      console.error("Error loading snippets:", error)
      // Fallback to localStorage on error
      loadSnippetsFromLocalStorage()
      setUseLocalStorage(true)
    } finally {
      setLoading(false)
    }
  }

  const saveSnippet = async (snippet: MusicSnippet) => {
    if (!supabase) {
      // Save to localStorage when Supabase is not available
      const updatedSnippets = snippets.map((s) => (s.id === snippet.id ? snippet : s))
      localStorage.setItem("musicSnippets", JSON.stringify(updatedSnippets))
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase.from("music_snippets").upsert({
        id: snippet.id,
        song_name: snippet.song_name,
        audio_type: snippet.audio_type,
        audio_url: snippet.audio_url,
        spotify_url: snippet.spotify_url,
        soundcloud_url: snippet.soundcloud_url,
        start_time: snippet.start_time,
        notes: snippet.notes,
        position: snippet.position,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
    } catch (error) {
      console.error("Error saving snippet:", error)
      // Fallback to localStorage on error
      const updatedSnippets = snippets.map((s) => (s.id === snippet.id ? snippet : s))
      localStorage.setItem("musicSnippets", JSON.stringify(updatedSnippets))
      setUseLocalStorage(true)
    } finally {
      setSaving(false)
    }
  }

  const addNewSnippet = async () => {
    const newSnippet: MusicSnippet = {
      id: Date.now().toString(),
      song_name: "",
      audio_type: "file",
      audio_url: null,
      spotify_url: "",
      soundcloud_url: "",
      start_time: "0:00",
      notes: "",
      position: snippets.length,
    }

    setSnippets([...snippets, newSnippet])
    await saveSnippet(newSnippet)
  }

  const deleteSnippet = async (id: string) => {
    if (supabase) {
      try {
        const { error } = await supabase.from("music_snippets").delete().eq("id", id)
        if (error) throw error
      } catch (error) {
        console.error("Error deleting snippet:", error)
        setUseLocalStorage(true)
      }
    }

    const updatedSnippets = snippets.filter((snippet) => snippet.id !== id)
    setSnippets(updatedSnippets)

    // Save to localStorage
    if (!supabase || useLocalStorage) {
      localStorage.setItem("musicSnippets", JSON.stringify(updatedSnippets))
    }

    if (audioRefs.current[id]) {
      audioRefs.current[id].pause()
      delete audioRefs.current[id]
    }
    if (currentlyPlaying === id) {
      setCurrentlyPlaying(null)
    }
  }

  const updateSnippet = async (
    id: string,
    field: keyof MusicSnippet,
    value: string | "file" | "spotify" | "soundcloud",
  ) => {
    const updatedSnippets = snippets.map((snippet) => (snippet.id === id ? { ...snippet, [field]: value } : snippet))
    setSnippets(updatedSnippets)

    const snippet = updatedSnippets.find((s) => s.id === id)
    if (snippet) {
      await saveSnippet(snippet)
    }
  }

  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":")
    if (parts.length === 2) {
      const minutes = Number.parseInt(parts[0]) || 0
      const seconds = Number.parseInt(parts[1]) || 0
      return minutes * 60 + seconds
    }
    return 0
  }

  const secondsToTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const validateTimeFormat = (timeStr: string): boolean => {
    const regex = /^\d{1,2}:\d{2}$/
    return regex.test(timeStr)
  }

  const getCurrentPlaybackTime = (id: string) => {
    const audio = audioRefs.current[id]
    if (audio && !isNaN(audio.currentTime)) {
      const currentTime = secondsToTime(audio.currentTime)
      updateSnippet(id, "start_time", currentTime)
    }
  }

  const cleanFileName = (fileName: string): string => {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "")
    const cleaned = nameWithoutExt.replace(/[_\-.]/g, " ")
    return cleaned.replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const fetchSpotifyTrackInfo = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
      if (response.ok) {
        const data = await response.json()
        return data.title || null
      }
    } catch (error) {
      console.error("Error fetching Spotify track info:", error)
    }
    return null
  }

  const fetchSoundCloudTrackInfo = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      if (response.ok) {
        const data = await response.json()
        return data.title || null
      }
    } catch (error) {
      console.error("Error fetching SoundCloud track info:", error)
    }
    return null
  }

  const handleFileUpload = async (id: string, file: File) => {
    const audioUrl = URL.createObjectURL(file)
    const cleanedName = cleanFileName(file.name)

    const updatedSnippets = snippets.map((snippet) =>
      snippet.id === id ? { ...snippet, audio_url: audioUrl, song_name: snippet.song_name || cleanedName } : snippet,
    )
    setSnippets(updatedSnippets)

    const snippet = updatedSnippets.find((s) => s.id === id)
    if (snippet) {
      await saveSnippet(snippet)
    }
  }

  const handleSpotifyUrlChange = async (id: string, url: string) => {
    const updatedSnippets = snippets.map((snippet) => (snippet.id === id ? { ...snippet, spotify_url: url } : snippet))
    setSnippets(updatedSnippets)

    const snippet = updatedSnippets.find((s) => s.id === id)
    if (snippet) {
      await saveSnippet(snippet)
    }

    if (url && url.includes("spotify.com/track/")) {
      const trackInfo = await fetchSpotifyTrackInfo(url)
      if (trackInfo) {
        const finalSnippets = snippets.map((s) => (s.id === id ? { ...s, song_name: s.song_name || trackInfo } : s))
        setSnippets(finalSnippets)
        const updatedSnippet = finalSnippets.find((s) => s.id === id)
        if (updatedSnippet) {
          await saveSnippet(updatedSnippet)
        }
      }
    }
  }

  const handleSoundCloudUrlChange = async (id: string, url: string) => {
    const updatedSnippets = snippets.map((snippet) =>
      snippet.id === id ? { ...snippet, soundcloud_url: url } : snippet,
    )
    setSnippets(updatedSnippets)

    const snippet = updatedSnippets.find((s) => s.id === id)
    if (snippet) {
      await saveSnippet(snippet)
    }

    if (url && url.includes("soundcloud.com/")) {
      const trackInfo = await fetchSoundCloudTrackInfo(url)
      if (trackInfo) {
        const finalSnippets = snippets.map((s) => (s.id === id ? { ...s, song_name: s.song_name || trackInfo } : s))
        setSnippets(finalSnippets)
        const updatedSnippet = finalSnippets.find((s) => s.id === id)
        if (updatedSnippet) {
          await saveSnippet(updatedSnippet)
        }
      }
    }
  }

  const togglePlayPause = (id: string) => {
    const audio = audioRefs.current[id]
    const snippet = snippets.find((s) => s.id === id)

    if (!audio || !snippet) return

    if (currentlyPlaying === id) {
      audio.pause()
      setCurrentlyPlaying(null)
    } else {
      Object.values(audioRefs.current).forEach((a) => a.pause())

      if (snippet.audio_type === "file" && snippet.start_time && snippet.start_time !== "0:00") {
        audio.currentTime = timeToSeconds(snippet.start_time)
      }

      audio.play()
      setCurrentlyPlaying(id)
    }
  }

  const handleAudioEnded = (id: string) => {
    setCurrentlyPlaying(null)
  }

  const extractSpotifyTrackId = (url: string): string | null => {
    const patterns = [
      /track\/([a-zA-Z0-9]+)/,
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const renderAudioContent = (snippet: MusicSnippet) => {
    switch (snippet.audio_type) {
      case "spotify":
        const spotifyTrackId = extractSpotifyTrackId(snippet.spotify_url)

        if (spotifyTrackId && snippet.spotify_url.trim()) {
          return <SpotifyEmbed trackId={spotifyTrackId} startTime={snippet.start_time} />
        }
        return (
          <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md">
            {snippet.spotify_url ? "Invalid Spotify URL format" : "Paste Spotify URL above to see preview"}
          </div>
        )

      case "soundcloud":
        if (
          snippet.soundcloud_url &&
          snippet.soundcloud_url.trim() &&
          snippet.soundcloud_url.includes("soundcloud.com")
        ) {
          return <SoundCloudEmbed url={snippet.soundcloud_url} startTime={snippet.start_time} />
        }
        return (
          <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-md">
            {snippet.soundcloud_url && !snippet.soundcloud_url.includes("soundcloud.com")
              ? "Invalid SoundCloud URL - please use a link from soundcloud.com"
              : "Paste SoundCloud URL above to see preview"}
          </div>
        )

      case "file":
      default:
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={(el) => {
                  if (el) fileInputRefs.current[snippet.id] = el
                }}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(snippet.id, file)
                }}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRefs.current[snippet.id]?.click()}
                className="flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                Upload
              </Button>
              {snippet.audio_url && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePlayPause(snippet.id)}
                    className="flex items-center gap-1"
                  >
                    {currentlyPlaying === snippet.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </Button>
                  {currentlyPlaying === snippet.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getCurrentPlaybackTime(snippet.id)}
                      className="flex items-center gap-1"
                      title="Capture current playback time"
                    >
                      <Clock className="w-3 h-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
            {snippet.audio_url && (
              <audio
                ref={(el) => {
                  if (el) audioRefs.current[snippet.id] = el
                }}
                src={snippet.audio_url}
                onEnded={() => handleAudioEnded(snippet.id)}
                className="hidden"
              />
            )}
          </div>
        )
    }
  }

  const renderAddRow = () => (
    <TableRow className="hover:bg-muted/30 border-dashed">
      <TableCell colSpan={5} className="text-center py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addNewSnippet()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-full justify-center"
        >
          <PlusCircle className="w-4 h-4" />
          Add snippet here
        </Button>
      </TableCell>
    </TableRow>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Music Inspiration Repository</CardTitle>
              <p className="text-muted-foreground mt-2">
                Store song snippets from Spotify, SoundCloud, or upload files with production notes
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Button onClick={addNewSnippet} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Snippet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {useLocalStorage && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Using Local Storage</AlertTitle>
              <AlertDescription>
                Supabase is not configured. Your snippets are saved locally in your browser. To enable cloud storage,
                add the Supabase integration.
              </AlertDescription>
            </Alert>
          )}

          {snippets.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No snippets yet. Add your first one to get started!</p>
              <Button onClick={addNewSnippet} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Snippet
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[350px]">Audio Snippet</TableHead>
                    <TableHead className="w-[200px]">Song</TableHead>
                    <TableHead className="w-[100px]">Start Time</TableHead>
                    <TableHead className="min-w-[300px]">Production Notes</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snippets.map((snippet) => (
                    <TableRow key={snippet.id}>
                      <TableCell>
                        <div className="space-y-3">
                          <Tabs
                            value={snippet.audio_type}
                            onValueChange={(value) =>
                              updateSnippet(snippet.id, "audio_type", value as "file" | "spotify" | "soundcloud")
                            }
                          >
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="file" className="text-xs">
                                Upload
                              </TabsTrigger>
                              <TabsTrigger value="spotify" className="text-xs">
                                Spotify
                              </TabsTrigger>
                              <TabsTrigger value="soundcloud" className="text-xs">
                                SoundCloud
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="file" className="mt-2">
                              {renderAudioContent(snippet)}
                            </TabsContent>
                            <TabsContent value="spotify" className="mt-2 space-y-2">
                              <Input
                                placeholder="Paste Spotify track URL..."
                                value={snippet.spotify_url}
                                onChange={(e) => handleSpotifyUrlChange(snippet.id, e.target.value)}
                                className="text-sm"
                              />
                              {renderAudioContent(snippet)}
                            </TabsContent>
                            <TabsContent value="soundcloud" className="mt-2 space-y-2">
                              <Input
                                placeholder="Paste SoundCloud track URL..."
                                value={snippet.soundcloud_url}
                                onChange={(e) => handleSoundCloudUrlChange(snippet.id, e.target.value)}
                                className="text-sm"
                              />
                              {renderAudioContent(snippet)}
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Song name..."
                          value={snippet.song_name}
                          onChange={(e) => updateSnippet(snippet.id, "song_name", e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="0:00"
                          value={snippet.start_time}
                          onChange={(e) => {
                            const value = e.target.value
                            updateSnippet(snippet.id, "start_time", value)
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            if (!validateTimeFormat(value) && value !== "") {
                              updateSnippet(snippet.id, "start_time", "0:00")
                            }
                          }}
                          className="w-full text-sm"
                          title="Format: M:SS or MM:SS (e.g., 1:30 or 12:45)"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="What do you like about this song? Production techniques, chord progressions, rhythm patterns..."
                          value={snippet.notes}
                          onChange={(e) => updateSnippet(snippet.id, "notes", e.target.value)}
                          className="min-h-[120px] resize-none"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSnippet(snippet.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete this snippet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {renderAddRow()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

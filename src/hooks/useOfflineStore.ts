import { useState, useEffect } from 'react'
import { openDB } from 'idb'
import { supabase } from '../lib/supabase'

interface ScanRecord {
  id: string
  qrCode: string
  eventId: string
  ambassadorId: string
  deviceInfo: string
  scanLocation: string
  timestamp: number
  synced: boolean
}



const useOfflineStore = () => {
  const [db, setDb] = useState<any>(null)

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB('scanner-db', 1, {
          upgrade(db) {
            // Create scans store
            if (!db.objectStoreNames.contains('scans')) {
              const scanStore = db.createObjectStore('scans', { keyPath: 'id' })
              scanStore.createIndex('synced', 'synced')
              scanStore.createIndex('timestamp', 'timestamp')
            }
            
            // Create events store for offline access
            if (!db.objectStoreNames.contains('events')) {
              const eventStore = db.createObjectStore('events', { keyPath: 'id' })
              eventStore.createIndex('date', 'date')
            }
          },
        })
        setDb(database)
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error)
      }
    }

    initDB()
  }, [])

  const addScanRecord = async (scanData: Omit<ScanRecord, 'id' | 'timestamp' | 'synced'>) => {
    if (!db) return

    const record: ScanRecord = {
      ...scanData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false
    }

    try {
      await db.add('scans', record)
      return record
    } catch (error) {
      console.error('Failed to add scan record:', error)
    }
  }

  const getUnsyncedScans = async (): Promise<ScanRecord[]> => {
    if (!db) return []
    
    try {
      const tx = db.transaction('scans', 'readonly')
      const store = tx.objectStore('scans')
      const index = store.index('synced')
      
      // Use getAll() without parameters to get all records, then filter
      const allScans = await index.getAll()
      return allScans.filter((scan: any) => scan.synced === false)
    } catch (error) {
      console.error('Failed to get unsynced scans:', error)
      return []
    }
  }

  const markScanAsSynced = async (id: string) => {
    if (!db) return
    
    try {
      const tx = db.transaction('scans', 'readwrite')
      const store = tx.objectStore('scans')
      const record = await store.get(id)
      
      if (record) {
        record.synced = true
        await store.put(record)
      }
    } catch (error) {
      console.error('Failed to mark scan as synced:', error)
    }
  }

  const syncOfflineData = async () => {
    const unsyncedScans = await getUnsyncedScans()
    
    for (const scan of unsyncedScans) {
      try {
        // Attempt to sync with Supabase
        const { error } = await supabase.from('scans').insert({
          ticket_id: scan.qrCode,
          event_id: scan.eventId,
          ambassador_id: scan.ambassadorId,
          device_info: scan.deviceInfo,
          scan_location: scan.scanLocation,
          scan_time: new Date(scan.timestamp).toISOString(),
          scan_result: 'valid' // Default to valid, adjust based on validation
        })

        if (!error) {
          await markScanAsSynced(scan.id)
        }
      } catch (error) {
        console.error('Failed to sync scan:', error)
      }
    }
  }

  const cacheEvents = async (events: any[]) => {
    if (!db) return
    
    try {
      const tx = db.transaction('events', 'readwrite')
      const store = tx.objectStore('events')
      
      for (const event of events) {
        await store.put(event)
      }
    } catch (error) {
      console.error('Failed to cache events:', error)
    }
  }

  const getCachedEvents = async () => {
    if (!db) return []
    
    try {
      const tx = db.transaction('events', 'readonly')
      const store = tx.objectStore('events')
      
      return await store.getAll()
    } catch (error) {
      console.error('Failed to get cached events:', error)
      return []
    }
  }

  return {
    addScanRecord,
    getUnsyncedScans,
    syncOfflineData,
    cacheEvents,
    getCachedEvents,
    markScanAsSynced
  }
}

export { useOfflineStore } 
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { qrCode, eventId, ambassadorId, deviceInfo, scanLocation } = req.body

    // Validate ticket by checking if it exists in pass_purchases
    const { data: ticket, error } = await supabase
      .from('pass_purchases')
      .select(`
        *,
        events (
          id,
          name,
          date
        )
      `)
      .eq('qr_code', qrCode)
      .single()

    if (error || !ticket) {
      return res.status(200).json({
        success: false,
        message: 'Invalid ticket',
        result: 'invalid'
      })
    }

    // Check if ticket is for the correct event
    if (ticket.event_id !== eventId) {
      return res.status(200).json({
        success: false,
        message: 'Ticket is for a different event',
        result: 'wrong_event'
      })
    }

    // Check if event date has passed
    const eventDate = new Date(ticket.events.date)
    const now = new Date()
    if (eventDate < now) {
      return res.status(200).json({
        success: false,
        message: 'Event date has passed',
        result: 'expired'
      })
    }

    // Check if ticket was already scanned
    const { data: existingScan } = await supabase
      .from('scans')
      .select('*')
      .eq('ticket_id', qrCode)
      .single()

    if (existingScan) {
      return res.status(200).json({
        success: false,
        message: 'Ticket already scanned',
        result: 'already_scanned'
      })
    }

    // Record the scan
    const { error: scanError } = await supabase
      .from('scans')
      .insert({
        ticket_id: qrCode,
        event_id: eventId,
        ambassador_id: ambassadorId,
        device_info: deviceInfo,
        scan_location: scanLocation,
        scan_time: new Date().toISOString(),
        scan_result: 'valid'
      })

    if (scanError) {
      console.error('Error recording scan:', scanError)
    }

    return res.status(200).json({
      success: true,
      message: 'Valid ticket',
      ticket: {
        customer_name: ticket.customer_name,
        event_name: ticket.events.name,
        ticket_type: ticket.ticket_type
      }
    })

  } catch (error) {
    console.error('Validation error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    })
  }
} 
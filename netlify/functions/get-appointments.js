import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const handler = async (event) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    }

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        }
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        }
    }

    try {
        // Query appointments with joins
        const { data, error } = await supabase
            .from('appointments')
            .select(`
        id,
        client_name,
        datetime,
        notes,
        services (
          name
        ),
        staff (
          name
        )
      `)
            .order('datetime', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: error.message })
            }
        }

        // Format the response
        const formattedData = data.map(appointment => ({
            id: appointment.id,
            client_name: appointment.client_name,
            service_name: appointment.services?.name || 'N/A',
            barber_name: appointment.staff?.name || 'N/A',
            datetime: appointment.datetime,
            notes: appointment.notes
        }))

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(formattedData)
        }
    } catch (error) {
        console.error('Error:', error)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        }
    }
}

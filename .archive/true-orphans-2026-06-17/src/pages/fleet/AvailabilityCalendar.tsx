import React from 'react'
import { VehicleAvailabilityCalendar } from '@/components/fleet/VehicleAvailabilityCalendar'
import { ResponsiveContainer } from '@/components/ui/responsive-container'

export default function AvailabilityCalendar() {
  return (
    <ResponsiveContainer>
      <VehicleAvailabilityCalendar />
    </ResponsiveContainer>
  )
}

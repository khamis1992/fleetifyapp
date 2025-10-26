import React from 'react'
import { VehicleReservationSystem } from '@/components/fleet/VehicleReservationSystem'
import { ResponsiveContainer } from '@/components/ui/responsive-container'

export default function Reservations() {
  return (
    <ResponsiveContainer>
      <VehicleReservationSystem />
    </ResponsiveContainer>
  )
}

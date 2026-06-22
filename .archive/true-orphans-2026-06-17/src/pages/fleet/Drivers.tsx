import React from 'react'
import { DriverAssignmentModule } from '@/components/fleet/DriverAssignmentModule'
import { ResponsiveContainer } from '@/components/ui/responsive-container'
import { PageHelp } from "@/components/help";
import { DriversPageHelpContent } from "@/components/help/content";

export default function Drivers() {
  return (
    <ResponsiveContainer>
      <DriverAssignmentModule />
    </ResponsiveContainer>
  )
}

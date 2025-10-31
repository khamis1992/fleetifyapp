/**
 * Vehicle Reservation System Page
 * 
 * Integrated comprehensive fleet management system featuring:
 * - Vehicle Reservation System (online bookings with hold timers)
 * - Vehicle Availability Calendar (visual date-based availability)
 * - Driver Assignment Module (chauffeur-driven rentals with commission tracking)
 * 
 * Route: /fleet/reservation-system
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Calendar, Users } from 'lucide-react';
import { VehicleReservationSystem } from '@/components/fleet/VehicleReservationSystem';
import { VehicleAvailabilityCalendar } from '@/components/fleet/VehicleAvailabilityCalendar';
import { DriverAssignmentModule } from '@/components/fleet/DriverAssignmentModule';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
export default function ReservationSystem() {
  const [activeTab, setActiveTab] = useState('reservations');

  return (
    <ResponsiveContainer className="space-y-6">
      {/* Three-Tab Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-full grid-cols-3">
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">الحجوزات</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">التوفرية</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">السائقين</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Vehicle Reservation System */}
        <TabsContent value="reservations" className="space-y-6">
          <VehicleReservationSystem />
        </TabsContent>

        {/* Tab 2: Vehicle Availability Calendar */}
        <TabsContent value="availability" className="space-y-6">
          <VehicleAvailabilityCalendar />
        </TabsContent>

        {/* Tab 3: Driver Assignment Module */}
        <TabsContent value="drivers" className="space-y-6">
          <DriverAssignmentModule />
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  );
}

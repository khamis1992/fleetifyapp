import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, BarChart3, Car, Settings, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import FleetDashboard from "./FleetDashboard"

export default function Fleet() {
  const navigate = useNavigate()
  
  // For now, directly render the FleetDashboard
  return <FleetDashboard />
}